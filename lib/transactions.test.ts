import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  formatDayLabel,
  groupTxByDate,
  getWindowCutoff,
  listTransactions,
  listUnreadBeforeWindow,
  getUnreadCount,
  TX_PAGE_SIZE,
} from './transactions'
import { at } from '@/tests/helpers'
import { argsOf, called, createFakeSupabase, queryAt } from '@/tests/supabase-fake'
import type { TransactionWithAccount } from '@/types'

const ORIG_TZ = process.env.TZ

beforeAll(() => {
  process.env.TZ = 'Europe/Madrid'
})

afterAll(() => {
  process.env.TZ = ORIG_TZ
})

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

let nextId = 0
function tx(over: Partial<TransactionWithAccount> = {}): TransactionWithAccount {
  nextId += 1
  return {
    id: `tx-${nextId}`,
    user_id: 'user-1',
    household_id: 'hh-1',
    account_id: 'acc-1',
    date: '2026-05-21',
    amount: 0,
    description: 'Movimiento',
    category: null,
    category_manual: null,
    source: 'manual',
    external_id: null,
    notes: null,
    is_read: true,
    created_at: '2026-05-21T12:00:00.000Z',
    account: { id: 'acc-1', name: 'Cuenta', color: null },
    ...over,
  }
}

describe('groupTxByDate', () => {
  it('devuelve lista vacía cuando no hay transacciones', () => {
    expect(groupTxByDate([])).toEqual([])
  })

  it('agrupa una única transacción con net = amount', () => {
    const t = tx({ date: '2026-05-21', amount: 42.5 })
    const result = groupTxByDate([t])
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ date: '2026-05-21', transactions: [t], net: 42.5 })
  })

  it('agrupa varias transacciones del mismo día sumando el neto', () => {
    const a = tx({ date: '2026-05-21', amount: 100 })
    const b = tx({ date: '2026-05-21', amount: -30 })
    const c = tx({ date: '2026-05-21', amount: -10.5 })
    const result = groupTxByDate([a, b, c])
    expect(result).toHaveLength(1)
    expect(at(result, 0).date).toBe('2026-05-21')
    expect(at(result, 0).transactions).toEqual([a, b, c])
    expect(at(result, 0).net).toBeCloseTo(59.5, 2)
  })

  it('ordena los grupos por fecha descendente aunque la entrada no esté ordenada', () => {
    const t1 = tx({ date: '2026-05-19', amount: 1 })
    const t2 = tx({ date: '2026-05-21', amount: 2 })
    const t3 = tx({ date: '2026-05-20', amount: 3 })
    const result = groupTxByDate([t1, t2, t3])
    expect(result.map(g => g.date)).toEqual(['2026-05-21', '2026-05-20', '2026-05-19'])
  })

  it('mantiene un único grupo aunque el día aparezca intercalado en la entrada', () => {
    const a = tx({ date: '2026-05-21', amount: 10 })
    const b = tx({ date: '2026-05-20', amount: 5 })
    const c = tx({ date: '2026-05-21', amount: 20 })
    const result = groupTxByDate([a, b, c])
    expect(result).toHaveLength(2)
    const may21 = result.find(g => g.date === '2026-05-21')!
    expect(may21.transactions).toEqual([a, c])
    expect(may21.net).toBe(30)
  })
})

describe('formatDayLabel', () => {
  it('devuelve "Hoy" cuando la fecha es la del sistema (mediodía local)', () => {
    vi.setSystemTime(new Date('2026-05-21T12:00:00+02:00'))
    expect(formatDayLabel('2026-05-21')).toBe('Hoy')
  })

  it('devuelve "Ayer" para el día anterior', () => {
    vi.setSystemTime(new Date('2026-05-21T12:00:00+02:00'))
    expect(formatDayLabel('2026-05-20')).toBe('Ayer')
  })

  it('devuelve fecha absoluta en español para fechas de hace 2+ días', () => {
    vi.setSystemTime(new Date('2026-05-21T12:00:00+02:00'))
    expect(formatDayLabel('2026-05-19')).toBe('19 May 2026')
    expect(formatDayLabel('2025-12-31')).toBe('31 Dic 2025')
    expect(formatDayLabel('2024-01-05')).toBe('5 Ene 2024')
  })

  it('usa hora local, no UTC, en el cruce de día (00:00 local en Europe/Madrid)', () => {
    // 23:30 UTC del 21-may = 01:30 hora local del 22-may en CEST (UTC+2).
    // Con el cálculo en UTC, "hoy" sería 21-may y el test fallaría: ése era el bug.
    vi.setSystemTime(new Date('2026-05-21T23:30:00.000Z'))
    expect(formatDayLabel('2026-05-22')).toBe('Hoy')
    expect(formatDayLabel('2026-05-21')).toBe('Ayer')
    expect(formatDayLabel('2026-05-20')).toBe('20 May 2026')
  })
})

// ─── Acceso a datos (issue #306) ─────────────────────────────────────────────

describe('getWindowCutoff', () => {
  it('devuelve el día 90 días anterior a hoy', () => {
    expect(getWindowCutoff(new Date('2026-05-21T12:00:00+02:00'))).toBe('2026-02-20')
  })

  it('usa la fecha local, no UTC (regresión: la ventana se ensanchaba de madrugada)', () => {
    // 00:30 en Madrid = 22:30 UTC del día anterior. `toISOString()` habría dado
    // 2026-02-19 y la ventana sería de 91 días.
    expect(getWindowCutoff(new Date('2026-05-21T00:30:00+02:00'))).toBe('2026-02-20')
  })
})

