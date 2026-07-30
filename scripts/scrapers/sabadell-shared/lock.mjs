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
//
// El fichero de lock NO basta por sí solo (#401): `await context.close()` resuelve
// cuando Playwright cierra su conexión, no cuando el proceso de Chrome real suelta
// el perfil. Eso abría una ventana con el lock libre y Chrome todavía vivo; el
// siguiente scraper lanzaba Chrome sobre el mismo --user-data-dir, Chrome veía la
// instancia viva ("Se está abriendo en una sesión de navegador existente"), le
// reenviaba la línea de comandos y salía con código 0, dejando a Playwright sin
// tubería de depuración. Por eso el lock se sincroniza además con el DUEÑO REAL del
// perfil, que es el `SingletonLock` que Chrome mantiene dentro de USER_DATA_DIR.

import { openSync, closeSync, writeFileSync, unlinkSync, statSync, mkdirSync, readlinkSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { LOG_DIR } from './infra.mjs'
import { USER_DATA_DIR } from './config.mjs'

const DEFAULT_LOCK_PATH = join(LOG_DIR, 'sabadell-profile.lock')

// Un run normal dura pocos minutos; pasado este umbral el lock se considera
// huérfano (el proceso que lo tomó murió sin liberarlo) y se puede robar.
const DEFAULT_STALE_MS = 10 * 60 * 1000

// Margen para que Chrome termine de salir tras `context.close()`. Si lo agota, se
// libera igualmente: quien venga detrás esperará en `acquire` y se saltará su
// ejecución limpiamente, que es mejor degradación que dejar el lock puesto.
const DEFAULT_DRAIN_MS = 60_000

// Chrome escribe aquí un symlink a `<host>-<pid>` mientras tiene el perfil abierto
// y lo borra al salir. El destino NO existe como fichero (el symlink es sólo un
// contenedor de datos), así que hay que leerlo con `readlink`: `existsSync` lo
// sigue y devolvería false siempre.
const SINGLETON_FILE = 'SingletonLock'

export function createProfileLock(lockPath = DEFAULT_LOCK_PATH, {
  staleMs = DEFAULT_STALE_MS,
  userDataDir = USER_DATA_DIR,
  drainMs = DEFAULT_DRAIN_MS,
} = {}) {
  const singletonPath = join(userDataDir, SINGLETON_FILE)
  let held = false

  // Pid del Chrome que tiene abierto el perfil, o null si está libre. Un singleton
  // cuyo pid ya no vive es basura de un Chrome que murió mal: no debe bloquear a
  // nadie (Chrome mismo lo roba al arrancar).
  function profileHolderPid() {
    let target
    try {
      target = readlinkSync(singletonPath)
    } catch {
      return null // no hay singleton (o no es un symlink): perfil libre
    }
    // El host puede llevar guiones, así que el pid es lo que hay tras el último.
    const pid = Number(target.slice(target.lastIndexOf('-') + 1))
    if (!Number.isInteger(pid) || pid <= 0) return null // formato inesperado: no bloquear
    try {
      process.kill(pid, 0)
      return pid
    } catch (err) {
      // ESRCH: el proceso ya no existe. EPERM: vivo, pero de otro usuario.
      return err.code === 'EPERM' ? pid : null
    }
  }

  // Espera a que nadie tenga abierto el perfil. Devuelve true si quedó libre.
  async function waitForProfileFree({ waitMs = drainMs, pollMs = 500 } = {}) {
    const deadline = Date.now() + waitMs
    for (;;) {
      if (profileHolderPid() === null) return true
      if (Date.now() >= deadline) return false
      await new Promise(r => setTimeout(r, pollMs))
    }
  }

  // Borrado síncrono, apto para el hook de 'exit' (allí no corren promesas).
  function releaseSync() {
    if (!held) return
    held = false
    process.off('exit', releaseSync)
    try { unlinkSync(lockPath) } catch {}
  }

  // Intenta adquirir el lock, esperando hasta `waitMs` (sondeando cada `pollMs`).
  // Devuelve true si lo consigue, false si expira el plazo con el perfil ocupado.
  // Un true garantiza las dos cosas: exclusión entre scrapers Y perfil sin Chrome
  // vivo encima, que es lo que necesita `launchPersistentContext`.
  async function acquire({ waitMs = 90_000, pollMs = 3_000 } = {}) {
    mkdirSync(dirname(lockPath), { recursive: true })
    const deadline = Date.now() + waitMs
    for (;;) {
      try {
        const fd = openSync(lockPath, 'wx') // atómico: EEXIST si ya existe
        writeFileSync(fd, `${process.pid} ${new Date().toISOString()}\n`)
        closeSync(fd)
        held = true
        // `die`/`failScrape` salen con `process.exit()` desde dentro del try, y eso
        // NO ejecuta el `finally` que libera el lock (#401): sin este hook el
        // fichero se quedaba puesto hasta caducar por antigüedad.
        process.once('exit', releaseSync)
        break
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
    // Con el fichero en la mano, falta que el Chrome anterior haya soltado el
    // perfil de verdad. Se reaprovecha el plazo restante del acquire.
    if (await waitForProfileFree({ waitMs: Math.max(deadline - Date.now(), 0) })) return true
    releaseSync()
    return false
  }

  // Libera el lock. Espera antes a que Chrome suelte el perfil para no dejar
  // entrar al siguiente scraper mientras el nuestro sigue agonizando (#401).
  async function release() {
    if (!held) return
    await waitForProfileFree()
    releaseSync()
  }

  return { acquire, release, waitForProfileFree, profileHolderPid, lockPath, singletonPath }
}
