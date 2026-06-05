#!/usr/bin/env node
// Edenred scraper — Playwright headless.
//
// Uso:
//   pnpm scrape:edenred
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

import { LOCAL_STORAGE_PATH, EDENRED_ACCOUNT_URL } from './lib/edenred-config.mjs'

// Cuando se invoca desde launchd (EDENRED_CRON=1) se usa un marker diario
// para tolerar que el Mac estuviera dormido: el plist define varios slots a
// lo largo del día y el primero que pille la máquina despierta ejecuta; los
// siguientes salen no-op porque encuentran el marker.
const CRON_MODE = process.env.EDENRED_CRON === '1'
const CRON_LOG_DIR = join(homedir(), 'Library/Logs/fin-app')
const CRON_MARKER_PREFIX = 'edenred-last-success.'
// Marker para throttlear la notificación de sesión caducada a 1/día: el plist
// dispara 6 slots, pero sólo queremos un aviso. Se borra al primer éxito (ver
// writeCronMarker) para "re-armar" el aviso ante un fallo posterior del día.
const NOTIFY_MARKER_PREFIX = 'edenred-notified.'
// Prefijo de los volcados de diagnóstico (screenshot + HTML) que se generan al
// fallar. Compartido implícitamente con edenred-status.mjs (mismo literal allí).
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
//   pnpm exec playwright codegen --load-storage=scripts/storage-state.json https://empleados.edenred.es
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

// Parsea importes en formato español ("12,50 €" o "-12,50 €") a number.
function parseAmount(raw) {
  const cleaned = raw.replace(/[^0-9,.\-]/g, '').replace(/\./g, '').replace(',', '.')
  const n = Number.parseFloat(cleaned)
  if (Number.isNaN(n)) throw new Error(`No se pudo parsear importe: "${raw}"`)
  return n
}

// "15/05/2026" o "15 may 2026" → "2026-05-15".
function parseDate(raw) {
  const m = raw.trim().match(/(\d{1,2})[\/\s-](\d{1,2}|[a-záéíóú]+)[\/\s-](\d{4})/i)
  if (!m) throw new Error(`No se pudo parsear fecha: "${raw}"`)
  const day = m[1].padStart(2, '0')
  const monthRaw = m[2].toLowerCase()
  const months = {
    ene: '01', feb: '02', mar: '03', abr: '04', may: '05', jun: '06',
    jul: '07', ago: '08', sep: '09', oct: '10', nov: '11', dic: '12',
  }
  const month = /^\d+$/.test(monthRaw)
    ? monthRaw.padStart(2, '0')
    : months[monthRaw.slice(0, 3)] || die(4, `Mes desconocido: "${monthRaw}"`)
  return `${m[3]}-${month}-${day}`
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
    // descripción literal: "RECARGA" es un ingreso (top-up de empresa),
    // todo lo demás es consumo en restaurante.
    const isRecarga = description.toUpperCase() === 'RECARGA'
    const amount = isRecarga ? parseAmount(rawAmount) : -parseAmount(rawAmount)
    const category = isRecarga ? 'income' : 'restaurant'

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
  if (CRON_MODE && cronMarkerExists()) {
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

    const invalid = await isSessionInvalid(page)
    if (invalid) {
      await dumpFailure(page)
      die(2, `Sesión Edenred no válida (${invalid}). Regenera con: pnpm scrape:edenred:login`)
    }

    const balance = await extractBalance(page)
    const transactions = await extractTransactions(page)

    console.log(`[edenred-scrape] saldo=${balance} EUR, txs=${transactions.length}`)

    const result = await postToWebhook({ balance, transactions })
    console.log(`[edenred-scrape] OK: ${JSON.stringify(result)}`)
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
