// Lógica de autenticación compartida entre login.mjs (headed, manual) y
// scrape.mjs (headless, auto-relogin). Mantener el relleno del formulario y el
// guardado del storage-state en un único sitio evita que ambos flujos se
// desincronicen (causa típica de exit code 2).
//
// A diferencia de config.mjs (puro, sin dependencias), este módulo tiene
// efectos: toca el DOM vía Playwright y el sistema de ficheros.

import { existsSync, copyFileSync, readFileSync, writeFileSync, closeSync, openSync, unlinkSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

import {
  LOCAL_STORAGE_PATH,
  LOCAL_STORAGE_BACKUP_PATH,
  isStorageStateValid,
} from './config.mjs'

// Locators del formulario de login (capturados con `playwright codegen`
// sobre empleados.edenred.es/login).
export const loginLocators = (page) => ({
  username: page.getByRole('textbox', { name: 'Usuario (campo requerido)' }),
  password: page.getByRole('textbox', { name: 'Contraseña (campo requerido)' }),
  submit: page.getByTestId('login'),
})

// Timeout corto: si el form no aparece pronto, asumimos que no hay que
// auto-rellenar (ya logueado, redirección a home, o selectores cambiados).
export const AUTOFILL_TIMEOUT_MS = 5000

// Rellena y envía el formulario de login. Best-effort: devuelve false si el
// form no aparece (ya logueado) o si el relleno falla, sin lanzar.
export async function tryAutofill(page, user, pass) {
  const { username, password, submit } = loginLocators(page)
  try {
    await username.waitFor({ timeout: AUTOFILL_TIMEOUT_MS })
  } catch {
    console.log('[edenred-auth] no se vio el form de login (¿ya logueado?).')
    return false
  }
  try {
    await username.fill(user)
    await password.fill(pass)
    await submit.click()
    console.log('[edenred-auth] credenciales auto-rellenadas.')
    return true
  } catch (err) {
    console.log(`[edenred-auth] auto-fill falló (${err.message}).`)
    return false
  }
}

function restoreBackup() {
  if (existsSync(LOCAL_STORAGE_BACKUP_PATH)) {
    copyFileSync(LOCAL_STORAGE_BACKUP_PATH, LOCAL_STORAGE_PATH)
    console.error(`[edenred-auth] state restaurado desde ${LOCAL_STORAGE_BACKUP_PATH}`)
  }
}

// Guarda el storage-state del contexto con salvaguardas: respalda el state
// previo, escribe el nuevo, y valida que tenga cookies de Edenred; si no, lo
// restaura desde el backup. Devuelve true si el state guardado es válido.
export async function saveStorageStateWithBackup(context) {
  if (existsSync(LOCAL_STORAGE_PATH)) {
    copyFileSync(LOCAL_STORAGE_PATH, LOCAL_STORAGE_BACKUP_PATH)
    console.log(`[edenred-auth] backup del state actual en ${LOCAL_STORAGE_BACKUP_PATH}`)
  }

  await context.storageState({ path: LOCAL_STORAGE_PATH, indexedDB: true })

  const saved = JSON.parse(readFileSync(LOCAL_STORAGE_PATH, 'utf-8'))
  if (!isStorageStateValid(saved)) {
    console.error('[edenred-auth] state guardado sin cookies de Edenred — restaurando backup.')
    restoreBackup()
    return false
  }

  console.log(`[edenred-auth] [ok] guardado: ${LOCAL_STORAGE_PATH}`)
  return true
}

// Marker persistente (no diario) que señala "2FA pendiente": lo crea el
// auto-relogin de scrape.mjs cuando el envío de credenciales desemboca en 2FA,
// y lo limpia un login manual exitoso (login.mjs). Mientras existe, scrape.mjs
// no reintenta el auto-relogin (no reenvía credenciales) para no disparar un
// email de código nuevo en cada slot del cron (~6/día).
const CRON_LOG_DIR = join(homedir(), 'Library/Logs/fin-app')
// Nombres compartidos con status.mjs (mismos literales allí) para reportar el
// estado del auto-relogin sin tener que rebuscar en el out.log.
const TWO_FA_PENDING_PATH = join(CRON_LOG_DIR, 'edenred-2fa-pending')
const LAST_RELOGIN_PATH = join(CRON_LOG_DIR, 'edenred-last-relogin')

export function twoFaPendingExists() {
  return existsSync(TWO_FA_PENDING_PATH)
}

export function setTwoFaPending() {
  try {
    mkdirSync(CRON_LOG_DIR, { recursive: true })
    closeSync(openSync(TWO_FA_PENDING_PATH, 'a'))
  } catch {}
}

export function clearTwoFaPending() {
  try {
    unlinkSync(TWO_FA_PENDING_PATH)
  } catch {}
}

// Registra el instante del último auto-relogin exitoso (timestamp ISO como
// contenido) para que `pnpm cron:edenred:status` lo muestre. Persistente:
// señala "última vez que el scrape se re-logueó solo".
export function markLastRelogin() {
  try {
    mkdirSync(CRON_LOG_DIR, { recursive: true })
    writeFileSync(LAST_RELOGIN_PATH, new Date().toISOString())
  } catch {}
}
