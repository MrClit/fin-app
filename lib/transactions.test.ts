import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { formatDayLabel, groupTxByDate } from './transactions'
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
    account_id: 'acc-1',
    date: '2026-05-21',
    amount: 0,
    description: 'Movimiento',
    category: null,
    category_manual: null,
    source: 'manual',
    external_id: null,
    notes: null,
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
    expect(result[0].date).toBe('2026-05-21')
    expect(result[0].transactions).toEqual([a, b, c])
    expect(result[0].net).toBeCloseTo(59.5, 2)
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
