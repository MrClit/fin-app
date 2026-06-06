#!/usr/bin/env node
// Edenred login — regeneración manual de storage-state.json.
//
// Uso:
//   pnpm scrape:edenred:login
//
// Requiere en .env.local: EDENRED_USER, EDENRED_PASS.
//
// El script lanza Chromium en modo headed e intenta rellenar las
// credenciales automáticamente. El auto-fill es best-effort: si los
// selectores no encajan o ya estás logueado en la máquina (sin form),
// no peta — termina el login a mano. Cuando estés dentro, pulsa ENTER
// para capturar la sesión.
//
// Salvaguardas:
//   - Reutiliza el storage-state previo si existe, así muchas veces sólo
//     pide el 2FA en vez de credenciales completas.
//   - Hace backup del state anterior antes de sobrescribir.
//   - No guarda si el navegador sigue en /login (ENTER prematuro o login
//     fallido) — la sesión vigente queda intacta.
//   - Valida que el state guardado tiene cookies de Edenred; si no, lo
//     restaura desde el backup.

import { chromium } from 'playwright'
import { existsSync, copyFileSync, readFileSync } from 'node:fs'
import readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

import {
  LOCAL_STORAGE_PATH,
  LOCAL_STORAGE_BACKUP_PATH,
  EDENRED_LOGIN_URL,
  isStorageStateValid,
} from './config.mjs'

// Locators del formulario de login (capturados con `playwright codegen`
// sobre empleados.edenred.es/login).
const locators = page => ({
  username: page.getByRole('textbox', { name: 'Usuario (campo requerido)' }),
  password: page.getByRole('textbox', { name: 'Contraseña (campo requerido)' }),
  submit: page.getByTestId('login'),
})

// Timeout corto: si el form no aparece pronto, asumimos que no hay que
// auto-rellenar (ya logueado, redirección a home, o selectores cambiados).
const AUTOFILL_TIMEOUT_MS = 5000

function requireEnv(name) {
  const v = process.env[name]
  if (!v) {
    console.error(`[edenred-login] Falta env var: ${name}`)
    process.exit(1)
  }
  return v
}

async function tryAutofill(page, user, pass) {
  const { username, password, submit } = locators(page)
  try {
    await username.waitFor({ timeout: AUTOFILL_TIMEOUT_MS })
  } catch {
    console.log('[edenred-login] no se vio el form de login (¿ya logueado?). Sigue a mano.')
    return false
  }
  try {
    await username.fill(user)
    await password.fill(pass)
    await submit.click()
    console.log('[edenred-login] credenciales auto-rellenadas, completa 2FA si lo pide.')
    return true
  } catch (err) {
    console.log(`[edenred-login] auto-fill falló (${err.message}). Termina el login a mano.`)
    return false
  }
}

// Si seguimos en /login o el campo de contraseña sigue visible, asumimos
// que el login no se ha completado y abortamos para no pisar el state bueno.
async function isLoggedIn(page) {
  if (page.url().includes('/login')) return false
  const passwordVisible = await page
    .locator('input[type="password"]')
    .first()
    .isVisible()
    .catch(() => false)
  return !passwordVisible
}

function restoreBackup() {
  if (existsSync(LOCAL_STORAGE_BACKUP_PATH)) {
    copyFileSync(LOCAL_STORAGE_BACKUP_PATH, LOCAL_STORAGE_PATH)
    console.error(`[edenred-login] state restaurado desde ${LOCAL_STORAGE_BACKUP_PATH}`)
  }
}

async function main() {
  const user = requireEnv('EDENRED_USER')
  const pass = requireEnv('EDENRED_PASS')

  // Reutiliza el state previo (cookies persistentes pueden saltar el form
  // y dejar sólo el 2FA por hacer). Y lo respalda antes de cualquier
  // posible sobrescritura.
  const hasPreviousState = existsSync(LOCAL_STORAGE_PATH)
  if (hasPreviousState) {
    copyFileSync(LOCAL_STORAGE_PATH, LOCAL_STORAGE_BACKUP_PATH)
    console.log(`[edenred-login] backup del state actual en ${LOCAL_STORAGE_BACKUP_PATH}`)
  }

  const browser = await chromium.launch({ headless: false })
  try {
    const context = await browser.newContext(
      hasPreviousState ? { storageState: LOCAL_STORAGE_PATH } : {},
    )
    const page = await context.newPage()

    console.log('[edenred-login] abriendo Edenred…')
    await page.goto(EDENRED_LOGIN_URL, { waitUntil: 'domcontentloaded' })

    await tryAutofill(page, user, pass)

    const rl = readline.createInterface({ input, output })
    await rl.question(
      '\n→ Completa el 2FA en el navegador (si lo pide).\n' +
      '→ Cuando estés dentro de la cuenta, pulsa ENTER aquí para guardar la sesión…\n'
    )
    rl.close()

    if (!(await isLoggedIn(page))) {
      console.error('[edenred-login] El navegador sigue en /login. No guardo nada — sesión previa intacta.')
      process.exit(2)
    }

    await context.storageState({ path: LOCAL_STORAGE_PATH, indexedDB: true })

    // Sanity check: si el JSON guardado no tiene cookies de edenred,
    // la sesión no sirve. Restauramos el backup y salimos con error.
    const saved = JSON.parse(readFileSync(LOCAL_STORAGE_PATH, 'utf-8'))
    if (!isStorageStateValid(saved)) {
      console.error('[edenred-login] state guardado sin cookies de Edenred — restaurando backup.')
      restoreBackup()
      process.exit(2)
    }

    console.log(`[edenred-login] [ok] guardado: ${LOCAL_STORAGE_PATH}`)
    console.log('\nValida en caliente con:\n  pnpm scrape:edenred\n')
  } finally {
    await browser.close()
  }
}

main().catch(err => {
  console.error('[edenred-login] error:', err)
  process.exit(1)
})
