import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, existsSync, writeFileSync, utimesSync, symlinkSync, unlinkSync, mkdirSync } from 'node:fs'
import { tmpdir, hostname } from 'node:os'
import { join } from 'node:path'
import { createProfileLock } from './lock.mjs'

// Pid inexistente: por encima del máximo de macOS/Linux, así `kill(pid, 0)` da
// siempre ESRCH sin riesgo de acertarle a un proceso real.
const DEAD_PID = 4_194_305

describe('createProfileLock', () => {
  let dir
  let lockPath
  let userDataDir
  let singletonPath

  // Simula el symlink que Chrome mantiene mientras tiene el perfil abierto.
  const holdProfile = (pid = process.pid) => symlinkSync(`${hostname()}-${pid}`, singletonPath)

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'sabadell-lock-'))
    lockPath = join(dir, 'profile.lock')
    userDataDir = join(dir, '.userdata')
    singletonPath = join(userDataDir, 'SingletonLock')
    mkdirSync(userDataDir)
  })
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  // Cada lock apunta a un perfil de usar y tirar: sin esto los tests leerían el
  // SingletonLock del perfil real del repo.
  const makeLock = (opts = {}) => createProfileLock(lockPath, { userDataDir, drainMs: 300, ...opts })

  it('adquiere el lock cuando está libre y crea el fichero', async () => {
    const lock = makeLock()
    expect(await lock.acquire()).toBe(true)
    expect(existsSync(lockPath)).toBe(true)
  })

  it('release elimina el fichero de lock', async () => {
    const lock = makeLock()
    await lock.acquire()
    await lock.release()
    expect(existsSync(lockPath)).toBe(false)
  })

  it('no adquiere si otro proceso lo tiene (expira el plazo)', async () => {
    const holder = makeLock()
    await holder.acquire()
    const contender = makeLock()
    const start = Date.now()
    // Plazo corto: debe expirar y devolver false sin bloquear el test.
    const got = await contender.acquire({ waitMs: 150, pollMs: 50 })
    expect(got).toBe(false)
    expect(Date.now() - start).toBeGreaterThanOrEqual(140)
  })

  it('roba un lock obsoleto (más viejo que staleMs)', async () => {
    // Simula un lock huérfano: fichero antiguo dejado por un proceso muerto.
    writeFileSync(lockPath, '999 old\n')
    const oldTime = new Date(Date.now() - 60_000) // 1 min atrás
    utimesSync(lockPath, oldTime, oldTime)

    const lock = makeLock({ staleMs: 1_000 })
    expect(await lock.acquire({ waitMs: 1_000, pollMs: 50 })).toBe(true)
  })

  it('un segundo acquire tras release vuelve a conseguirlo', async () => {
    const a = makeLock()
    await a.acquire()
    await a.release()
    const b = makeLock()
    expect(await b.acquire({ waitMs: 500, pollMs: 50 })).toBe(true)
  })

  describe('dueño real del perfil (SingletonLock de Chrome)', () => {
    it('sin SingletonLock el perfil está libre', () => {
      expect(makeLock().profileHolderPid()).toBeNull()
    })

    it('detecta al Chrome vivo que tiene el perfil abierto', () => {
      holdProfile()
      expect(makeLock().profileHolderPid()).toBe(process.pid)
    })

    it('ignora un SingletonLock huérfano (pid muerto)', () => {
      holdProfile(DEAD_PID)
      expect(makeLock().profileHolderPid()).toBeNull()
    })

    it('no bloquea si el destino del symlink no tiene el formato esperado', () => {
      symlinkSync('basura-sin-pid', singletonPath)
      expect(makeLock().profileHolderPid()).toBeNull()
    })

    // El fallo de #401: el fichero de lock estaba libre pero el Chrome anterior
    // seguía vivo, y lanzar sobre ese perfil rompía launchPersistentContext.
    it('no adquiere mientras Chrome siga teniendo el perfil, y suelta el fichero', async () => {
      holdProfile()
      const lock = makeLock()
      expect(await lock.acquire({ waitMs: 200, pollMs: 50 })).toBe(false)
      expect(existsSync(lockPath)).toBe(false)
    })

    it('adquiere en cuanto Chrome suelta el perfil', async () => {
      holdProfile()
      setTimeout(() => unlinkSync(singletonPath), 100)
      const lock = makeLock()
      expect(await lock.acquire({ waitMs: 3_000, pollMs: 50 })).toBe(true)
    })

    it('release espera a que Chrome suelte el perfil antes de abrir la puerta', async () => {
      const lock = makeLock()
      await lock.acquire()
      holdProfile()
      setTimeout(() => unlinkSync(singletonPath), 150)

      const start = Date.now()
      await lock.release()
      expect(Date.now() - start).toBeGreaterThanOrEqual(140)
      expect(existsSync(lockPath)).toBe(false)
    })

    it('si Chrome no se va a tiempo, libera igualmente (el siguiente ya esperará)', async () => {
      const lock = makeLock({ drainMs: 200 })
      await lock.acquire()
      holdProfile() // nunca se suelta

      await lock.release()
      expect(existsSync(lockPath)).toBe(false)
    })
  })
})
