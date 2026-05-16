#!/usr/bin/env node
// Edenred login — regeneración manual de storage-state.json.
//
// Uso:
//   pnpm scrape:edenred:login
//
// Requiere en .env.local: EDENRED_USER, EDENRED_PASS.
//
// El script lanza Chromium en modo headed, rellena las credenciales, pausa
// para que el usuario complete el 2FA a mano, y al volver guarda el
// storage-state. Luego imprime el comando para actualizar el secret de GitHub.

import { chromium } from 'playwright'
import { existsSync, mkdirSync } from 'node:fs'
import readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

const LOCAL_STORAGE_PATH = 'scripts/storage-state.json'
const EDENRED_LOGIN_URL = 'https://www.myedenred.es/'

// Selectores del formulario de login: tunear tras inspeccionar.
const SELECTORS = {
  username: 'input[name="username"], input[type="email"]',
  password: 'input[name="password"], input[type="password"]',
  submit: 'button[type="submit"], button:has-text("Entrar")',
}

function requireEnv(name) {
  const v = process.env[name]
  if (!v) {
    console.error(`[login-edenred] Falta env var: ${name}`)
    process.exit(1)
  }
  return v
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

    await page.locator(SELECTORS.username).first().fill(user)
    await page.locator(SELECTORS.password).first().fill(pass)
    await page.locator(SELECTORS.submit).first().click()

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
