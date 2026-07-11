import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, getCurrentHouseholdId, getRequestClient } from '@/lib/auth/session'
import { logError } from '@/lib/error-log'

vi.mock('@/lib/auth/session', () => ({
  getCurrentUser: vi.fn(),
  getCurrentHouseholdId: vi.fn(),
  getRequestClient: vi.fn(),
}))

vi.mock('@/lib/error-log', () => ({
  logError: vi.fn(async () => {}),
}))

const { withAuth, withUser, unwrap, RouteError } = await import('./with-auth')

const USER = { id: 'user-1' }
const HOUSEHOLD_ID = 'household-1'
const SUPABASE = { from: vi.fn() }

type Session = {
  user?: { id: string } | null
  householdId?: string | null
}

function mockSession({ user = USER, householdId = HOUSEHOLD_ID }: Session = {}) {
  vi.mocked(getCurrentUser).mockResolvedValue(
    user as unknown as Awaited<ReturnType<typeof getCurrentUser>>
  )
  vi.mocked(getCurrentHouseholdId).mockResolvedValue(householdId)
  vi.mocked(getRequestClient).mockResolvedValue(
    SUPABASE as unknown as Awaited<ReturnType<typeof getRequestClient>>
  )
}

function req(url = 'http://test/api/thing', init?: RequestInit) {
  return new NextRequest(url, init)
}

const ok = async () => NextResponse.json({ ok: true })

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('withAuth — autenticación', () => {
  it('devuelve 401 y no invoca el handler si no hay sesión', async () => {
    mockSession({ user: null })
    const handler = vi.fn(ok)

    const res = await withAuth('/api/thing', handler)(req())

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Unauthorized' })
    expect(handler).not.toHaveBeenCalled()
  })

  it('devuelve 401 y no invoca el handler si el usuario no tiene hogar', async () => {
    mockSession({ householdId: null })
    const handler = vi.fn(ok)

    const res = await withAuth('/api/thing', handler)(req())

    expect(res.status).toBe(401)
    expect(handler).not.toHaveBeenCalled()
  })

  it('usa `options.unauthorized` en lugar del 401 por defecto', async () => {
    mockSession({ user: null })

    const res = await withAuth('/api/thing', ok, {
      unauthorized: () => NextResponse.redirect('http://test/login'),
    })(req())

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://test/login')
  })

  it('pasa el contexto de auth al handler y devuelve su respuesta tal cual', async () => {
    mockSession()
    const handler = vi.fn(async () => NextResponse.json({ data: 42 }, { status: 201 }))

    const request = req()
    const res = await withAuth('/api/thing', handler)(request)

    expect(handler).toHaveBeenCalledWith(
      { user: USER, householdId: HOUSEHOLD_ID, supabase: SUPABASE },
      request
    )
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ data: 42 })
    expect(logError).not.toHaveBeenCalled()
  })

  it('propaga los argumentos extra de Next (params de una ruta dinámica)', async () => {
    mockSession()
    const handler = vi.fn(async (_ctx, _req, { params }: { params: Promise<{ id: string }> }) => {
      const { id } = await params
      return NextResponse.json({ id })
    })

    const res = await withAuth('/api/thing/[id]', handler)(req(), {
      params: Promise.resolve({ id: 'tx-1' }),
    })

    expect(await res.json()).toEqual({ id: 'tx-1' })
  })
})

describe('withUser — autenticación', () => {
  it('devuelve 401 si no hay sesión', async () => {
    mockSession({ user: null })
    const handler = vi.fn(ok)

    const res = await withUser('/api/thing', handler)(req())

    expect(res.status).toBe(401)
    expect(handler).not.toHaveBeenCalled()
  })

  it('invoca el handler aunque el usuario no tenga hogar', async () => {
    mockSession({ householdId: null })
    const handler = vi.fn(ok)

    const res = await withUser('/api/thing', handler)(req())

    expect(res.status).toBe(200)
    expect(handler).toHaveBeenCalledWith({ user: USER, supabase: SUPABASE }, expect.anything())
  })
})

describe('withAuth — manejo de errores', () => {
  it('convierte una excepción del handler en 500 y la registra con logError', async () => {
    mockSession()
    const boom = new Error('connection refused')

    const res = await withAuth('/api/thing', async () => {
      throw boom
    })(req('http://test/api/thing', { method: 'POST' }))

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'DB error' })
    expect(logError).toHaveBeenCalledTimes(1)
    expect(logError).toHaveBeenCalledWith({
      source: 'server',
      message: 'connection refused',
      stack: boom.stack,
      route: '/api/thing',
      context: { method: 'POST' },
      userId: USER.id,
      householdId: HOUSEHOLD_ID,
    })
  })

  it('registra el `context` de un RouteError junto al método y la query', async () => {
    mockSession()

    await withAuth('/api/thing', async () => {
      throw new RouteError('duplicate key', { op: 'insert', code: '23505' })
    })(req('http://test/api/thing?granularity=month&offset=0'))

    expect(logError).toHaveBeenCalledWith(
      expect.objectContaining({
        context: {
          method: 'GET',
          query: { granularity: 'month', offset: '0' },
          op: 'insert',
          code: '23505',
        },
      })
    )
  })

  it('registra con householdId null cuando el envoltorio es withUser', async () => {
    mockSession({ householdId: null })

    const res = await withUser('/api/thing', async () => {
      throw new Error('boom')
    })(req())

    expect(res.status).toBe(500)
    expect(logError).toHaveBeenCalledWith(
      expect.objectContaining({ householdId: null, userId: USER.id })
    )
  })
})

describe('unwrap', () => {
  it('devuelve `data` cuando no hay error', () => {
    expect(unwrap({ data: [{ id: 1 }], error: null })).toEqual([{ id: 1 }])
  })

  it('lanza un RouteError con el code de Postgrest y el contexto dado', () => {
    expect(() =>
      unwrap({ data: null, error: { message: 'no rows', code: 'PGRST116' } }, { op: 'update', id: 'tx-1' })
    ).toThrowError(
      expect.objectContaining({
        name: 'RouteError',
        message: 'no rows',
        context: { op: 'update', id: 'tx-1', code: 'PGRST116' },
      })
    )
  })
})
