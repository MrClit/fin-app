import { describe, expect, it, vi, beforeEach } from 'vitest'

// Mock del service client: capturamos los argumentos del insert para inspeccionarlos.
const insert = vi.fn()

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    from: () => ({ insert }),
  }),
}))

import { logError } from './error-log'

beforeEach(() => {
  insert.mockReset()
  insert.mockResolvedValue({ error: null })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('logError', () => {
  it('mapea los campos y convierte ausentes en null', async () => {
    await logError({ source: 'server', message: 'boom' })

    expect(insert).toHaveBeenCalledTimes(1)
    expect(insert).toHaveBeenCalledWith({
      source: 'server',
      message: 'boom',
      stack: null,
      route: null,
      context: null,
      user_id: null,
      household_id: null,
    })
  })

  it('propaga todos los campos cuando están presentes', async () => {
    await logError({
      source: 'client',
      message: 'boom',
      stack: 'at foo',
      route: '/api/x',
      context: { op: 'insert' },
      userId: 'u1',
      householdId: 'h1',
    })

    expect(insert).toHaveBeenCalledWith({
      source: 'client',
      message: 'boom',
      stack: 'at foo',
      route: '/api/x',
      context: { op: 'insert' },
      user_id: 'u1',
      household_id: 'h1',
    })
  })

  it('trunca mensajes y stacks demasiado largos', async () => {
    await logError({
      source: 'server',
      message: 'm'.repeat(5_000),
      stack: 's'.repeat(20_000),
    })

    const arg = insert.mock.calls[0][0]
    expect(arg.message.length).toBe(2_000)
    expect(arg.stack.length).toBe(8_000)
  })

  it('nunca lanza aunque el insert rechace', async () => {
    insert.mockRejectedValue(new Error('db down'))
    await expect(
      logError({ source: 'server', message: 'boom' })
    ).resolves.toBeUndefined()
  })

  it('nunca lanza aunque el insert devuelva error', async () => {
    insert.mockResolvedValue({ error: { message: 'rls' } })
    await expect(
      logError({ source: 'server', message: 'boom' })
    ).resolves.toBeUndefined()
  })
})
