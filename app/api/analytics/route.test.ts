import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getWindowPeriods, toISODate } from '@/lib/analytics'
import type { Granularity } from '@/types'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

const { GET } = await import('./route')

const USER_ID = '00000000-0000-0000-0000-000000000001'

// NOW = jueves 21 mayo 2026, 12:00 local. Mismo bedrock que lib/analytics.test.ts
const NOW = new Date(2026, 4, 21, 12, 0, 0, 0)

interface RpcParams {
  p_user_id: string
  p_start_date: string
  p_end_date: string
}

interface PeriodRow {
  ingresos: number
  gastos: number
  ahorro: number
  by_category: { category: string | null; amount: number }[]
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

const emptyRow = (): PeriodRow => ({
  ingresos: 0,
  gastos: 0,
  ahorro: 0,
  by_category: [],
})

/**
 * Devuelve el set de `p_start_date` ISO esperados para los períodos CUR de
 * la ventana actual, dado `gran` y `offset`. Se usa para que un mock pueda
 * distinguir RPCs CUR vs YoY sin asumir orden de llamada.
 */
function curStartSet(gran: Granularity, offset = 0): Set<string> {
  return new Set(getWindowPeriods(gran, offset).map((r) => toISODate(r.start)))
}

/**
 * Helper que crea una `rpc` mock devolviendo `cur` para los períodos actuales
 * y `yoy` para los demás (asumidos YoY).
 */
function rpcByPeriod(
  gran: Granularity,
  cur: PeriodRow | null,
  yoy: PeriodRow | null,
  offset = 0
): RpcImpl {
  const curStarts = curStartSet(gran, offset)
  return async (_, p) => {
    const row = curStarts.has(p.p_start_date) ? cur : yoy
    return { data: row === null ? [] : [row], error: null }
  }
}

function buildSupabase(opts: MockOpts = {}) {
  const rpcSpy = vi.fn<RpcImpl>(
    opts.rpc ?? (async () => ({ data: [emptyRow()], error: null }))
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
  const url = new URL('http://test/api/analytics')
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

describe('GET /api/analytics — validación de params', () => {
  it.each<[string, Record<string, string>]>([
    ['gran ausente', {}],
    ['gran inválido', { gran: 'day' }],
    ['offset negativo', { gran: 'month', offset: '-1' }],
    ['offset no numérico', { gran: 'month', offset: 'abc' }],
  ])('devuelve 400 cuando %s', async (_label, query) => {
    const { supabase } = buildSupabase()
    vi.mocked(createClient).mockResolvedValue(
      supabase as unknown as Awaited<ReturnType<typeof createClient>>
    )

    const res = await GET(req(query))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Invalid params' })
    // No debe haber tocado la BD
    expect(supabase.auth.getUser).not.toHaveBeenCalled()
  })

  it('acepta offset omitido (default 0)', async () => {
    const { supabase } = buildSupabase()
    vi.mocked(createClient).mockResolvedValue(
      supabase as unknown as Awaited<ReturnType<typeof createClient>>
    )

    const res = await GET(req({ gran: 'month' }))
    expect(res.status).toBe(200)
  })
})

describe('GET /api/analytics — autenticación', () => {
  it('devuelve 401 si auth.getUser devuelve error', async () => {
    const { supabase, rpcSpy } = buildSupabase({
      user: null,
      authError: { message: 'no session' },
    })
    vi.mocked(createClient).mockResolvedValue(
      supabase as unknown as Awaited<ReturnType<typeof createClient>>
    )

    const res = await GET(req({ gran: 'month' }))
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Unauthorized' })
    expect(rpcSpy).not.toHaveBeenCalled()
  })

  it('devuelve 401 si no hay usuario', async () => {
    const { supabase, rpcSpy } = buildSupabase({ user: null })
    vi.mocked(createClient).mockResolvedValue(
      supabase as unknown as Awaited<ReturnType<typeof createClient>>
    )

    const res = await GET(req({ gran: 'month' }))
    expect(res.status).toBe(401)
    expect(rpcSpy).not.toHaveBeenCalled()
  })
})

describe('GET /api/analytics — shape de la respuesta', () => {
  it('devuelve N períodos según granularidad (week=9, month=12, quarter=10, year=8)', async () => {
    const expectedLengths: Record<string, number> = {
      week: 9,
      month: 12,
      quarter: 10,
      year: 8,
    }

    for (const [gran, expected] of Object.entries(expectedLengths)) {
      const { supabase } = buildSupabase()
      vi.mocked(createClient).mockResolvedValue(
        supabase as unknown as Awaited<ReturnType<typeof createClient>>
      )

      const res = await GET(req({ gran }))
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.gran).toBe(gran)
      expect(body.periods).toHaveLength(expected)
    }
  })

  it('cada periodo tiene la forma documentada (label, fechas ISO, KPIs, byCategory, yoy*)', async () => {
    const { supabase } = buildSupabase({
      rpc: rpcByPeriod(
        'month',
        {
          ingresos: 1000,
          gastos: 750,
          ahorro: 250,
          by_category: [{ category: 'groceries', amount: -200 }],
        },
        {
          ingresos: 800,
          gastos: 600,
          ahorro: 200,
          by_category: [{ category: 'groceries', amount: -150 }],
        }
      ),
    })
    vi.mocked(createClient).mockResolvedValue(
      supabase as unknown as Awaited<ReturnType<typeof createClient>>
    )

    const res = await GET(req({ gran: 'month' }))
    const body = await res.json()

    expect(body.periods).toHaveLength(12)
    for (const p of body.periods) {
      expect(p).toMatchObject({
        label: expect.any(String),
        start: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        end: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        ingresos: 1000,
        gastos: 750,
        ahorro: 250,
        yoyIngresos: 800,
        yoyGastos: 600,
      })
      expect(p.byCategory).toEqual([{ category: 'groceries', amount: -200 }])
    }

    // El último periodo de la ventana debe ser el mes actual (mayo 2026)
    const last = body.periods.at(-1)
    expect(last.start).toBe('2026-05-01')
    expect(last.end).toBe('2026-05-31')
    expect(last.label).toBe('May')
  })

  it('llama a rpc("get_period_data", ...) dos veces por período (actual + YoY)', async () => {
    const { supabase, rpcSpy } = buildSupabase()
    vi.mocked(createClient).mockResolvedValue(
      supabase as unknown as Awaited<ReturnType<typeof createClient>>
    )

    await GET(req({ gran: 'month' }))
    // 12 meses × 2 llamadas
    expect(rpcSpy).toHaveBeenCalledTimes(24)
    for (const [name, params] of rpcSpy.mock.calls) {
      expect(name).toBe('get_period_data')
      expect(params.p_user_id).toBe(USER_ID)
      expect(params.p_start_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(params.p_end_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })
})

describe('GET /api/analytics — comparativa YoY (§5.7)', () => {
  it('devuelve yoyIngresos/yoyGastos === null cuando el RPC del año anterior está vacío', async () => {
    const { supabase } = buildSupabase({
      rpc: rpcByPeriod(
        'month',
        { ingresos: 1000, gastos: 500, ahorro: 500, by_category: [] },
        null
      ),
    })
    vi.mocked(createClient).mockResolvedValue(
      supabase as unknown as Awaited<ReturnType<typeof createClient>>
    )

    const res = await GET(req({ gran: 'month' }))
    const body = await res.json()

    for (const p of body.periods) {
      expect(p.yoyIngresos).toBeNull()
      expect(p.yoyGastos).toBeNull()
    }
  })

  it('devuelve yoy* === null cuando el período anterior tiene ingresos=0 y gastos=0 (histórico insuficiente, no cero real)', async () => {
    const { supabase } = buildSupabase({
      rpc: rpcByPeriod(
        'month',
        { ingresos: 100, gastos: 50, ahorro: 50, by_category: [] },
        { ingresos: 0, gastos: 0, ahorro: 0, by_category: [] }
      ),
    })
    vi.mocked(createClient).mockResolvedValue(
      supabase as unknown as Awaited<ReturnType<typeof createClient>>
    )

    const res = await GET(req({ gran: 'month' }))
    const body = await res.json()
    for (const p of body.periods) {
      expect(p.yoyIngresos).toBeNull()
      expect(p.yoyGastos).toBeNull()
    }
  })

  it('devuelve los valores numéricos cuando hay histórico (al menos uno > 0)', async () => {
    const { supabase } = buildSupabase({
      rpc: rpcByPeriod(
        'month',
        { ingresos: 100, gastos: 50, ahorro: 50, by_category: [] },
        { ingresos: 0, gastos: 200, ahorro: -200, by_category: [] }
      ),
    })
    vi.mocked(createClient).mockResolvedValue(
      supabase as unknown as Awaited<ReturnType<typeof createClient>>
    )

    const res = await GET(req({ gran: 'month' }))
    const body = await res.json()
    for (const p of body.periods) {
      expect(p.yoyIngresos).toBe(0)
      expect(p.yoyGastos).toBe(200)
    }
  })

  it.todo(
    'clasificación por categories.type: devolución de nómina (amount=-1500, type=income) suma a ingresos — bloqueado por #89 (RPC clasifica por signo)'
  )
})

describe('GET /api/analytics — defensa frente a datos faltantes', () => {
  it('si el RPC devuelve data vacío también en el período actual, los KPIs son 0 y byCategory []', async () => {
    const { supabase } = buildSupabase({
      rpc: async () => ({ data: [], error: null }),
    })
    vi.mocked(createClient).mockResolvedValue(
      supabase as unknown as Awaited<ReturnType<typeof createClient>>
    )

    const res = await GET(req({ gran: 'month' }))
    const body = await res.json()
    for (const p of body.periods) {
      expect(p.ingresos).toBe(0)
      expect(p.gastos).toBe(0)
      expect(p.ahorro).toBe(0)
      expect(p.byCategory).toEqual([])
      expect(p.yoyIngresos).toBeNull()
      expect(p.yoyGastos).toBeNull()
    }
  })

  it('si by_category llega null, se normaliza a []', async () => {
    const { supabase } = buildSupabase({
      rpc: async () => ({
        data: [
          {
            ingresos: 10,
            gastos: 5,
            ahorro: 5,
            // @ts-expect-error – simulando respuesta del RPC con null
            by_category: null,
          },
        ],
        error: null,
      }),
    })
    vi.mocked(createClient).mockResolvedValue(
      supabase as unknown as Awaited<ReturnType<typeof createClient>>
    )

    const res = await GET(req({ gran: 'month' }))
    const body = await res.json()
    for (const p of body.periods) {
      expect(p.byCategory).toEqual([])
    }
  })
})

describe('GET /api/analytics — errores', () => {
  it('devuelve 500 "DB error" si el RPC lanza', async () => {
    const { supabase } = buildSupabase({
      rpc: async () => {
        throw new Error('connection refused')
      },
    })
    vi.mocked(createClient).mockResolvedValue(
      supabase as unknown as Awaited<ReturnType<typeof createClient>>
    )

    // Silenciar console.error para no contaminar la salida del test
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await GET(req({ gran: 'month' }))
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'DB error' })
    errSpy.mockRestore()
  })
})
