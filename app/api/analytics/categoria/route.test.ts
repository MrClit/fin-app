import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

const { GET } = await import('./route')

const USER_ID = '00000000-0000-0000-0000-000000000001'

// Jueves 21 mayo 2026, 12:00 local
const NOW = new Date(2026, 4, 21, 12, 0, 0, 0)

interface RpcParams {
  p_user_id: string
  p_start_date: string
  p_end_date: string
}

interface ByCat {
  category: string | null
  amount: number
}

interface PeriodRow {
  ingresos: number
  gastos: number
  ahorro: number
  by_category: ByCat[] | null
}

type RpcImpl = (
  name: string,
  params: RpcParams
) => Promise<{ data: PeriodRow[] | null; error: unknown }>

interface MockOpts {
  user?: { id: string } | null
  authError?: unknown
  rpc?: RpcImpl
}

function buildSupabase(opts: MockOpts = {}) {
  const rpcSpy = vi.fn<RpcImpl>(
    opts.rpc ??
      (async () => ({
        data: [{ ingresos: 0, gastos: 0, ahorro: 0, by_category: [] }],
        error: null,
      }))
  )
  const supabase = {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: opts.user === undefined ? { id: USER_ID } : opts.user },
        error: opts.authError ?? null,
      })),
    },
    rpc: rpcSpy,
  }
  return { supabase, rpcSpy }
}

function req(query: Record<string, string> = {}) {
  const url = new URL('http://test/api/analytics/categoria')
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v)
  return new NextRequest(url)
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('GET /api/analytics/categoria — validación de params', () => {
  it.each<[string, Record<string, string>]>([
    ['gran ausente', { id: 'restaurant' }],
    ['gran inválido', { gran: 'day', id: 'restaurant' }],
    ['id ausente', { gran: 'month' }],
    ['id desconocido (no existe en CATEGORY_META)', { gran: 'month', id: 'nope' }],
  ])('devuelve 400 cuando %s', async (_label, query) => {
    const { supabase } = buildSupabase()
    vi.mocked(createClient).mockResolvedValue(
      supabase as unknown as Awaited<ReturnType<typeof createClient>>
    )

    const res = await GET(req(query))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Invalid params' })
    expect(supabase.auth.getUser).not.toHaveBeenCalled()
  })
})

describe('GET /api/analytics/categoria — autenticación', () => {
  it('devuelve 401 si auth.getUser devuelve error', async () => {
    const { supabase, rpcSpy } = buildSupabase({
      user: null,
      authError: { message: 'no session' },
    })
    vi.mocked(createClient).mockResolvedValue(
      supabase as unknown as Awaited<ReturnType<typeof createClient>>
    )

    const res = await GET(req({ gran: 'month', id: 'restaurant' }))
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Unauthorized' })
    expect(rpcSpy).not.toHaveBeenCalled()
  })

  it('devuelve 401 si no hay usuario', async () => {
    const { supabase, rpcSpy } = buildSupabase({ user: null })
    vi.mocked(createClient).mockResolvedValue(
      supabase as unknown as Awaited<ReturnType<typeof createClient>>
    )

    const res = await GET(req({ gran: 'month', id: 'restaurant' }))
    expect(res.status).toBe(401)
    expect(rpcSpy).not.toHaveBeenCalled()
  })
})

