#!/usr/bin/env node
// Edenred scraper — Playwright headless.
//
// Uso (local):
//   pnpm scrape:edenred
//
// Uso (CI): el workflow (#A3) inyecta EDENRED_STORAGE_STATE como base64.
//
// Exit codes:
//   0 — éxito (webhook 200)
//   1 — falta storage-state (regenerar con pnpm scrape:edenred:login)
//   2 — sesión Edenred caducada o pide 2FA (regenerar localmente)
//   3 — error de webhook (status != 200 o red)
//   4 — error de scraping (no se encontraron selectores en el DOM)

import { chromium } from 'playwright'
import { mkdtempSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const LOCAL_STORAGE_PATH = 'scripts/storage-state.json'

// URLs y selectores: tunear tras inspeccionar edenred.es con DevTools o
// `pnpm exec playwright codegen https://www.myedenred.es`.
const EDENRED_ACCOUNT_URL = 'https://empleados.edenred.es'

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

function die(code, msg) {
  console.error(`[scrape-edenred] ${msg}`)
  process.exit(code)
}

function requireEnv(name) {
  const v = process.env[name]
  if (!v) die(1, `Falta env var: ${name}`)
  return v
}

function resolveStorageStatePath() {
  if (process.env.EDENRED_STORAGE_STATE) {
    const dir = mkdtempSync(join(tmpdir(), 'edenred-'))
    const path = join(dir, 'storage-state.json')
    const decoded = Buffer.from(process.env.EDENRED_STORAGE_STATE, 'base64').toString('utf-8')
    writeFileSync(path, decoded, 'utf-8')
    return path
  }
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
  if (!(await el.isVisible().catch(() => false))) die(4, 'Saldo no encontrado en el DOM')
  const text = (await el.textContent()) ?? ''
  return parseAmount(text)
}

async function extractTransactions(page) {
  const rows = await page.locator(SELECTORS.transactionRow).all()
  if (rows.length === 0) die(4, 'No se encontró ninguna fila de transacciones')

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
      die(2, `Sesión Edenred no válida (${invalid}). Regenera con: pnpm scrape:edenred:login`)
    }

    const balance = await extractBalance(page)
    const transactions = await extractTransactions(page)

    console.log(`[scrape-edenred] saldo=${balance} EUR, txs=${transactions.length}`)

    const result = await postToWebhook({ balance, transactions })
    console.log(`[scrape-edenred] OK: ${JSON.stringify(result)}`)
  } finally {
    await browser.close()
  }
}

main().catch(err => {
  // process.exit ya disparado por die(); cualquier otro error es inesperado.
  console.error('[scrape-edenred] error inesperado:', err)
  process.exit(4)
})
