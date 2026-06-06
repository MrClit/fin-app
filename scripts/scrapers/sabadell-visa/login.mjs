#!/usr/bin/env node
// Sabadell VISA login — registro de dispositivo / regeneración de sesión.
//
// Uso:
//   pnpm scrape:sabadell-visa:login
//
// Requiere en .env.local: SABADELL_USER (DNI), SABADELL_PASS (PIN de 8 dígitos).
//
// Lanza el Chrome real del sistema (HEADED — Sabadell bloquea headless vía WAF)
// con un perfil persistente y señales de automatización ocultas. Auto-rellena
// DNI+PIN y envía. Después detecta si el banco PIDE OTP o entra directo (device
// recordado). El usuario completa el OTP a mano si aparece. La sesión y el
// "dispositivo de confianza" quedan en el perfil persistente. Cierra la ventana
// para guardar.

import { chromium } from 'playwright'
import { existsSync, readFileSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'

import {
  USER_DATA_DIR,
  LOCAL_STORAGE_PATH,
  SABADELL_LOGIN_URL,
  CHROME_CHANNEL,
  CHROME_ARGS,
  STEALTH_INIT_SCRIPT,
  LOGIN_SELECTORS,
  isStorageStateValid,
} from './config.mjs'

const SNAPSHOT_INTERVAL_MS = 4000

function dumpStamp() {
  const d = new Date()
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}

function activePage(context) {
  const pages = context.pages()
  return pages[pages.length - 1]
}

async function tryAutofill(page) {
  const user = process.env.SABADELL_USER
  const pass = process.env.SABADELL_PASS
  if (!user || !pass) {
    console.log('[sabadell-login] sin SABADELL_USER/SABADELL_PASS: completa el login a mano.')
    return
  }
  try {
    await page.locator(LOGIN_SELECTORS.user).first().waitFor({ timeout: 8000 })
    await page.locator(LOGIN_SELECTORS.user).first().fill(user)
    await page.locator(LOGIN_SELECTORS.pass).first().fill(pass)
    await page.locator(LOGIN_SELECTORS.pass).first().press('Enter')
    console.log('[sabadell-login] DNI+PIN auto-rellenados y enviados.')
  } catch (err) {
    console.log(`[sabadell-login] auto-fill best-effort falló (${err.message}). Sigue a mano.`)
    return
  }
  // Tras enviar, ¿pide OTP o entra directo? Diagnóstico para decidir el modelo
  // de cron (device recordado vs OTP por login). No bloquea el guardado.
  await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {})
  const otpVisible = await page.locator(LOGIN_SELECTORS.otp).first().isVisible().catch(() => false)
  const stillPwd = await page.locator(LOGIN_SELECTORS.pass).first().isVisible().catch(() => false)
  if (otpVisible) {
    console.log('[sabadell-login] >>> El banco PIDE OTP. Complétalo en la ventana. (cron desatendido NO viable)')
  } else if (stillPwd) {
    console.log('[sabadell-login] >>> Sigue en login (¿credenciales incorrectas o error?).')
  } else {
    console.log('[sabadell-login] >>> Entró SIN OTP (dispositivo recordado). cron headed automático viable.')
  }
}

async function main() {
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    channel: CHROME_CHANNEL,
    args: CHROME_ARGS,
    viewport: null,
  })
  await context.addInitScript(STEALTH_INIT_SCRIPT)

  const page = context.pages()[0] ?? (await context.newPage())
  console.log(`[sabadell-login] abriendo ${SABADELL_LOGIN_URL} …`)
  await page.goto(SABADELL_LOGIN_URL, { waitUntil: 'domcontentloaded' }).catch(() => {})

  await tryAutofill(page)

  console.log(
    '\n→ Si pide OTP, complétalo en la ventana de Chrome.\n' +
    '→ Cuando estés dentro de la cuenta, CIERRA la ventana para guardar la sesión.\n'
  )

  // Snapshots automáticos (investigación) + exporta sesión en cada tick.
  let lastKey = ''
  const tick = async () => {
    try {
      const pg = activePage(context)
      if (!pg) return
      const url = pg.url()
      if (url.startsWith('about:') || url === 'chrome://newtab/') return
      const html = await pg.content()
      const key = `${url}|${html.length}`
      if (key !== lastKey) {
        lastKey = key
        await writeFile(`scripts/scrapers/sabadell-visa/.dump-${dumpStamp()}.local.html`, html)
        console.log(`[sabadell-login] snapshot (${url})`)
      }
      await context.storageState({ path: LOCAL_STORAGE_PATH, indexedDB: true })
    } catch {}
  }
  const timer = setInterval(tick, SNAPSHOT_INTERVAL_MS)

  await new Promise(resolve => context.on('close', resolve))
  clearInterval(timer)

  const saved = existsSync(LOCAL_STORAGE_PATH)
    ? JSON.parse(readFileSync(LOCAL_STORAGE_PATH, 'utf-8'))
    : null
  if (!isStorageStateValid(saved)) {
    console.error('[sabadell-login] aviso: el state guardado no tiene cookies de Sabadell. ¿Login incompleto?')
    process.exit(2)
  }
  console.log(`[sabadell-login] [ok] sesión guardada: perfil=${USER_DATA_DIR}`)
  process.exit(0)
}

main().catch(err => {
  console.error('[sabadell-login] error:', err)
  process.exit(1)
})
