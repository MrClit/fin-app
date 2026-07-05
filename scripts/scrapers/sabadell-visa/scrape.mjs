#!/usr/bin/env node
// Sabadell VISA scraper — tarjetas de crédito (#147). Playwright HEADED (Sabadell
// bloquea headless vía WAF Akamai) con Chrome real + perfil persistente enrolado
// como dispositivo de confianza (sin OTP en logins posteriores).
//
// La fontanería común a los scrapers Sabadell (login, infra, navegación, lock del
// perfil) vive en ../sabadell-shared; aquí queda sólo lo específico de tarjetas.
//
// Uso:
//   pnpm scrape:sabadell-visa          (respeta el marker diario si SABADELL_CRON=1)
//   pnpm scrape:sabadell-visa:force    (SABADELL_SKIP_MARKER=1: ignora el marker)
//
// Flags de desarrollo:
//   SABADELL_DRY_RUN=1   no hace POST; imprime el payload
//   SABADELL_DEBUG=1     vuelca DOM en cada paso a ~/Library/Logs/fin-app
//
// Exit codes:
//   0 éxito · 1 falta config · 2 sesión/OTP (re-enrolar con scrape:sabadell-visa:login)
//   3 error webhook · 4 error de scraping (navegación/selectores)

import { chromium } from 'playwright'
import { existsSync } from 'node:fs'

import {
  USER_DATA_DIR, SABADELL_HOME_URL,
  CHROME_CHANNEL, CHROME_ARGS, STEALTH_INIT_SCRIPT,
} from '../sabadell-shared/config.mjs'
import { parseAmount, parseDate } from '../sabadell-shared/parsers.mjs'
import { createScraperInfra } from '../sabadell-shared/infra.mjs'
import { createProfileLock } from '../sabadell-shared/lock.mjs'
import { login, dismissNotices } from '../sabadell-shared/session.mjs'
import { navigateFromMenu } from '../sabadell-shared/navigation.mjs'
import { DESCRIPTOR } from './descriptor.mjs'

const CRON_MODE = process.env.SABADELL_CRON === '1'
const DRY_RUN = process.env.SABADELL_DRY_RUN === '1'
const DEBUG = process.env.SABADELL_DEBUG === '1'

// Las 2 tarjetas de crédito a sincronizar, por sus últimos 4 dígitos (#147).
// Configurable por si cambian. Las de débito (5402…) se ignoran.
const TARGET_CARD_LAST4 = (process.env.SABADELL_CARDS || '4014,5011').split(',').map(s => s.trim())

const infra = createScraperInfra(DESCRIPTOR)
const lock = createProfileLock()

// Navega a la lista de tarjetas (#cardAccountTable) clicando el enlace del menú
// que apunta a TJMovementsQueryDebt.init.bs (deep-link directo bloqueado por WAF).
async function gotoCardsList(page) {
  await navigateFromMenu(page, {
    hrefPattern: 'a[href*="TJMovementsQueryDebt.init.bs"]',
    readySelector: '#cardAccountTable',
    homeUrl: SABADELL_HOME_URL,
    infra,
    debug: DEBUG,
    debugTag: 'cards-list',
    failTag: 'no-cards-table',
    failMsg: 'No se encontró la tabla de tarjetas (#cardAccountTable)',
  })
}

// Selecciona la tarjeta cuyo número contiene `last4` y abre sus movimientos.
async function openCardMovements(page, last4) {
  // Reintento corto (#212): el click de fila + "Aceptar" es sensible al timing del
  // webflow legacy. Si la página de movimientos no carga, volvemos a la lista de
  // tarjetas y reintentamos una vez antes de morir.
  const MAX_ATTEMPTS = 2
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    // La fila de la tarjeta en #cardAccountTable muestra el número enmascarado.
    const row = page.locator(`#cardAccountTable tr`, { hasText: last4 }).first()
    if (!(await row.isVisible().catch(() => false))) {
      if (attempt < MAX_ATTEMPTS) { await gotoCardsList(page); continue }
      await infra.dump(page, `card-${last4}-no-row`)
      infra.die(4, `No se encontró la fila de la tarjeta …${last4} en la lista`)
    }
    await row.click().catch(() => {})
    // Botón de consulta de movimientos.
    const submit = page.locator('input[name="aceptar"], input[value="Aceptar"]').first()
    if (await submit.isVisible().catch(() => false)) {
      await submit.click().catch(() => {})
    }
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    // Espera a que cargue la página de movimientos (input oculto card.number).
    const loaded = await page.locator('input[name="card.number"]').first()
      .waitFor({ state: 'attached', timeout: 15000 }).then(() => true).catch(() => false)
    if (loaded) {
      if (DEBUG) await infra.dump(page, `card-${last4}-movements`)
      return
    }
    // No cargaron: reintentar desde la lista de tarjetas.
    if (attempt < MAX_ATTEMPTS) { await gotoCardsList(page); continue }
    await infra.dump(page, `card-${last4}-no-movements`)
    infra.die(4, `No cargaron los movimientos de la tarjeta …${last4}`)
  }
}

