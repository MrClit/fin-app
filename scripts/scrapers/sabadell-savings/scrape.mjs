#!/usr/bin/env node
// Sabadell Ahorro scraper — plan de ahorro Bansabadell Vida (#197). Playwright
// HEADED con el MISMO perfil enrolado que Sabadell VISA (ver sabadell-shared): un
// solo login/dispositivo para todos los scrapers Sabadell. Lee saldo acumulado y
// movimientos del plan (aportaciones + revalorización) y los envía al webhook.
//
// Uso:
//   pnpm scrape:sabadell-savings          (respeta el marker diario si SABADELL_CRON=1)
//   pnpm scrape:sabadell-savings:force    (SABADELL_SKIP_MARKER=1: ignora el marker)
//
// Flags de desarrollo (compartidos con la VISA):
//   SABADELL_DRY_RUN=1   no hace POST; imprime el payload
//   SABADELL_DEBUG=1     vuelca DOM en cada paso a ~/Library/Logs/fin-app
//
// El enrolado (login con OTP) es compartido: pnpm scrape:sabadell:login
//
// Exit codes:
//   0 éxito · 1 falta config/perfil · 2 sesión/OTP · 3 error webhook
//   4 error de scraping (navegación/selectores/extracción)

import { chromium } from 'playwright'
import { existsSync } from 'node:fs'

import {
  USER_DATA_DIR,
  CHROME_CHANNEL, CHROME_ARGS, STEALTH_INIT_SCRIPT,
} from '../sabadell-shared/config.mjs'
import { parseAmount, parseSpanishDate } from '../sabadell-shared/parsers.mjs'
import { createScraperInfra } from '../sabadell-shared/infra.mjs'
import { createProfileLock } from '../sabadell-shared/lock.mjs'
import { login, dismissNotices } from '../sabadell-shared/session.mjs'
import { DESCRIPTOR } from './descriptor.mjs'
import { SAVINGS_TILE, SAVINGS_SELECTORS } from './config.mjs'

const CRON_MODE = process.env.SABADELL_CRON === '1'
const DRY_RUN = process.env.SABADELL_DRY_RUN === '1'
const DEBUG = process.env.SABADELL_DEBUG === '1'

const infra = createScraperInfra(DESCRIPTOR, { cronMode: CRON_MODE })
const lock = createProfileLock()

// Fuerza la posición global clásica (PAGlobalPosition), de donde cuelga el menú
// "Ahorro e inversión". Se usa la propia función doAction de la página (POST del
// formulario, tolerada por el WAF a diferencia del deep-link GET). Best-effort: si
// no existe doAction (otra landing), no hace nada y navigateFromMenu lo intentará.
async function gotoGlobalPosition(page) {
  const done = await page.evaluate(() => {
    if (typeof doAction === 'function') { doAction('PAGlobalPosition.init'); return true }
    return false
  }).catch(() => false)
  if (done) await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
}

// Margen para la recarga que dispara el despliegue del tile (init → initInfo).
const EXPAND_TIMEOUT = 30000

// Despliega el plan de ahorro y sus movimientos. El plan es un tile en la posición
// global (PAGlobalPosition.init); al clicarlo, la posición global se recarga a
// PAGlobalPosition.initInfo mostrando los movimientos inline. NO se pasa por el
// menú "Ahorro e inversión" (es el catálogo de productos, sin el plan).
async function openSavingsDetail(page) {
  const MAX_ATTEMPTS = 3
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    // 1. Posición global (doAction), donde vive el tile del plan.
    await gotoGlobalPosition(page)

    // 2. Espera el tile del plan en la posición global.
    const tile = await page.locator(SAVINGS_TILE).first()
      .waitFor({ state: 'attached', timeout: 20000 }).then(() => true).catch(() => false)
    if (!tile) {
      if (DEBUG) await infra.dump(page, `no-tile-${attempt}`)
      continue
    }
    if (DEBUG) await infra.dump(page, 'savings-global')

    // 3. Click del tile → despliega los movimientos (recarga a .initInfo). Pequeña
    //    espera antes para que el handler JS del tile (cursor:pointer) quede enlazado.
    await page.waitForTimeout(1000)
    await page.locator(SAVINGS_TILE).first().click().catch(() => {})
    const loaded = await page.locator(SAVINGS_SELECTORS.movementsContainer).first()
      .waitFor({ state: 'attached', timeout: EXPAND_TIMEOUT }).then(() => true).catch(() => false)
    if (loaded) {
      if (DEBUG) await infra.dump(page, 'savings-detail')
      return
    }
    // No desplegó: reintenta reasentando la posición global.
  }
  await infra.dump(page, 'no-savings-detail')
  await infra.failScrape(4, 'No se pudo desplegar el plan de ahorro en la posición global')
}

