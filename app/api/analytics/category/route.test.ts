import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

const { GET } = await import('./route')

const USER_ID = '00000000-0000-0000-0000-000000000001'
const HOUSEHOLD_ID = '00000000-0000-0000-0000-0000000000a1'

// Jueves 21 mayo 2026, 12:00 local
const NOW = new Date(2026, 4, 21, 12, 0, 0, 0)

interface RpcParams {
  p_household_id: string
  p_start_date: string
  p_end_date: string
}

interface ByCat {
  category: string | null
  amount: number
}

interface PeriodRow {
  income: number
  expense: number
  savings: number
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
  householdId?: string | null
}

/** Builder encadenable que imita la consulta de getHouseholdId(). */
function householdBuilder(householdId: string | null) {
  const builder = {
    select: () => builder,
    eq: () => builder,
    order: () => builder,
    limit: () => builder,
    maybeSingle: async () => ({
      data: householdId ? { household_id: householdId } : null,
      error: null,
    }),
  }
  return builder
}

function buildSupabase(opts: MockOpts = {}) {
  const rpcSpy = vi.fn<RpcImpl>(
    opts.rpc ??
      (async () => ({
        data: [{ income: 0, expense: 0, savings: 0, by_category: [] }],
        error: null,
      }))
  )
  const householdId = opts.householdId === undefined ? HOUSEHOLD_ID : opts.householdId
  const supabase = {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: opts.user === undefined ? { id: USER_ID } : opts.user },
        error: opts.authError ?? null,
      })),
    },
    from: vi.fn(() => householdBuilder(householdId)),
    rpc: rpcSpy,
  }
  return { supabase, rpcSpy }
}

