import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createClient } from '@/lib/supabase/server'
import { logError } from '@/lib/error-log'
import { __resetRateLimit } from '@/lib/http/rate-limit'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/household', () => ({ getHouseholdId: vi.fn() }))
vi.mock('@/lib/error-log', () => ({ logError: vi.fn() }))

const { POST } = await import('./route')

type CallOpts = { headers?: Record<string, string>; rawBody?: string }

function callRoute(body: unknown, opts: CallOpts = {}) {
  return POST(
    new Request('http://test/api/error-log', {
      method: 'POST',
      headers: opts.headers ?? {},
      body: opts.rawBody ?? JSON.stringify(body),
      // @ts-expect-error NextRequest extiende Request; el handler sólo usa
      // headers/text, así que un Request plano es suficiente.
    })
  )
}

beforeEach(() => {
  __resetRateLimit()
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: null } }) },
  } as unknown as Awaited<ReturnType<typeof createClient>>)
  vi.mocked(logError).mockResolvedValue(undefined)
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/error-log — rate-limit', () => {
  it('devuelve 429 con Retry-After al superar el límite por IP', async () => {
    const headers = { 'x-real-ip': '203.0.113.7' }
    // El límite por defecto es 20/min: las 20 primeras pasan, la 21ª se bloquea.
    for (let i = 0; i < 20; i++) {
      const res = await callRoute({ message: 'boom' }, { headers })
      expect(res.status).toBe(200)
    }
    const blocked = await callRoute({ message: 'boom' }, { headers })
    expect(blocked.status).toBe(429)
    expect(blocked.headers.get('Retry-After')).toBeTruthy()
    expect(await blocked.json()).toEqual({ error: 'Too many requests' })
  })
})

describe('POST /api/error-log — límite de body', () => {
  it('devuelve 413 si content-length supera el máximo', async () => {
    const res = await callRoute(
      { message: 'boom' },
      { headers: { 'content-length': '999999' } }
    )
    expect(res.status).toBe(413)
    expect(await res.json()).toEqual({ error: 'Payload too large' })
  })

  it('devuelve 413 si el body real supera el máximo (content-length mentido)', async () => {
    const huge = JSON.stringify({ message: 'x'.repeat(40_000) })
    const res = await callRoute(null, {
      rawBody: huge,
      headers: { 'content-length': '10' },
    })
    expect(res.status).toBe(413)
    expect(await res.json()).toEqual({ error: 'Payload too large' })
  })
})

describe('POST /api/error-log — validación', () => {
  it('devuelve 400 con JSON inválido', async () => {
    const res = await callRoute(null, { rawBody: 'not-json{' })
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Invalid JSON' })
  })

  it('devuelve 400 si falta message', async () => {
    const res = await callRoute({ stack: 'at foo' })
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Missing message' })
  })
})

describe('POST /api/error-log — happy path', () => {
  it('registra el error y devuelve 200 sin sesión', async () => {
    const res = await callRoute({
      message: 'boom',
      stack: 'at foo',
      route: '/x',
      context: { digest: 'abc' },
    })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(logError).toHaveBeenCalledTimes(1)
    expect(logError).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'client',
        message: 'boom',
        stack: 'at foo',
        route: '/x',
        context: { digest: 'abc' },
        userId: null,
        householdId: null,
      })
    )
  })
})
