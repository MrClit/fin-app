// Lock del perfil de Chrome compartido por los scrapers de Sabadell.
//
// Todos los scrapers Sabadell usan el MISMO perfil persistente (USER_DATA_DIR):
// lanzar dos `launchPersistentContext` concurrentes sobre él revienta con el lock
// interno de Chrome ("profile in use"). El horario launchd está escalonado, pero
// este lock es la red de seguridad si dos runs se solapan (uno lento + el cron
// del siguiente): el segundo espera y, si no consigue el perfil a tiempo, se salta
// esa ejecución (launchd reintenta en la siguiente ventana).
//
// Primitiva: creación atómica de fichero (`openSync` con flag 'wx', que falla si
// existe). Detecta locks obsoletos (proceso muerto/colgado) por antigüedad.

import { openSync, closeSync, writeFileSync, unlinkSync, statSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { LOG_DIR } from './infra.mjs'

const DEFAULT_LOCK_PATH = join(LOG_DIR, 'sabadell-profile.lock')

// Un run normal dura pocos minutos; pasado este umbral el lock se considera
// huérfano (el proceso que lo tomó murió sin liberarlo) y se puede robar.
const DEFAULT_STALE_MS = 10 * 60 * 1000

export function createProfileLock(lockPath = DEFAULT_LOCK_PATH, { staleMs = DEFAULT_STALE_MS } = {}) {
  // Intenta adquirir el lock, esperando hasta `waitMs` (sondeando cada `pollMs`).
  // Devuelve true si lo consigue, false si expira el plazo con el perfil ocupado.
  async function acquire({ waitMs = 90_000, pollMs = 3_000 } = {}) {
    mkdirSync(dirname(lockPath), { recursive: true })
    const deadline = Date.now() + waitMs
    for (;;) {
      try {
        const fd = openSync(lockPath, 'wx') // atómico: EEXIST si ya existe
        writeFileSync(fd, `${process.pid} ${new Date().toISOString()}\n`)
        closeSync(fd)
        return true
      } catch (err) {
        if (err.code !== 'EEXIST') throw err
        // Ocupado: ¿lock obsoleto de un proceso que murió sin liberar?
        try {
          const st = statSync(lockPath)
          if (Date.now() - st.mtimeMs > staleMs) { unlinkSync(lockPath); continue }
        } catch {
          // El lock desapareció entre el openSync y el statSync: reintentar ya.
          continue
        }
        if (Date.now() >= deadline) return false
        await new Promise(r => setTimeout(r, pollMs))
      }
    }
  }

  function release() {
    try { unlinkSync(lockPath) } catch {}
  }

  return { acquire, release, lockPath }
}
