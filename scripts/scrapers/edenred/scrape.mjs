#!/usr/bin/env node
// Edenred scraper — Playwright headless.
//
// Uso:
//   pnpm scrape:edenred         (respeta el marker diario si EDENRED_CRON=1)
//   pnpm scrape:edenred:force   (EDENRED_SKIP_MARKER=1: ignora el marker)
//
// Se ejecuta en local (launchd en el Mac). Edenred bindea la sesión por IP
// residencial, así que correr esto desde GitHub Actions invalida el state.
//
// Exit codes:
//   0 — éxito (webhook 200)
//   1 — falta storage-state (regenerar con pnpm scrape:edenred:login)
//   2 — sesión Edenred caducada o pide 2FA (regenerar localmente)
//   3 — error de webhook (status != 200 o red)
//   4 — error de scraping (no se encontraron selectores en el DOM)

import { chromium } from 'playwright'
import { existsSync, readdirSync, unlinkSync, closeSync, openSync, writeFileSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'

import { LOCAL_STORAGE_PATH, EDENRED_ACCOUNT_URL, EDENRED_LOGIN_URL } from './config.mjs'
import {
  tryAutofill,
  saveStorageStateWithBackup,
  twoFaPendingExists,
  setTwoFaPending,
  markLastRelogin,
} from './auth.mjs'
import { parseAmount, parseDate } from './parsers.mjs'

// Cuando se invoca desde launchd (EDENRED_CRON=1) se usa un marker diario
// para tolerar que el Mac estuviera dormido: el plist define varios slots a
// lo largo del día y el primero que pille la máquina despierta ejecuta; los
// siguientes salen no-op porque encuentran el marker. EDENRED_SKIP_MARKER=1
// (vía pnpm scrape:edenred:force) salta ese guard para forzar un re-disparo
// aunque ya haya marker del día, sin tocar ficheros ni desexportar EDENRED_CRON.
const CRON_MODE = process.env.EDENRED_CRON === '1'
const CRON_LOG_DIR = join(homedir(), 'Library/Logs/fin-app')
const CRON_MARKER_PREFIX = 'edenred-last-success.'
// Marker para throttlear la notificación de sesión caducada a 1/día: el plist
// dispara 6 slots, pero sólo queremos un aviso. Se borra al primer éxito (ver
// writeCronMarker) para "re-armar" el aviso ante un fallo posterior del día.
const NOTIFY_MARKER_PREFIX = 'edenred-notified.'
// Prefijo de los volcados de diagnóstico (screenshot + HTML) que se generan al
// fallar. Compartido implícitamente con status.mjs (mismo literal allí).
const FAILURE_PREFIX = 'edenred-failure-'
const FAILURE_KEEP = 5
function cronMarkerPath() {
  const today = new Date().toISOString().slice(0, 10)
  return join(CRON_LOG_DIR, `${CRON_MARKER_PREFIX}${today}`)
}
function cronMarkerExists() {
  return existsSync(cronMarkerPath())
}
function notifyMarkerPath() {
  const today = new Date().toISOString().slice(0, 10)
  return join(CRON_LOG_DIR, `${NOTIFY_MARKER_PREFIX}${today}`)
}
function writeCronMarker() {
  closeSync(openSync(cronMarkerPath(), 'a'))
  for (const name of readdirSync(CRON_LOG_DIR)) {
    // Limpia markers de éxito antiguos y cualquier marker de notificación:
    // tras un éxito el sistema vuelve a estar "armado" para volver a avisar.
    const isStaleSuccess =
      name.startsWith(CRON_MARKER_PREFIX) && join(CRON_LOG_DIR, name) !== cronMarkerPath()
    const isNotify = name.startsWith(NOTIFY_MARKER_PREFIX)
    if (isStaleSuccess || isNotify) {
      try { unlinkSync(join(CRON_LOG_DIR, name)) } catch {}
    }
  }
}

// Push accionable "Edenred requiere 2FA" (issue #204). A diferencia de la
// notificación macOS (local al Mac), este push llega al móvil aunque estés fuera.
// El servidor firma el push con VAPID; aquí sólo hacemos POST al webhook (mismo
// secreto que /api/edenred). Best-effort: nunca debe romper el exit del script.
// La dedup ("un aviso por episodio") la hace enterTwoFaPending vía el marker.
async function notify2faPending() {
  try {
    const appUrl = process.env.APP_URL?.replace(/\/$/, '')
    const secret = process.env.EDENRED_WEBHOOK_SECRET
    if (!appUrl || !secret) {
      console.error('[edenred-scrape] falta APP_URL/EDENRED_WEBHOOK_SECRET — sin push de 2FA.')
      return
    }
    const res = await fetch(`${appUrl}/api/edenred/notify-2fa`, {
      method: 'POST',
      headers: { authorization: `Bearer ${secret}` },
    })
    if (!res.ok) {
      console.error(`[edenred-scrape] push de 2FA respondió ${res.status}`)
    } else {
      console.log('[edenred-scrape] push de 2FA enviado.')
    }
  } catch (err) {
    console.error(`[edenred-scrape] push de 2FA falló (${err.message}).`)
  }
}

// Entra al estado "2FA pendiente": marca el guard anti-spam (siempre, para no
// reenviar credenciales en los próximos slots) y, sólo en la transición y bajo
// cron, dispara el push una única vez por episodio. El marker lo limpia un login
// manual exitoso (login.mjs), re-armando el aviso para el siguiente episodio.
async function enterTwoFaPending() {
  const firstTime = !twoFaPendingExists()
  setTwoFaPending()
  if (firstTime && CRON_MODE) await notify2faPending()
}

// Notificación nativa de macOS cuando la sesión Edenred caduca (exit 2). Sólo
// se dispara desde el cron (CRON_MODE): en ejecuciones manuales el error ya se
// ve por pantalla. Throttle de 1/día vía marker. Nunca debe romper el exit del
// script, por eso todo va envuelto en try/catch.
function notifySessionExpired() {
  try {
    if (existsSync(notifyMarkerPath())) return
    const title = 'Edenred: sesión caducada'
    const message = 'Ejecuta pnpm scrape:edenred:login para regenerarla.'
    // JSON.stringify produce literales de cadena válidos para AppleScript
    // (comillas dobles + escape). execFileSync no usa shell → sin inyección.
    execFileSync('osascript', [
      '-e',
      `display notification ${JSON.stringify(message)} with title ${JSON.stringify(title)}`,
    ])
    closeSync(openSync(notifyMarkerPath(), 'a'))
  } catch {}
}

// Selectores capturados sobre empleados.edenred.es con el design system
// "ore-*". Si Edenred refactoriza el front, revisar con:
//   pnpm exec playwright codegen --load-storage=scripts/scrapers/edenred/storage-state.json https://empleados.edenred.es
const SELECTORS = {
  // El form de login sólo aparece si la sesión no es válida.
  loginIndicators: ['input[type="password"]'],
  twoFactorIndicators: ['input[name="otp"]', 'text=/c[oó]digo de verificaci[oó]n/i'],
  // Saldo: span con clase de heading que contiene el símbolo €.
  balance: 'span.ore-heading-title-sm:has-text("€")',
  // Filas de transacciones (scopeadas a tbody para excluir la cabecera,
  // que también tiene tr.ore-table-row). Columnas (por posición):
  //   td[0]=fecha "DD/MM/YYYY", td[1]=hora "HH:MM:SS",
  //   td[2]=descripción, td[3]=importe "X,YY €"
  transactionRow: 'tbody tr.ore-table-row',
}

// Timestamp local "YYYY-MM-DD_HHmm" para nombrar los volcados de fallo.
function failureStamp() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`
}

// Conserva sólo los FAILURE_KEEP volcados más recientes por extensión; borra el
// resto. El stamp ordena cronológicamente, así que basta ordenar por nombre.
function rotateFailureDumps() {
  for (const ext of ['.png', '.html']) {
    const files = readdirSync(CRON_LOG_DIR)
      .filter((n) => n.startsWith(FAILURE_PREFIX) && n.endsWith(ext))
      .sort()
    for (const name of files.slice(0, -FAILURE_KEEP)) {
      try { unlinkSync(join(CRON_LOG_DIR, name)) } catch {}
    }
  }
}

// Vuelca screenshot + HTML de la página a CRON_LOG_DIR para diagnosticar fallos
// (sesión caducada, selector cambiado) sin reproducir con playwright codegen.
// Todo va en try/catch silencioso: si el dump falla (página cerrada, etc.) el
// die() posterior debe salir igualmente con su exit code original.
async function dumpFailure(page) {
  try {
    mkdirSync(CRON_LOG_DIR, { recursive: true })
    const stamp = failureStamp()
    const pngPath = join(CRON_LOG_DIR, `${FAILURE_PREFIX}${stamp}.png`)
    const htmlPath = join(CRON_LOG_DIR, `${FAILURE_PREFIX}${stamp}.html`)
    await page.screenshot({ fullPage: true, path: pngPath })
    writeFileSync(htmlPath, await page.content())
    console.error(`[edenred-scrape] dump: ${pngPath}`)
    console.error(`[edenred-scrape] dump: ${htmlPath}`)
    rotateFailureDumps()
  } catch {}
}

function die(code, msg) {
  console.error(`[edenred-scrape] ${msg}`)
  if (code === 2 && CRON_MODE) notifySessionExpired()
  process.exit(code)
}

function requireEnv(name) {
  const v = process.env[name]
  if (!v) die(1, `Falta env var: ${name}`)
  return v
}

function resolveStorageStatePath() {
  if (existsSync(LOCAL_STORAGE_PATH)) return LOCAL_STORAGE_PATH
  die(1, `No hay storage-state. Ejecuta: pnpm scrape:edenred:login`)
}

async function isSessionInvalid(page) {
  for (const sel of SELECTORS.loginIndicators) {
    if (await page.locator(sel).first().isVisible().catch(() => false)) return 'login'
  }
  for (const sel of SELECTORS.twoFactorIndicators) {
    if (await page.locator(sel).first().isVisible().catch(() => false)) return '2fa'
  }
  return null
}

// Auto-relogin desatendido para el caso mayoritario (sesión caducada sin 2FA).
// Reenvía EDENRED_USER/EDENRED_PASS en el mismo navegador headless y re-evalúa
// la sesión. Devuelve true si quedó dentro (state ya guardado) y el scrape puede
// continuar; false si hay que abortar (el caller decide el exit).
//
// Guard anti-spam: si hay un marker de "2FA pendiente" no reintenta (no reenvía
// credenciales → no dispara un email de código nuevo en cada slot del cron).
async function tryAutoRelogin(context, page) {
  if (twoFaPendingExists()) {
    console.error('[edenred-scrape] 2FA pendiente: no se reintenta auto-login. Ejecuta: pnpm scrape:edenred:login')
    return false
  }

  const user = process.env.EDENRED_USER
  const pass = process.env.EDENRED_PASS
  if (!user || !pass) {
    console.error('[edenred-scrape] faltan EDENRED_USER/EDENRED_PASS — no se puede auto-relogin.')
    return false
  }

  console.log('[edenred-scrape] sesión caducada (login): intentando auto-relogin…')
  await page.goto(EDENRED_LOGIN_URL, { waitUntil: 'domcontentloaded' })

  if (!(await tryAutofill(page, user, pass))) return false
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})

  const state = await isSessionInvalid(page)
  if (state === null) {
    await saveStorageStateWithBackup(context)
    markLastRelogin()
    console.log('[edenred-scrape] auto-relogin OK, continúo el scrape.')
    return true
  }
  if (state === '2fa') {
    await enterTwoFaPending()
    console.error('[edenred-scrape] auto-relogin desembocó en 2FA — marcado pendiente.')
    return false
  }
  console.error('[edenred-scrape] auto-relogin falló (sigue en login).')
  return false
}

async function extractBalance(page) {
  const el = page.locator(SELECTORS.balance).first()
  if (!(await el.isVisible().catch(() => false))) {
    await dumpFailure(page)
    die(4, 'Saldo no encontrado en el DOM')
  }
  const text = (await el.textContent()) ?? ''
  return parseAmount(text)
}

async function extractTransactions(page) {
  const rows = await page.locator(SELECTORS.transactionRow).all()
  if (rows.length === 0) {
    await dumpFailure(page)
    die(4, 'No se encontró ninguna fila de transacciones')
  }

  const txs = []
  for (const row of rows) {
    const cells = row.locator('td')
    const rawDate = (await cells.nth(0).textContent()) ?? ''
    const rawTime = (await cells.nth(1).textContent()) ?? ''
    const rawDesc = (await cells.nth(2).textContent()) ?? ''
    const rawAmount = (await cells.nth(3).textContent()) ?? ''

    const transaction_date = parseDate(rawDate)
    const time = rawTime.trim()
    const description = rawDesc.trim().replace(/\s+/g, ' ')

    // Edenred muestra los importes sin signo. Distinguimos por la
    // descripción literal: "RECARGA" es un ingreso (top-up del ticket
    // restaurante que carga la empresa: retribución que forma parte de la
    // nómina), todo lo demás es consumo en restaurante.
    // Las categorías deben coincidir con un `id` del seed de la tabla
    // `categories` (supabase/migrations/20260509000000_categories_type.sql):
    // 'payroll' (Nómina) para la recarga y 'restaurant' (expense) para el consumo.
    const isRecarga = description.toUpperCase() === 'RECARGA'
    const amount = isRecarga ? parseAmount(rawAmount) : -parseAmount(rawAmount)
    const category = isRecarga ? 'payroll' : 'restaurant'

    // external_id estable: fecha + hora (resolución de segundos). Si dos
    // movimientos colisionasen en el mismo segundo, el upsert los trataría
    // como uno solo — aceptable.
    const external_id = `edenred-${transaction_date}-${time}`

    txs.push({ external_id, amount, description, transaction_date, category })
  }
  return txs
}

async function postToWebhook({ balance, transactions }) {
  const appUrl = requireEnv('APP_URL').replace(/\/$/, '')
  const secret = requireEnv('EDENRED_WEBHOOK_SECRET')

  const body = JSON.stringify({
    balance,
    last_synced_at: new Date().toISOString(),
    transactions,
  })

  const res = await fetch(`${appUrl}/api/edenred`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${secret}`,
    },
    body,
  })

  if (res.status !== 200) {
    const text = await res.text().catch(() => '')
    die(3, `Webhook respondió ${res.status}: ${text}`)
  }

  return res.json()
}

