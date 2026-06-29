#!/usr/bin/env node
// Sabadell VISA scraper — tarjetas de crédito (#147). Playwright HEADED (Sabadell
// bloquea headless vía WAF Akamai) con Chrome real + perfil persistente enrolado
// como dispositivo de confianza (sin OTP en logins posteriores).
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
import { existsSync, readdirSync, unlinkSync, closeSync, openSync, writeFileSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'

import {
  USER_DATA_DIR, SABADELL_LOGIN_URL, SABADELL_HOME_URL,
  CHROME_CHANNEL, CHROME_ARGS, STEALTH_INIT_SCRIPT, LOGIN_SELECTORS,
} from './config.mjs'
import { parseAmount, parseDate } from './parsers.mjs'

const CRON_MODE = process.env.SABADELL_CRON === '1'
const DRY_RUN = process.env.SABADELL_DRY_RUN === '1'
const DEBUG = process.env.SABADELL_DEBUG === '1'
const LOG_DIR = join(homedir(), 'Library/Logs/fin-app')
const MARKER_PREFIX = 'sabadell-visa-last-success.'
const NOTIFY_PREFIX = 'sabadell-visa-notified.'
const FAILURE_PREFIX = 'sabadell-visa-failure-'
const FAILURE_KEEP = 5

// Las 2 tarjetas de crédito a sincronizar, por sus últimos 4 dígitos (#147).
// Configurable por si cambian. Las de débito (5402…) se ignoran.
const TARGET_CARD_LAST4 = (process.env.SABADELL_CARDS || '4014,5011').split(',').map(s => s.trim())

function stamp() {
  const d = new Date()
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}
function markerPath() { return join(LOG_DIR, `${MARKER_PREFIX}${new Date().toISOString().slice(0, 10)}`) }
function notifyPath() { return join(LOG_DIR, `${NOTIFY_PREFIX}${new Date().toISOString().slice(0, 10)}`) }
function writeMarker() {
  mkdirSync(LOG_DIR, { recursive: true })
  closeSync(openSync(markerPath(), 'a'))
  for (const name of readdirSync(LOG_DIR)) {
    const staleSuccess = name.startsWith(MARKER_PREFIX) && join(LOG_DIR, name) !== markerPath()
    if (staleSuccess || name.startsWith(NOTIFY_PREFIX)) {
      try { unlinkSync(join(LOG_DIR, name)) } catch {}
    }
  }
}
// Best-effort: POST al webhook unificado de fallo de scraper (#177). El servidor
// persiste una notificación in-app (visible en la campana desde cualquier
// dispositivo) y firma el push al iPhone (las claves VAPID nunca salen de Vercel;
// aquí sólo el secreto compartido). Sustituye al antiguo /api/sabadell-visa/notify-error.
// Nunca debe romper el exit del script. La dedup ("un aviso por día") la garantiza
// el marker notifyPath() (a mayores, el servidor deduplica por 24 h).
async function notifyError(kind = 'session_expired') {
  try {
    const appUrl = process.env.APP_URL?.replace(/\/$/, '')
    const secret = process.env.SABADELL_VISA_WEBHOOK_SECRET
    if (!appUrl || !secret) {
      console.error('[sabadell-scrape] falta APP_URL/SABADELL_VISA_WEBHOOK_SECRET — sin aviso.')
      return
    }
    const res = await fetch(`${appUrl}/api/scrapers/notify`, {
      method: 'POST',
      headers: { authorization: `Bearer ${secret}`, 'content-type': 'application/json' },
      body: JSON.stringify({ source: 'sabadell_visa', kind }),
    })
    if (!res.ok) {
      console.error(`[sabadell-scrape] aviso in-app respondió ${res.status}`)
    } else {
      console.log('[sabadell-scrape] aviso in-app de sesión caducada enviado.')
    }
  } catch (err) {
    console.error(`[sabadell-scrape] aviso in-app falló (${err.message}).`)
  }
}

// Avisos de fallo de login (exit 2): notificación nativa de macOS + push al iPhone.
// Sólo se dispara bajo cron (CRON_MODE) desde login(); throttle 1/día vía el marker
// notifyPath(), que cubre ambos canales. Todo en try/catch: nunca debe romper el exit.
//
// Dos variantes (#212), claramente diferenciadas:
//   - session_expired: el banco pide OTP → el dispositivo no está enrolado, hay que
//     re-enrolar con scrape:sabadell-visa:login.
//   - login_failed: el login se rechazó tras varios intentos sin pedir 2FA → posible
//     bloqueo blando transitorio; no procede re-enrolar.
const NOTIFY_TEXT = {
  session_expired: {
    title: 'Sabadell VISA: sesión caducada',
    body: 'Ejecuta pnpm scrape:sabadell-visa:login para re-enrolar el dispositivo.',
  },
  login_failed: {
    title: 'Sabadell VISA: login fallido',
    body: 'El acceso fue rechazado varias veces (posible bloqueo temporal). Reintenta más tarde.',
  },
}
async function notifyExpired(kind = 'session_expired') {
  try {
    if (existsSync(notifyPath())) return
    const text = NOTIFY_TEXT[kind] ?? NOTIFY_TEXT.session_expired
    try {
      execFileSync('osascript', ['-e',
        `display notification ${JSON.stringify(text.body)} with title ${JSON.stringify(text.title)}`,
      ])
    } catch {}
    await notifyError(kind)
    mkdirSync(LOG_DIR, { recursive: true })
    closeSync(openSync(notifyPath(), 'a'))
  } catch {}
}
function rotateFailures() {
  try {
    for (const ext of ['.png', '.html']) {
      const files = readdirSync(LOG_DIR).filter(n => n.startsWith(FAILURE_PREFIX) && n.endsWith(ext)).sort()
      for (const name of files.slice(0, -FAILURE_KEEP)) { try { unlinkSync(join(LOG_DIR, name)) } catch {} }
    }
  } catch {}
}
async function dump(page, tag) {
  try {
    mkdirSync(LOG_DIR, { recursive: true })
    const base = join(LOG_DIR, `${FAILURE_PREFIX}${stamp()}-${tag}`)
    await page.screenshot({ fullPage: true, path: `${base}.png` })
    writeFileSync(`${base}.html`, await page.content())
    console.error(`[sabadell-scrape] dump: ${base}.{png,html}`)
    rotateFailures()
  } catch {}
}
function die(code, msg) {
  console.error(`[sabadell-scrape] ${msg}`)
  process.exit(code)
}
function requireEnv(name) {
  const v = process.env[name]
  if (!v) die(1, `Falta env var: ${name}`)
  return v
}

async function acceptCookies(page) {
  // El banner OneTrust tapa el formulario de login (campo DNI queda "hidden").
  const btn = page.locator('#onetrust-accept-btn-handler')
  if (await btn.isVisible().catch(() => false)) {
    await btn.click().catch(() => {})
    await page.waitForTimeout(500)
  }
}

// Número de intentos de login ante fallo transitorio (#212). Pequeño a propósito:
// el form lo construye formconstructor.js dinámicamente y puede haber una carrera
// que deja el PIN sin enviar; un par de reintentos absorbe ese glitch. NUNCA se
// reintenta ante OTP (reenviar credenciales dispararía SMS y un bloqueo real).
const LOGIN_MAX_ATTEMPTS = 3

// Rellena el form y lo envía una vez. Devuelve 'ok' | 'otp' | 'retry'.
// 'retry' = seguimos en el form de password (login no completado, transitorio).
async function attemptLogin(page, user, pass) {
  await page.goto(SABADELL_LOGIN_URL, { waitUntil: 'domcontentloaded' })
  await acceptCookies(page)

  const userInput = page.locator(LOGIN_SELECTORS.user).first()
  try {
    await userInput.waitFor({ state: 'visible', timeout: 15000 })
  } catch {
    // El campo no aparece: fallo estructural (front cambiado o banner de cookies),
    // no transitorio → no tiene sentido reintentar.
    await dump(page, 'login-no-field')
    die(4, 'No apareció el campo de DNI en el login (¿cambió el front o el banner de cookies?)')
  }
  await userInput.fill(user)

  // Verifica que el PIN quedó realmente escrito antes de enviar: el form dinámico
  // (formconstructor.js) a veces gana la carrera y deja #password vacío → el envío
  // se resetea y parece "credenciales incorrectas". Re-rellena si hace falta.
  const passInput = page.locator(LOGIN_SELECTORS.pass).first()
  await passInput.fill(pass)
  if (!(await passInput.inputValue().catch(() => ''))) {
    await page.waitForTimeout(500)
    await passInput.fill(pass)
  }

  await page.locator(LOGIN_SELECTORS.submit).first().click()
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {})

  if (await page.locator(LOGIN_SELECTORS.otp).first().isVisible().catch(() => false)) {
    return 'otp'
  }
  if (await page.locator(LOGIN_SELECTORS.pass).first().isVisible().catch(() => false)) {
    return 'retry'
  }
  return 'ok'
}

