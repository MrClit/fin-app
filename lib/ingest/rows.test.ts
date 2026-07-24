import { describe, expect, it, vi } from 'vitest'
import { toTransactionRow, upsertTransactions } from './rows'
import type { IngestDb, NormalizedTx } from './types'
import { callAt } from '@/tests/helpers'

const CTX = {
  userId: '00000000-0000-0000-0000-000000000001',
  householdId: '00000000-0000-0000-0000-0000000000a1',
  accountId: '00000000-0000-0000-0000-000000000aaa',
} as const

function tx(overrides: Partial<NormalizedTx> = {}): NormalizedTx {
  return {
    externalId: 'ext-1',
    amount: -12.5,
    description: 'Compra',
    date: '2026-07-01',
    ...overrides,
  }
}

function buildMockDb(result: { error?: unknown } = {}) {
  const upsertSpy = vi.fn((rows: unknown, options: unknown) => {
    void rows
    void options
    return Promise.resolve({ error: result.error ?? null })
  })
  const db = {
    from: vi.fn(() => ({ upsert: upsertSpy })),
  }
  return { db: db as unknown as IngestDb, from: db.from, upsertSpy }
}

describe('toTransactionRow', () => {
  it('no emite is_read, para no pisar el estado de lectura en un re-sync', () => {
    const row = toTransactionRow({ ...CTX, source: 'scraper' }, tx(), 'groceries')

    expect(row).not.toHaveProperty('is_read')
    expect(row).toEqual({
      user_id: CTX.userId,
      household_id: CTX.householdId,
      account_id: CTX.accountId,
      date: '2026-07-01',
      amount: -12.5,
      description: 'Compra',
      category: 'groceries',
      source: 'scraper',
      external_id: 'ext-1',
      // «Compra» es sólo trámite: no deja clave de comercio (#359).
      description_key: null,
      description_key_root: null,
    })
  })

  it('deriva las claves de comercio de la descripción (#359)', () => {
    const row = toTransactionRow(
      { ...CTX, source: 'scraper' },
      { ...tx(), description: 'COMPRA TARJ. 4106 MERCADONA (SANT BOI) 12/03' },
      'groceries'
    )

    expect(row.description_key).toBe('mercadona sant boi')
    expect(row.description_key_root).toBe('mercadona')
  })

  it('persiste el source que le pasa cada camino de ingesta', () => {
    const row = toTransactionRow({ ...CTX, source: 'enablebanking' }, tx(), null)

    expect(row.source).toBe('enablebanking')
    expect(row.category).toBeNull()
  })

  it('ignora los campos que sólo sirven para categorizar', () => {
    const row = toTransactionRow(
      { ...CTX, source: 'enablebanking' },
      tx({ merchant: 'Mercadona', category: 'restaurant' }),
      'groceries'
    )

    expect(row).not.toHaveProperty('merchant')
    // La categoría es la que decide el categorizador, no la sugerencia del tx.
    expect(row.category).toBe('groceries')
  })
})

describe('upsertTransactions', () => {
  it('no toca la base de datos si no hay filas', async () => {
    const { db, from } = buildMockDb()

    const result = await upsertTransactions(db, [], { tag: '[test]', ignoreDuplicates: false })

    expect(result).toEqual({ ok: true, upserted: 0 })
    expect(from).not.toHaveBeenCalled()
  })

  it('resuelve el conflicto por la clave natural del hogar', async () => {
    const { db, upsertSpy } = buildMockDb()
    const rows = [toTransactionRow({ ...CTX, source: 'scraper' }, tx(), null)]

    const result = await upsertTransactions(db, rows, {
      tag: '[test]',
      ignoreDuplicates: false,
    })

    expect(result).toEqual({ ok: true, upserted: 1 })
    expect(callAt(upsertSpy, 0)[1]).toEqual({
      onConflict: 'household_id,external_id',
      ignoreDuplicates: false,
    })
  })

  it('propaga ignoreDuplicates tal cual lo declara el llamante', async () => {
    const { db, upsertSpy } = buildMockDb()
    const rows = [toTransactionRow({ ...CTX, source: 'enablebanking' }, tx(), null)]

    await upsertTransactions(db, rows, { tag: '[test]', ignoreDuplicates: true })

    expect(callAt(upsertSpy, 0)[1]).toMatchObject({ ignoreDuplicates: true })
  })

  it('devuelve el error de la base de datos sin lanzar', async () => {
    const error = { message: 'boom' }
    const { db } = buildMockDb({ error })
    const rows = [toTransactionRow({ ...CTX, source: 'scraper' }, tx(), null)]
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await upsertTransactions(db, rows, {
      tag: '[test]',
      ignoreDuplicates: false,
    })

    expect(result).toEqual({ ok: false, error })
  })
})