describe('GET /api/analytics/categoria — ventana de drilldown', () => {
  it('devuelve exactamente 6 períodos (recortado desde la ventana completa)', async () => {
    const { supabase, rpcSpy } = buildSupabase()
    vi.mocked(createClient).mockResolvedValue(
      supabase as unknown as Awaited<ReturnType<typeof createClient>>
    )

    const res = await GET(req({ gran: 'month', id: 'restaurant' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.gran).toBe('month')
    expect(body.categoryId).toBe('restaurant')
    expect(body.periods).toHaveLength(6)
    expect(rpcSpy).toHaveBeenCalledTimes(6)
  })

  it('los 6 períodos son los últimos de la ventana completa (mes actual = último)', async () => {
    const { supabase } = buildSupabase()
    vi.mocked(createClient).mockResolvedValue(
      supabase as unknown as Awaited<ReturnType<typeof createClient>>
    )

    const body = await (await GET(req({ gran: 'month', id: 'restaurant' }))).json()
    // Mes actual = mayo 2026; ventana=12; últimos 6 = dic 2025..mayo 2026
    expect(body.periods[0].start).toBe('2025-12-01')
    expect(body.periods.at(-1).start).toBe('2026-05-01')
    expect(body.periods.at(-1).end).toBe('2026-05-31')
  })
})

describe('GET /api/analytics/categoria — drilldown por categoría', () => {
  it('devuelve el valor absoluto del amount para la categoría pedida (gasto)', async () => {
    const { supabase } = buildSupabase({
      rpc: async () => ({
        data: [
          {
            ingresos: 0,
            gastos: 320,
            ahorro: -320,
            by_category: [
              { category: 'restaurant', amount: -120 },
              { category: 'groceries', amount: -200 },
            ],
          },
        ],
        error: null,
      }),
    })
    vi.mocked(createClient).mockResolvedValue(
      supabase as unknown as Awaited<ReturnType<typeof createClient>>
    )

    const body = await (await GET(req({ gran: 'month', id: 'restaurant' }))).json()
    expect(body.periods).toHaveLength(6)
    for (const p of body.periods) {
      expect(p.amount).toBe(120)
    }
  })

  it('devuelve el amount sin signo cuando la categoría representa ingresos', async () => {
    const { supabase } = buildSupabase({
      rpc: async () => ({
        data: [
          {
            ingresos: 2000,
            gastos: 0,
            ahorro: 2000,
            by_category: [{ category: 'income', amount: 2000 }],
          },
        ],
        error: null,
      }),
    })
    vi.mocked(createClient).mockResolvedValue(
      supabase as unknown as Awaited<ReturnType<typeof createClient>>
    )

    const body = await (await GET(req({ gran: 'month', id: 'income' }))).json()
    for (const p of body.periods) {
      expect(p.amount).toBe(2000)
    }
  })

  it('devuelve amount=0 cuando la categoría no aparece en by_category', async () => {
    const { supabase } = buildSupabase({
      rpc: async () => ({
        data: [
          {
            ingresos: 0,
            gastos: 200,
            ahorro: -200,
            by_category: [{ category: 'groceries', amount: -200 }],
          },
        ],
        error: null,
      }),
    })
    vi.mocked(createClient).mockResolvedValue(
      supabase as unknown as Awaited<ReturnType<typeof createClient>>
    )

    const body = await (await GET(req({ gran: 'month', id: 'restaurant' }))).json()
    for (const p of body.periods) {
      expect(p.amount).toBe(0)
    }
  })

  it('devuelve amount=0 cuando el RPC trae data vacío o by_category null', async () => {
    const { supabase } = buildSupabase({
      rpc: async () => ({ data: [], error: null }),
    })
    vi.mocked(createClient).mockResolvedValue(
      supabase as unknown as Awaited<ReturnType<typeof createClient>>
    )

    const body = await (await GET(req({ gran: 'month', id: 'restaurant' }))).json()
    for (const p of body.periods) expect(p.amount).toBe(0)
  })

  it('llama al RPC con p_user_id y fechas ISO por cada periodo', async () => {
    const { supabase, rpcSpy } = buildSupabase()
    vi.mocked(createClient).mockResolvedValue(
      supabase as unknown as Awaited<ReturnType<typeof createClient>>
    )

    await GET(req({ gran: 'month', id: 'restaurant' }))
    for (const [name, params] of rpcSpy.mock.calls) {
      expect(name).toBe('get_period_data')
      expect(params.p_user_id).toBe(USER_ID)
      expect(params.p_start_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(params.p_end_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })
})

describe('GET /api/analytics/categoria — granularidades', () => {
  it.each<[string]>([['week'], ['month'], ['quarter'], ['year']])(
    'devuelve 6 períodos para gran=%s',
    async (gran) => {
      const { supabase } = buildSupabase()
      vi.mocked(createClient).mockResolvedValue(
        supabase as unknown as Awaited<ReturnType<typeof createClient>>
      )

      const body = await (await GET(req({ gran, id: 'restaurant' }))).json()
      expect(body.periods).toHaveLength(6)
    }
  )
})

describe('GET /api/analytics/categoria — errores', () => {
  it('devuelve 500 "DB error" si el RPC lanza', async () => {
    const { supabase } = buildSupabase({
      rpc: async () => {
        throw new Error('connection refused')
      },
    })
    vi.mocked(createClient).mockResolvedValue(
      supabase as unknown as Awaited<ReturnType<typeof createClient>>
    )

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await GET(req({ gran: 'month', id: 'restaurant' }))
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'DB error' })
    errSpy.mockRestore()
  })
})