async function login(page) {
  const user = requireEnv('SABADELL_USER')
  const pass = requireEnv('SABADELL_PASS')

  for (let attempt = 1; attempt <= LOGIN_MAX_ATTEMPTS; attempt++) {
    const result = await attemptLogin(page, user, pass)

    if (result === 'ok') {
      if (DEBUG) await dump(page, 'after-login')
      return
    }

    if (result === 'otp') {
      // OTP visible: el dispositivo no está enrolado. Cortar de inmediato, NO
      // reintentar (evita reenviar credenciales y disparar SMS repetidos).
      await dump(page, 'login-otp')
      if (CRON_MODE) await notifyExpired('session_expired')
      die(2, 'Sabadell pide OTP: el dispositivo no está enrolado. Ejecuta pnpm scrape:sabadell-visa:login')
    }

    // result === 'retry': login no completado (transitorio). Reintentar si quedan.
    await dump(page, `login-failed-attempt-${attempt}`)
    console.error(`[sabadell-scrape] login no completado (intento ${attempt}/${LOGIN_MAX_ATTEMPTS})`)
    if (attempt < LOGIN_MAX_ATTEMPTS) await page.waitForTimeout(1500 * attempt)
  }

  // Agotados los intentos sin OTP: posible bloqueo blando, no sesión caducada.
  // Aviso DISTINTO al de 2FA/sesión caducada.
  if (CRON_MODE) await notifyExpired('login_failed')
  die(2, `Login no completado tras ${LOGIN_MAX_ATTEMPTS} intentos (posible bloqueo o credenciales incorrectas)`)
}

