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
import { existsSync } from 'node:fs'
import readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

import { LOCAL_STORAGE_PATH, EDENRED_LOGIN_URL } from './config.mjs'
import { tryAutofill, saveStorageStateWithBackup, clearTwoFaPending } from './auth.mjs'

function requireEnv(name) {
  const v = process.env[name]
  if (!v) {
    console.error(`[edenred-login] Falta env var: ${name}`)
    process.exit(1)
  }
  return v
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

async function main() {
  const user = requireEnv('EDENRED_USER')
  const pass = requireEnv('EDENRED_PASS')

  // Reutiliza el state previo (cookies persistentes pueden saltar el form
  // y dejar sólo el 2FA por hacer).
  const hasPreviousState = existsSync(LOCAL_STORAGE_PATH)

  const browser = await chromium.launch({ headless: false })
  try {
    const context = await browser.newContext(
      hasPreviousState ? { storageState: LOCAL_STORAGE_PATH } : {},
    )
    const page = await context.newPage()

    console.log('[edenred-login] abriendo Edenred…')
    await page.goto(EDENRED_LOGIN_URL, { waitUntil: 'domcontentloaded' })

    await tryAutofill(page, user, pass)
    console.log('[edenred-login] completa 2FA en el navegador si lo pide.')

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

    if (!(await saveStorageStateWithBackup(context))) {
      // state sin cookies de Edenred: ya se restauró el backup, salimos.
      process.exit(2)
    }

    // Login manual exitoso: re-arma el auto-relogin de scrape.mjs limpiando
    // el marker de "2FA pendiente" si lo había.
    clearTwoFaPending()

    console.log('\nValida en caliente con:\n  pnpm scrape:edenred\n')
  } finally {
    await browser.close()
  }
}

main().catch(err => {
  console.error('[edenred-login] error:', err)
  process.exit(1)
})
