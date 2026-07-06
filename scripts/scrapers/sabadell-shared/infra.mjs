// Infraestructura común de los scrapers Sabadell: markers de "éxito diario",
// avisos de fallo (notificación macOS + webhook in-app), volcados de diagnóstico,
// y POST al webhook de datos. Todo se parametriza por el DESCRIPTOR del scraper
// (ver sabadell-visa/descriptor.mjs) para que un scraper nuevo sólo aporte su
// identidad, no vuelva a copiar esta fontanería.

import { existsSync, readdirSync, unlinkSync, closeSync, openSync, writeFileSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'

export const LOG_DIR = join(homedir(), 'Library/Logs/fin-app')

// Marca de tiempo para nombres de fichero de volcado (YYYY-MM-DD_HHMMSS).
export function stamp() {
  const d = new Date()
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}

// Cuántos pares de volcado (.png/.html) de fallo se conservan por scraper.
const FAILURE_KEEP = 5

// Crea el conjunto de helpers de infraestructura ligados a un scraper concreto.
// El descriptor define la identidad; de `name` se derivan los prefijos de los
// ficheros de estado en LOG_DIR (idénticos a los que ya usa sabadell-visa).
// `cronMode` (segundo arg) habilita los avisos de fallo de scraping/webhook desde
// `failScrape`; en ejecuciones manuales queda en false y no notifica (#295).
export function createScraperInfra(descriptor, { cronMode = false } = {}) {
  const { name, logPrefix, notifySource, secretEnv, webhookPath, notifyText } = descriptor

  const MARKER_PREFIX = `${name}-last-success.`
  const NOTIFY_PREFIX = `${name}-notified.`
  const FAILURE_PREFIX = `${name}-failure-`

  const today = () => new Date().toISOString().slice(0, 10)
  const markerPath = () => join(LOG_DIR, `${MARKER_PREFIX}${today()}`)
  const notifyPath = () => join(LOG_DIR, `${NOTIFY_PREFIX}${today()}`)

  const log = msg => console.log(`[${logPrefix}] ${msg}`)
  const logError = msg => console.error(`[${logPrefix}] ${msg}`)

  // Marca "éxito de hoy" y limpia markers de éxito anteriores y los de aviso
  // (que dejan de tener sentido tras un éxito).
  function writeMarker() {
    mkdirSync(LOG_DIR, { recursive: true })
    closeSync(openSync(markerPath(), 'a'))
    for (const n of readdirSync(LOG_DIR)) {
      const staleSuccess = n.startsWith(MARKER_PREFIX) && join(LOG_DIR, n) !== markerPath()
      if (staleSuccess || n.startsWith(NOTIFY_PREFIX)) {
        try { unlinkSync(join(LOG_DIR, n)) } catch {}
      }
    }
  }

  // Best-effort: POST al webhook unificado de fallo de scraper (#177). El servidor
  // persiste una notificación in-app (visible en la campana desde cualquier
  // dispositivo) y firma el push al iPhone (las claves VAPID nunca salen de Vercel;
  // aquí sólo el secreto compartido). Nunca debe romper el exit del script.
  async function notifyError(kind = 'session_expired') {
    try {
      const appUrl = process.env.APP_URL?.replace(/\/$/, '')
      const secret = process.env[secretEnv]
      if (!appUrl || !secret) {
        logError(`falta APP_URL/${secretEnv} — sin aviso.`)
        return
      }
      const res = await fetch(`${appUrl}/api/scrapers/notify`, {
        method: 'POST',
        headers: { authorization: `Bearer ${secret}`, 'content-type': 'application/json' },
        body: JSON.stringify({ source: notifySource, kind }),
      })
      if (!res.ok) logError(`aviso in-app respondió ${res.status}`)
      else log('aviso in-app enviado.')
    } catch (err) {
      logError(`aviso in-app falló (${err.message}).`)
    }
  }

  // Aviso de fallo de login (notificación nativa de macOS + push al iPhone).
  // Throttle 1/día vía el marker notifyPath(), que cubre ambos canales. Todo en
  // try/catch: nunca debe romper el exit. `kind` selecciona el texto (#212):
  // session_expired (re-enrolar) vs login_failed (posible bloqueo transitorio).
  async function notifyExpired(kind = 'session_expired') {
    try {
      if (existsSync(notifyPath())) return
      const text = notifyText[kind] ?? notifyText.session_expired
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
        for (const n of files.slice(0, -FAILURE_KEEP)) { try { unlinkSync(join(LOG_DIR, n)) } catch {} }
      }
    } catch {}
  }

  async function dump(page, tag) {
    try {
      mkdirSync(LOG_DIR, { recursive: true })
      const base = join(LOG_DIR, `${FAILURE_PREFIX}${stamp()}-${tag}`)
      await page.screenshot({ fullPage: true, path: `${base}.png` })
      writeFileSync(`${base}.html`, await page.content())
      logError(`dump: ${base}.{png,html}`)
      rotateFailures()
    } catch {}
  }

  function die(code, msg) {
    logError(msg)
    process.exit(code)
  }

  // Fallo de scraping (exit 4) o de webhook (exit 3): notifica bajo cron (macOS +
  // in-app + push, reutilizando notifyExpired con su dedup 1/día y su try/catch) y
  // luego sale con `code`. `notifyExpired` es best-effort y nunca lanza, así que el
  // exit se preserva siempre (#295). Sin cron no notifica (ejecución manual).
  async function failScrape(code, msg) {
    if (cronMode) await notifyExpired('scrape_failed')
    die(code, msg)
  }

  function requireEnv(envName) {
    const v = process.env[envName]
    if (!v) die(1, `Falta env var: ${envName}`)
    return v
  }

  // POST al webhook de datos del scraper. `body` es el objeto completo del payload
  // (cada scraper arma su forma: { cards } o { account }).
  async function postToWebhook(body) {
    const appUrl = requireEnv('APP_URL').replace(/\/$/, '')
    const secret = requireEnv(secretEnv)
    const res = await fetch(`${appUrl}${webhookPath}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${secret}` },
      body: JSON.stringify(body),
    })
    if (res.status !== 200) {
      const text = await res.text().catch(() => '')
      await failScrape(3, `Webhook respondió ${res.status}: ${text}`)
    }
    return res.json()
  }

  return {
    markerPath, notifyPath, writeMarker, notifyError, notifyExpired,
    rotateFailures, dump, die, failScrape, requireEnv, postToWebhook, log, logError,
    MARKER_PREFIX, NOTIFY_PREFIX, FAILURE_PREFIX,
  }
}