// Navega a la lista de tarjetas (#cardAccountTable) clicando el enlace del menú
// que apunta a TJMovementsQueryDebt.init.bs (deep-link directo bloqueado por WAF).
// Funciona tanto desde la posición global (tras login) como desde la página de
// movimientos de una tarjeta (ambas tienen ese enlace en el menú).
async function gotoCardsList(page) {
  // Reintentos: la navegación de vuelta (tras ver una tarjeta) es sensible a
  // timing en este webflow legacy. El fallo recurrente "no-cards-table" (#212)
  // viene de clicar el enlace sobre una página a medio cargar o sin el menú; el
  // remedio robusto es recargar la POSICIÓN GLOBAL (que siempre trae el enlace)
  // antes de reintentar, en vez de solo esperar.
  const MAX_ATTEMPTS = 4
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const link = page.locator('a[href*="TJMovementsQueryDebt.init.bs"]').first()
    if (!(await link.count().catch(() => 0))) {
      // El menú no está: recargar la posición global, que siempre lo trae.
      await page.goto(SABADELL_HOME_URL, { waitUntil: 'domcontentloaded' }).catch(() => {})
      await page.waitForTimeout(1000)
      continue
    }
    await link.click().catch(() => {})
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    try {
      await page.locator('#cardAccountTable').first().waitFor({ state: 'attached', timeout: 12000 })
      if (DEBUG) await dump(page, 'cards-list')
      return
    } catch {
      // Click hecho pero la tabla no apareció: vuelve a la posición global para
      // reintentar el clic desde un estado limpio.
      if (attempt < MAX_ATTEMPTS) {
        await page.goto(SABADELL_HOME_URL, { waitUntil: 'domcontentloaded' }).catch(() => {})
        await page.waitForTimeout(1000)
      }
    }
  }
  await dump(page, 'no-cards-table')
  die(4, 'No se encontró la tabla de tarjetas (#cardAccountTable)')
}