async function main() {
  if (CRON_MODE && !process.env.EDENRED_SKIP_MARKER && cronMarkerExists()) {
    console.log(`[edenred-scrape] skip: ya hubo ejecución correcta hoy`)
    return
  }

  const storageStatePath = resolveStorageStatePath()

  const browser = await chromium.launch({ headless: true })
  try {
    const context = await browser.newContext({ storageState: storageStatePath })
    const page = await context.newPage()

    await page.goto(EDENRED_ACCOUNT_URL, { waitUntil: 'domcontentloaded' })
    // Pequeña espera para que la SPA hidrate antes de inspeccionar el DOM.
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})

    let didRelogin = false
    const invalid = await isSessionInvalid(page)
    if (invalid === 'login') {
      // Caso mayoritario: sesión caducada sin 2FA → intentar auto-relogin y
      // continuar en la misma ejecución si funciona.
      if (!(await tryAutoRelogin(context, page))) {
        await dumpFailure(page)
        die(2, `Auto-relogin no completado. Regenera con: pnpm scrape:edenred:login`)
      }
      didRelogin = true
      // Tras el relogin la SPA queda en su landing; recargamos la cuenta para
      // que la extracción corra contra la misma página que el flujo normal.
      await page.goto(EDENRED_ACCOUNT_URL, { waitUntil: 'domcontentloaded' })
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    } else if (invalid === '2fa') {
      // 2FA visible ya en la carga (p. ej. tras un episodio que sigue pendiente, o
      // un 2FA forzado por Edenred). enterTwoFaPending marca el guard y avisa una
      // sola vez: en slots posteriores el marker ya existe y no se re-notifica.
      await enterTwoFaPending()
      await dumpFailure(page)
      die(2, `Sesión Edenred no válida (2fa). Regenera con: pnpm scrape:edenred:login`)
    }

    const balance = await extractBalance(page)
    const transactions = await extractTransactions(page)

    console.log(`[edenred-scrape] saldo=${balance} EUR, txs=${transactions.length}`)

    const result = await postToWebhook({ balance, transactions })
    console.log(`[edenred-scrape] OK${didRelogin ? ' (via auto-relogin)' : ''}: ${JSON.stringify(result)}`)
    if (CRON_MODE) writeCronMarker()
  } finally {
    await browser.close()
  }
}

main().catch(err => {
  // process.exit ya disparado por die(); cualquier otro error es inesperado.
  console.error('[edenred-scrape] error inesperado:', err)
  process.exit(4)
})