describe('listTransactions', () => {
  const HOUSEHOLD = 'hh-1'
  const NOW = new Date('2026-05-21T12:00:00+02:00')

  it('acota a la ventana y filtra por hogar en la primera página', async () => {
    const { supabase, queries } = createFakeSupabase(() => ({ data: [] }))

    await listTransactions(supabase, HOUSEHOLD, { now: NOW })

    const q = queryAt(queries, 0)
    expect(q.table).toBe('transactions')
    expect(argsOf(q, 'eq')).toEqual(['household_id', HOUSEHOLD])
    expect(argsOf(q, 'gte')).toEqual(['date', '2026-02-20'])
    expect(argsOf(q, 'limit')).toEqual([TX_PAGE_SIZE + 1])
  })

  it('no aplica el cutoff cuando hay dateFrom explícito', async () => {
    const { supabase, queries } = createFakeSupabase(() => ({ data: [] }))

    await listTransactions(supabase, HOUSEHOLD, { dateFrom: '2025-01-01', now: NOW })

    expect(argsOf(queryAt(queries, 0), 'gte')).toEqual(['date', '2025-01-01'])
  })

  it('no aplica el cutoff al paginar: recortaría las páginas siguientes', async () => {
    const { supabase, queries } = createFakeSupabase(() => ({ data: [] }))

    await listTransactions(supabase, HOUSEHOLD, {
      cursor: { date: '2026-02-25', id: 'tx-9' },
      now: NOW,
    })

    const q = queryAt(queries, 0)
    expect(called(q, 'gte')).toBe(false)
    expect(argsOf(q, 'or')).toEqual([
      'date.lt.2026-02-25,and(date.eq.2026-02-25,id.lt.tx-9)',
    ])
  })

  it('devuelve nextCursor sólo cuando hay más de una página', async () => {
    const rows = [tx({ date: '2026-05-21' }), tx({ date: '2026-05-20' }), tx({ date: '2026-05-19' })]

    const full = createFakeSupabase(() => ({ data: rows }))
    const page = await listTransactions(full.supabase, HOUSEHOLD, { limit: 2, now: NOW })
    // Se pidieron 3 (limit + 1) y llegaron 3 → hay más: se recorta y hay cursor.
    expect(page.items).toHaveLength(2)
    expect(page.nextCursor).toEqual({ date: at(rows, 1).date, id: at(rows, 1).id })

    const partial = createFakeSupabase(() => ({ data: rows.slice(0, 2) }))
    const last = await listTransactions(partial.supabase, HOUSEHOLD, { limit: 2, now: NOW })
    expect(last.items).toHaveLength(2)
    expect(last.nextCursor).toBeNull()
  })

  it('filtra por cuentas y por categoría efectiva', async () => {
    const { supabase, queries } = createFakeSupabase(() => ({ data: [] }))

    await listTransactions(supabase, HOUSEHOLD, {
      accountIds: ['acc-1', 'acc-2'],
      category: 'groceries',
      now: NOW,
    })

    const q = queryAt(queries, 0)
    expect(argsOf(q, 'in')).toEqual(['account_id', ['acc-1', 'acc-2']])
    expect(argsOf(q, 'or')).toEqual([
      'category_manual.eq.groceries,and(category_manual.is.null,category.eq.groceries)',
    ])
  })

  it('propaga el error de BD en vez de devolver una lista vacía', async () => {
    const { supabase } = createFakeSupabase(() => ({
      error: { message: 'connection reset', code: '08006' },
    }))

    await expect(listTransactions(supabase, HOUSEHOLD, { now: NOW })).rejects.toThrow(
      'connection reset'
    )
  })
})

describe('listUnreadBeforeWindow', () => {
  it('pide los no leídos estrictamente anteriores al cutoff', async () => {
    const { supabase, queries } = createFakeSupabase(() => ({ data: [] }))

    await listUnreadBeforeWindow(supabase, 'hh-1', new Date('2026-05-21T12:00:00+02:00'))

    const q = queryAt(queries, 0)
    expect(argsOf(q, 'lt')).toEqual(['date', '2026-02-20'])
    expect(q.calls.filter(c => c.method === 'eq')).toEqual([
      { method: 'eq', args: ['household_id', 'hh-1'] },
      { method: 'eq', args: ['is_read', false] },
    ])
  })
})

describe('getUnreadCount', () => {
  it('cuenta sin traer filas y sin filtro de fecha', async () => {
    const { supabase, queries } = createFakeSupabase(() => ({ count: 7 }))

    expect(await getUnreadCount(supabase, 'hh-1')).toBe(7)

    const q = queryAt(queries, 0)
    expect(argsOf(q, 'select')).toEqual(['*', { count: 'exact', head: true }])
    expect(called(q, 'gte')).toBe(false)
    expect(called(q, 'lt')).toBe(false)
  })

  it('devuelve 0 cuando Postgrest no informa count', async () => {
    const { supabase } = createFakeSupabase(() => ({}))
    expect(await getUnreadCount(supabase, 'hh-1')).toBe(0)
  })
})
