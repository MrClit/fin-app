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
// El enrolado (login con OTP) es compartido: pnpm scrape:sabadell-visa:login
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
import { SAVINGS_MENU_HREF, SAVINGS_TILE, SAVINGS_SELECTORS } from './config.mjs'

const CRON_MODE = process.env.SABADELL_CRON === '1'
const DRY_RUN = process.env.SABADELL_DRY_RUN === '1'
const DEBUG = process.env.SABADELL_DEBUG === '1'

const infra = createScraperInfra(DESCRIPTOR)
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

// La sección de ahorro es un micro-frontend (iframe proteo4-mfe): al pulsar
// "Ahorro e inversión" carga un shell y el tile del plan tarda ~12 s en aparecer
// en el DOM principal. Por eso se espera con margen amplio (30 s). NO se usa
// navigateFromMenu del shared: su fallback recarga la home de marketing (sin
// doAction), un callejón sin salida; aquí el reset entre intentos es siempre la
// posición global vía doAction.
const MFE_TIMEOUT = 30000

// Abre la ficha de detalle del plan: posición global → "Ahorro e inversión" →
// lista con el tile (MFE) → click del tile → ficha con movimientos.
async function openSavingsDetail(page) {
  const MAX_ATTEMPTS = 3
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    // 1. Reasienta la posición global clásica (nunca la home de marketing).
    await gotoGlobalPosition(page)

    // 2. Click en el enlace VISIBLE "Ahorro e inversión" (SVProductFinancing).
    const menu = page.locator(SAVINGS_MENU_HREF).first()
    if (!(await menu.count().catch(() => 0))) {
      if (DEBUG) await infra.dump(page, `no-ahorro-menu-${attempt}`)
      continue
    }
    await menu.click().catch(() => {})

    // 3. Espera el tile del plan (lo pinta el MFE, con retardo).
    const listed = await page.locator(SAVINGS_TILE).first()
      .waitFor({ state: 'attached', timeout: MFE_TIMEOUT }).then(() => true).catch(() => false)
    if (!listed) {
      if (DEBUG) await infra.dump(page, `no-savings-tile-${attempt}`)
      continue
    }
    if (DEBUG) await infra.dump(page, 'savings-list')

    // 4. Click del tile → ficha con saldo y movimientos. Pequeña espera para que
    //    el handler JS del tile (cursor:pointer, no es un <a>) quede enlazado.
    await page.waitForTimeout(1000)
    await page.locator(SAVINGS_TILE).first().click().catch(() => {})
    const loaded = await page.locator(SAVINGS_SELECTORS.movementsContainer).first()
      .waitFor({ state: 'attached', timeout: MFE_TIMEOUT }).then(() => true).catch(() => false)
    if (loaded) {
      if (DEBUG) await infra.dump(page, 'savings-detail')
      return
    }
    // La ficha no cargó: reintenta reasentando la posición global.
  }
  await infra.dump(page, 'no-savings-detail')
  infra.die(4, 'No se pudo abrir la ficha del plan de ahorro (sección MFE de ahorro)')
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
    infra.die(1, 'No hay perfil. Ejecuta: pnpm scrape:sabadell-visa:login')
  }

  // Serializa con la VISA (comparten el perfil de Chrome).
  if (!(await lock.acquire())) {
    infra.log('skip: perfil ocupado por otro scraper Sabadell (lock no adquirido)')
    return
  }

  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    channel: CHROME_CHANNEL,
    args: CHROME_ARGS,
    viewport: null,
  })
  await context.addInitScript(STEALTH_INIT_SCRIPT)
  try {
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
      infra.die(4, `No se pudo extraer productCode/saldo del plan (code="${data.productCode}", saldo="${data.balanceText}")`)
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
    await context.close()
    lock.release()
  }
}

main().catch(err => {
  console.error('[sabadell-savings-scrape] error inesperado:', err)
  process.exit(4)
})