// Extrae number, saldo y movimientos confirmados de la página de movimientos.
async function extractCard(page) {
  const data = await page.evaluate(() => {
    const clean = s => (s || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim()
    const cardNumber = document.querySelector('input[name="card.number"]')?.value || ''
    const movements = []
    // Confirmados: celda de fecha headers="fecha" (los pendientes usan "fechaNC").
    document.querySelectorAll('td[headers="fecha"][abbr]').forEach(dateTd => {
      const tr = dateTd.closest('tr'); if (!tr) return
      const purposeTd = tr.querySelector('td[headers="purpose"]')
      const description = clean(purposeTd?.getAttribute('alt') || purposeTd?.textContent)
      const town = clean(tr.querySelector('td[headers="town"]')?.textContent)
      const ref = clean(tr.querySelector('.bso-unique-movement-reference')?.textContent)
      const amountAbbr = tr.querySelector('td[headers="amount"][abbr]')?.getAttribute('abbr') || ''
      movements.push({ date: dateTd.getAttribute('abbr'), description, town, ref, amountAbbr })
    })
    return { cardNumber, movements, bodyText: clean(document.body.innerText) }
  })

  // Deuda (saldo de la cuenta de tarjeta, pasivo → negativo).
  const debtMatch = data.bodyText.match(/IMPORTE TOTAL A LIQUIDAR:?\s*([\d.,]+)\s*€/i)
  const debt = debtMatch ? parseAmount(debtMatch[1]) : 0
  const balance = Number.isFinite(debt) ? -Math.abs(debt) : 0

  const transactions = []
  for (const m of data.movements) {
    const date = parseDate(m.date)
    const amountAbs = parseAmount(m.amountAbbr)
    if (!date || !Number.isFinite(amountAbs)) continue
    // Compras → gasto (negativo); abonos vienen con abbr negativo → positivo.
    const amount = -amountAbs
    const external_id = m.ref ? `sabadell-${m.ref}` : `sabadell-${data.cardNumber}-${date}-${amountAbs}-${m.description}`
    // Añade la población sólo si parece un lugar real (tiene letras): el campo
    // "town" a veces trae un teléfono (p.ej. APPLE.COM/BILL → 900812703).
    const description = m.town && /[a-zA-Z]/.test(m.town) ? `${m.description} (${m.town})` : m.description
    transactions.push({ external_id, amount, description, transaction_date: date })
  }
  return { cardNumber: data.cardNumber, balance, transactions }
}

async function main() {
  if (CRON_MODE && !process.env.SABADELL_SKIP_MARKER && existsSync(infra.markerPath())) {
    infra.log('skip: ya hubo ejecución correcta hoy')
    return
  }
  if (!existsSync(USER_DATA_DIR)) {
    infra.die(1, 'No hay perfil. Ejecuta: pnpm scrape:sabadell-visa:login')
  }

  // Serializa con otros scrapers Sabadell que comparten el perfil de Chrome.
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

    const cards = []
    for (const last4 of TARGET_CARD_LAST4) {
      await gotoCardsList(page)
      await openCardMovements(page, last4)
      const card = await extractCard(page)
      const cardLast4 = card.cardNumber.slice(-4)
      cards.push({
        card_id: card.cardNumber,
        name: `Sabadell VISA •••• ${cardLast4}`,
        number: card.cardNumber,
        balance: card.balance,
        transactions: card.transactions,
      })
      infra.log(`tarjeta …${cardLast4}: saldo=${card.balance} EUR, movs=${card.transactions.length}`)
    }

    if (DRY_RUN) {
      infra.log('DRY_RUN — payload:')
      console.log(JSON.stringify({ last_synced_at: new Date().toISOString(), cards }, null, 2))
      return
    }

    const result = await infra.postToWebhook({ last_synced_at: new Date().toISOString(), cards })
    infra.log(`OK: ${JSON.stringify(result)}`)
    if (CRON_MODE) infra.writeMarker()
  } finally {
    await context.close()
    lock.release()
  }
}

main().catch(err => {
  console.error('[sabadell-scrape] error inesperado:', err)
  process.exit(4)
})
