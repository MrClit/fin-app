import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, existsSync, writeFileSync, utimesSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createProfileLock } from './lock.mjs'

describe('createProfileLock', () => {
  let dir
  let lockPath

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'sabadell-lock-'))
    lockPath = join(dir, 'profile.lock')
  })
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('adquiere el lock cuando está libre y crea el fichero', async () => {
    const lock = createProfileLock(lockPath)
    expect(await lock.acquire()).toBe(true)
    expect(existsSync(lockPath)).toBe(true)
  })

  it('release elimina el fichero de lock', async () => {
    const lock = createProfileLock(lockPath)
    await lock.acquire()
    lock.release()
    expect(existsSync(lockPath)).toBe(false)
  })

  it('no adquiere si otro proceso lo tiene (expira el plazo)', async () => {
    const holder = createProfileLock(lockPath)
    await holder.acquire()
    const contender = createProfileLock(lockPath)
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

    const lock = createProfileLock(lockPath, { staleMs: 1_000 })
    expect(await lock.acquire({ waitMs: 1_000, pollMs: 50 })).toBe(true)
  })

  it('un segundo acquire tras release vuelve a conseguirlo', async () => {
    const a = createProfileLock(lockPath)
    await a.acquire()
    a.release()
    const b = createProfileLock(lockPath)
    expect(await b.acquire({ waitMs: 500, pollMs: 50 })).toBe(true)
  })
})