// Selecciona la tarjeta cuyo número contiene `last4` y abre sus movimientos.
async function openCardMovements(page, last4) {
  // Reintento corto (#212): el click de fila + "Aceptar" también es sensible al
  // timing del webflow legacy. Si la página de movimientos no carga, volvemos a la
  // lista de tarjetas y reintentamos una vez antes de morir.
  const MAX_ATTEMPTS = 2
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    // La fila de la tarjeta en #cardAccountTable muestra el número enmascarado.
    const row = page.locator(`#cardAccountTable tr`, { hasText: last4 }).first()
    if (!(await row.isVisible().catch(() => false))) {
      if (attempt < MAX_ATTEMPTS) { await gotoCardsList(page); continue }
      await dump(page, `card-${last4}-no-row`)
      die(4, `No se encontró la fila de la tarjeta …${last4} en la lista`)
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
      if (DEBUG) await dump(page, `card-${last4}-movements`)
      return
    }
    // No cargaron: reintentar desde la lista de tarjetas.
    if (attempt < MAX_ATTEMPTS) { await gotoCardsList(page); continue }
    await dump(page, `card-${last4}-no-movements`)
    die(4, `No cargaron los movimientos de la tarjeta …${last4}`)
  }
}

// Extrae number, saldo y movimientos confirmados de la página de movimientos.
async function extractCard(page) {
  const data = await page.evaluate(() => {
    const clean = s => (s || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim()
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

async function postToWebhook(cards) {
  const appUrl = requireEnv('APP_URL').replace(/\/$/, '')
  const secret = requireEnv('SABADELL_VISA_WEBHOOK_SECRET')
  const body = JSON.stringify({ last_synced_at: new Date().toISOString(), cards })
  const res = await fetch(`${appUrl}/api/sabadell-visa`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${secret}` },
    body,
  })
  if (res.status !== 200) {
    const text = await res.text().catch(() => '')
    die(3, `Webhook respondió ${res.status}: ${text}`)
  }
  return res.json()
}

async function main() {
  if (CRON_MODE && !process.env.SABADELL_SKIP_MARKER && existsSync(markerPath())) {
    console.log('[sabadell-scrape] skip: ya hubo ejecución correcta hoy')
    return
  }
  if (!existsSync(USER_DATA_DIR)) {
    die(1, 'No hay perfil. Ejecuta: pnpm scrape:sabadell-visa:login')
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

    await login(page)

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
      console.log(`[sabadell-scrape] tarjeta …${cardLast4}: saldo=${card.balance} EUR, movs=${card.transactions.length}`)
    }

    if (DRY_RUN) {
      console.log('[sabadell-scrape] DRY_RUN — payload:')
      console.log(JSON.stringify({ last_synced_at: new Date().toISOString(), cards }, null, 2))
      return
    }

    const result = await postToWebhook(cards)
    console.log(`[sabadell-scrape] OK: ${JSON.stringify(result)}`)
    if (CRON_MODE) writeMarker()
  } finally {
    await context.close()
  }
}

main().catch(err => {
  console.error('[sabadell-scrape] error inesperado:', err)
  process.exit(4)
})
