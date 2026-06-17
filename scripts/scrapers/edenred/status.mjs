#!/usr/bin/env node
// Estado del cron de Edenred — resumen del último éxito, últimos logs y
// estado del agente launchd. Uso: pnpm cron:edenred:status

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'

const LOG_DIR = join(homedir(), 'Library/Logs/fin-app')
const OUT_LOG = join(LOG_DIR, 'edenred-scraper.out.log')
const ERR_LOG = join(LOG_DIR, 'edenred-scraper.err.log')
const MARKER_PREFIX = 'edenred-last-success.'
const FAILURE_PREFIX = 'edenred-failure-'
// Markers del auto-relogin (mismos literales que en auth.mjs).
const RELOGIN_MARKER = 'edenred-last-relogin'
const TWO_FA_PENDING_MARKER = 'edenred-2fa-pending'
const AGENT_LABEL = 'com.fin-app.edenred-scraper'

const fmtDate = (d) =>
  d.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'medium' })

const ageSince = (d) => {
  const ms = Date.now() - d.getTime()
  const m = Math.floor(ms / 60000)
  if (m < 60) return `hace ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `hace ${h} h ${m % 60} min`
  return `hace ${Math.floor(h / 24)} d ${h % 24} h`
}

function lastMarker() {
  if (!existsSync(LOG_DIR)) return null
  const markers = readdirSync(LOG_DIR)
    .filter((n) => n.startsWith(MARKER_PREFIX))
    .sort()
  if (markers.length === 0) return null
  const name = markers[markers.length - 1]
  const path = join(LOG_DIR, name)
  return {
    date: name.slice(MARKER_PREFIX.length),
    mtime: statSync(path).mtime,
  }
}

// Último auto-relogin exitoso: el marker guarda un timestamp ISO como
// contenido; si no parsea, caemos a la mtime del fichero.
function lastRelogin() {
  const path = join(LOG_DIR, RELOGIN_MARKER)
  if (!existsSync(path)) return null
  const raw = readFileSync(path, 'utf8').trim()
  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? statSync(path).mtime : parsed
}

// Marker persistente de "2FA pendiente": mientras existe, el auto-relogin no
// reintenta y hace falta `pnpm scrape:edenred:login`.
function twoFaPending() {
  const path = join(LOG_DIR, TWO_FA_PENDING_MARKER)
  return existsSync(path) ? statSync(path).mtime : null
}

function lastFailureDump() {
  if (!existsSync(LOG_DIR)) return null
  const dumps = readdirSync(LOG_DIR)
    .filter((n) => n.startsWith(FAILURE_PREFIX) && n.endsWith('.png'))
    .sort()
  if (dumps.length === 0) return null
  const name = dumps[dumps.length - 1]
  return { name, mtime: statSync(join(LOG_DIR, name)).mtime }
}

function logSummary(path) {
  if (!existsSync(path)) return { exists: false }
  const s = statSync(path)
  const tail = readFileSync(path, 'utf8').trimEnd().split('\n').slice(-8)
  return { exists: true, size: s.size, mtime: s.mtime, tail }
}

function launchctlInfo() {
  try {
    const out = execFileSync('launchctl', ['list', AGENT_LABEL], {
      encoding: 'utf8',
    })
    const pickInt = (re) => {
      const m = out.match(re)
      return m ? Number.parseInt(m[1], 10) : null
    }
    return {
      loaded: true,
      pid: pickInt(/"PID"\s*=\s*(\d+);/),
      lastExitStatus: pickInt(/"LastExitStatus"\s*=\s*(-?\d+);/),
    }
  } catch {
    return { loaded: false }
  }
}

console.log(`Cron Edenred — ${AGENT_LABEL}\n`)

const agent = launchctlInfo()
if (!agent.loaded) {
  console.log('Agente: NO cargado en launchd')
} else {
  console.log(
    `Agente: cargado` +
      (agent.pid ? ` (corriendo, pid=${agent.pid})` : '') +
      (agent.lastExitStatus != null
        ? ` · último exit=${agent.lastExitStatus}`
        : ''),
  )
}

const marker = lastMarker()
if (!marker) {
  console.log('\nÚltimo éxito: (sin marker)')
} else {
  console.log(
    `\nÚltimo éxito: ${marker.date} · ${fmtDate(marker.mtime)} (${ageSince(marker.mtime)})`,
  )
}

const relogin = lastRelogin()
if (relogin) {
  console.log(
    `\nÚltimo auto-relogin: ${fmtDate(relogin)} (${ageSince(relogin)})`,
  )
}

const pending2fa = twoFaPending()
if (pending2fa) {
  console.log(
    `\n⚠ 2FA pendiente desde ${fmtDate(pending2fa)} (${ageSince(pending2fa)})` +
      ` — el auto-relogin está suspendido. Ejecuta: pnpm scrape:edenred:login`,
  )
}

const out = logSummary(OUT_LOG)
console.log(`\nstdout (${OUT_LOG})`)
if (!out.exists) {
  console.log('  (no existe)')
} else {
  console.log(`  ${fmtDate(out.mtime)} · ${out.size} B`)
  for (const line of out.tail) console.log(`  | ${line}`)
}

const err = logSummary(ERR_LOG)
console.log(`\nstderr (${ERR_LOG})`)
if (!err.exists) {
  console.log('  (no existe)')
} else if (err.size === 0) {
  console.log(`  ${fmtDate(err.mtime)} · vacío`)
} else {
  console.log(`  ${fmtDate(err.mtime)} · ${err.size} B`)
  for (const line of err.tail) console.log(`  | ${line}`)
}

const dump = lastFailureDump()
if (!dump) {
  console.log('\nÚltimo dump de fallo: (ninguno)')
} else {
  console.log(
    `\nÚltimo dump de fallo: ${join(LOG_DIR, dump.name)} · ${fmtDate(dump.mtime)} (${ageSince(dump.mtime)})`,
  )
}
