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

import { chromium } from 'playwright'
import { existsSync, mkdirSync } from 'node:fs'
import readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

const LOCAL_STORAGE_PATH = 'scripts/storage-state.json'
const EDENRED_LOGIN_URL = 'https://empleados.edenred.es/login'

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
    console.error(`[login-edenred] Falta env var: ${name}`)
    process.exit(1)
  }
  return v
}

async function tryAutofill(page, user, pass) {
  const { username, password, submit } = locators(page)
  try {
    await username.waitFor({ timeout: AUTOFILL_TIMEOUT_MS })
  } catch {
    console.log('[login-edenred] no se vio el form de login (¿ya logueado?). Sigue a mano.')
    return false
  }
  try {
    await username.fill(user)
    await password.fill(pass)
    await submit.click()
    console.log('[login-edenred] credenciales auto-rellenadas, completa 2FA si lo pide.')
    return true
  } catch (err) {
    console.log(`[login-edenred] auto-fill falló (${err.message}). Termina el login a mano.`)
    return false
  }
}

async function main() {
  const user = requireEnv('EDENRED_USER')
  const pass = requireEnv('EDENRED_PASS')

  if (!existsSync('scripts')) mkdirSync('scripts')

  const browser = await chromium.launch({ headless: false })
  try {
    const context = await browser.newContext()
    const page = await context.newPage()

    console.log('[login-edenred] abriendo Edenred…')
    await page.goto(EDENRED_LOGIN_URL, { waitUntil: 'domcontentloaded' })

    await tryAutofill(page, user, pass)

    const rl = readline.createInterface({ input, output })
    await rl.question(
      '\n→ Completa el 2FA en el navegador (si lo pide).\n' +
      '→ Cuando estés dentro de la cuenta, pulsa ENTER aquí para guardar la sesión…\n'
    )
    rl.close()

    await context.storageState({ path: LOCAL_STORAGE_PATH, indexedDB: true })
    console.log(`[login-edenred] ✓ Guardado: ${LOCAL_STORAGE_PATH}`)
    console.log(
      `\nPara subirlo a GitHub Secrets:\n` +
      `  base64 -i ${LOCAL_STORAGE_PATH} | gh secret set EDENRED_STORAGE_STATE --repo MrClit/fin-app\n`
    )
  } finally {
    await browser.close()
  }
}

main().catch(err => {
  console.error('[login-edenred] error:', err)
  process.exit(1)
})