// Despliega el histórico completo pulsando "Ver más movimientos" mientras sea
// visible (best-effort; oculto cuando ya está todo cargado).
async function expandMovements(page) {
  for (let i = 0; i < 10; i++) {
    const more = page.locator(`${SAVINGS_SELECTORS.showMore}:visible`).first()
    if (!(await more.isVisible().catch(() => false))) return
    await more.click().catch(() => {})
    await page.waitForTimeout(800)
  }
}

// Extrae saldo, id de producto, nombre y movimientos de la ficha.
async function extractSavings(page) {
  return page.evaluate(sel => {
    const clean = el => (el?.textContent || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim()
    const productCode = clean(document.querySelector(sel.productCode))
    const balanceText = clean(document.querySelector(sel.balance))
    const name = clean(document.querySelector(sel.desc))
    const movements = []
    document.querySelectorAll(sel.movementRow).forEach(tr => {
      const cells = tr.querySelectorAll(sel.cell)
      if (cells.length < 3) return
      movements.push({ dateText: clean(cells[0]), concept: clean(cells[1]), amountText: clean(cells[2]) })
    })
    return { productCode, balanceText, name, movements }
  }, SAVINGS_SELECTORS)
}

async function main() {
  if (CRON_MODE && !process.env.SABADELL_SKIP_MARKER && existsSync(infra.markerPath())) {
    infra.log('skip: ya hubo ejecución correcta hoy')
    return
  }
  if (!existsSync(USER_DATA_DIR)) {
    infra.die(1, 'No hay perfil. Ejecuta: pnpm scrape:sabadell:login')
  }

  // Serializa con la VISA (comparten el perfil de Chrome).
  if (!(await lock.acquire())) {
    infra.log('skip: perfil ocupado por otro scraper Sabadell (lock no adquirido)')
    return
  }

  // El launch va DENTRO del try: si falla el arranque de Chrome, el `finally`
  // devuelve el lock en vez de dejarlo puesto hasta que caduque (#401).
  let context = null
  try {
    context = await chromium.launchPersistentContext(USER_DATA_DIR, {
      headless: false,
      channel: CHROME_CHANNEL,
      args: CHROME_ARGS,
      viewport: null,
    })
    await context.addInitScript(STEALTH_INIT_SCRIPT)
    const page = context.pages()[0] ?? (await context.newPage())

    await login(page, { infra, cronMode: CRON_MODE, loginCommand: DESCRIPTOR.loginCommand, debug: DEBUG })
    // Cierra avisos post-login (p.ej. "Tu DNI/TIE ha caducado") que bloquean la
    // navegación hasta descartarlos.
    await dismissNotices(page, { infra, debug: DEBUG })

    await openSavingsDetail(page)
    await expandMovements(page)
    const data = await extractSavings(page)

    // El id de producto se muestra con un espacio interno ("32000007 181690");
    // se normaliza sin espacios como external_id estable de la cuenta.
    const productCode = data.productCode.replace(/\s+/g, '')
    const balance = parseAmount(data.balanceText)
    if (!productCode || !Number.isFinite(balance)) {
      await infra.dump(page, 'savings-extract')
      await infra.failScrape(4, `No se pudo extraer productCode/saldo del plan (code="${data.productCode}", saldo="${data.balanceText}")`)
    }

    const transactions = []
    for (const m of data.movements) {
      const date = parseSpanishDate(m.dateText)
      const amount = parseAmount(m.amountText)
      if (!date || !Number.isFinite(amount)) continue
      // Sin referencia única por movimiento: se sintetiza un external_id estable a
      // partir de productCode + fecha + importe + concepto.
      const conceptKey = m.concept.replace(/\s+/g, '')
      const external_id = `sabadell-savings-${productCode}-${date}-${amount}-${conceptKey}`
      transactions.push({ external_id, amount, description: m.concept, transaction_date: date })
    }

    const account = {
      account_id: productCode,
      name: data.name || 'Plan de ahorro',
      balance,
      transactions,
    }
    infra.log(`plan ${productCode}: saldo=${balance} EUR, movs=${transactions.length}`)

    if (DRY_RUN) {
      infra.log('DRY_RUN — payload:')
      console.log(JSON.stringify({ last_synced_at: new Date().toISOString(), account }, null, 2))
      return
    }

    const result = await infra.postToWebhook({ last_synced_at: new Date().toISOString(), account })
    infra.log(`OK: ${JSON.stringify(result)}`)
    if (CRON_MODE) infra.writeMarker()
  } finally {
    if (context) await context.close()
    // `release` espera a que Chrome suelte el perfil de verdad antes de abrir la
    // puerta al siguiente scraper Sabadell (#401).
    await lock.release()
  }
}

main().catch(async err => {
  console.error('[sabadell-savings-scrape] error inesperado:', err)
  // Error inesperado = fallo de scraping (exit 4): avisa bajo cron antes de salir.
  if (CRON_MODE) await infra.notifyExpired('scrape_failed')
  process.exit(4)
})