function req(query: Record<string, string> = {}) {
  const url = new URL('http://test/api/analytics/category')
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

describe('GET /api/analytics/category — validación de params', () => {
  it.each<[string, Record<string, string>]>([
    ['granularity ausente', { id: 'restaurant' }],
    ['granularity inválido', { granularity: 'day', id: 'restaurant' }],
    ['id ausente', { granularity: 'month' }],
    ['id desconocido (no existe en CATEGORY_META)', { granularity: 'month', id: 'nope' }],
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

describe('GET /api/analytics/category — autenticación', () => {
  it('devuelve 401 si auth.getUser devuelve error', async () => {
    const { supabase, rpcSpy } = buildSupabase({
      user: null,
      authError: { message: 'no session' },
    })
    vi.mocked(createClient).mockResolvedValue(
      supabase as unknown as Awaited<ReturnType<typeof createClient>>
    )

    const res = await GET(req({ granularity: 'month', id: 'restaurant' }))
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Unauthorized' })
    expect(rpcSpy).not.toHaveBeenCalled()
  })

  it('devuelve 401 si no hay usuario', async () => {
    const { supabase, rpcSpy } = buildSupabase({ user: null })
    vi.mocked(createClient).mockResolvedValue(
      supabase as unknown as Awaited<ReturnType<typeof createClient>>
    )

    const res = await GET(req({ granularity: 'month', id: 'restaurant' }))
    expect(res.status).toBe(401)
    expect(rpcSpy).not.toHaveBeenCalled()
  })
})

describe('GET /api/analytics/category — ventana de drilldown', () => {
  it('devuelve exactamente 6 períodos (recortado desde la ventana completa)', async () => {
    const { supabase, rpcSpy } = buildSupabase()
    vi.mocked(createClient).mockResolvedValue(
      supabase as unknown as Awaited<ReturnType<typeof createClient>>
    )

    const res = await GET(req({ granularity: 'month', id: 'restaurant' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.granularity).toBe('month')
    expect(body.categoryId).toBe('restaurant')
    expect(body.periods).toHaveLength(6)
    expect(rpcSpy).toHaveBeenCalledTimes(6)
  })

  it('los 6 períodos son los últimos de la ventana completa (mes actual = último)', async () => {
    const { supabase } = buildSupabase()
    vi.mocked(createClient).mockResolvedValue(
      supabase as unknown as Awaited<ReturnType<typeof createClient>>
    )

    const body = await (await GET(req({ granularity: 'month', id: 'restaurant' }))).json()
    // Mes actual = mayo 2026; ventana=12; últimos 6 = dic 2025..mayo 2026
    expect(body.periods[0].start).toBe('2025-12-01')
    expect(body.periods.at(-1).start).toBe('2026-05-01')
    expect(body.periods.at(-1).end).toBe('2026-05-31')
  })
})

describe('GET /api/analytics/category — drilldown por categoría', () => {
  it('devuelve el valor absoluto del amount para la categoría pedida (gasto)', async () => {
    const { supabase } = buildSupabase({
      rpc: async () => ({
        data: [
          {
            income: 0,
            expense: 320,
            savings: -320,
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

    const body = await (await GET(req({ granularity: 'month', id: 'restaurant' }))).json()
    expect(body.periods).toHaveLength(6)
    for (const p of body.periods) {
      expect(p.amount).toBe(120)
    }
  })

  it('devuelve el amount sin signo cuando la categoría representa income', async () => {
    const { supabase } = buildSupabase({
      rpc: async () => ({
        data: [
          {
            income: 2000,
            expense: 0,
            savings: 2000,
            by_category: [{ category: 'income', amount: 2000 }],
          },
        ],
        error: null,
      }),
    })
    vi.mocked(createClient).mockResolvedValue(
      supabase as unknown as Awaited<ReturnType<typeof createClient>>
    )

    const body = await (await GET(req({ granularity: 'month', id: 'income' }))).json()
    for (const p of body.periods) {
      expect(p.amount).toBe(2000)
    }
  })

  it('devuelve amount=0 cuando la categoría no aparece en by_category', async () => {
    const { supabase } = buildSupabase({
      rpc: async () => ({
        data: [
          {
            income: 0,
            expense: 200,
            savings: -200,
            by_category: [{ category: 'groceries', amount: -200 }],
          },
        ],
        error: null,
      }),
    })
    vi.mocked(createClient).mockResolvedValue(
      supabase as unknown as Awaited<ReturnType<typeof createClient>>
    )

    const body = await (await GET(req({ granularity: 'month', id: 'restaurant' }))).json()
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

    const body = await (await GET(req({ granularity: 'month', id: 'restaurant' }))).json()
    for (const p of body.periods) expect(p.amount).toBe(0)
  })

  it('llama al RPC con p_household_id y fechas ISO por cada periodo', async () => {
    const { supabase, rpcSpy } = buildSupabase()
    vi.mocked(createClient).mockResolvedValue(
      supabase as unknown as Awaited<ReturnType<typeof createClient>>
    )

    await GET(req({ granularity: 'month', id: 'restaurant' }))
    for (const [name, params] of rpcSpy.mock.calls) {
      expect(name).toBe('get_period_data')
      expect(params.p_household_id).toBe(HOUSEHOLD_ID)
      expect(params.p_start_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(params.p_end_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })
})

describe('GET /api/analytics/category — granularidades', () => {
  it.each<[string]>([['week'], ['month'], ['quarter'], ['year']])(
    'devuelve 6 períodos para granularity=%s',
    async (granularity) => {
      const { supabase } = buildSupabase()
      vi.mocked(createClient).mockResolvedValue(
        supabase as unknown as Awaited<ReturnType<typeof createClient>>
      )

      const body = await (await GET(req({ granularity, id: 'restaurant' }))).json()
      expect(body.periods).toHaveLength(6)
    }
  )
})

describe('GET /api/analytics/category — errores', () => {
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
    const res = await GET(req({ granularity: 'month', id: 'restaurant' }))
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'DB error' })
    errSpy.mockRestore()
  })
})
