import { describe, expect, it, vi } from 'vitest'
import { ingest } from './pipeline'
import type { Connector, IngestDb, NormalizedAccount } from './types'

/**
 * Mock de Supabase para el pipeline (#309). Más simple que el de los route
 * handlers: cada tabla tiene su builder y `tables` registra el orden de los
 * `from(...)`, que es lo que fija el contrato con la BD (una consulta de reglas
 * como mucho, un único upsert al final).
 */
type MockOpts = {
  owner?: { household_id: string; user_id: string } | null
  ownerError?: unknown
  /** Un resultado por cuenta, en orden. `null` = la cuenta no existe todavía. */
  accountSelects?: Array<{ data: { id: string } | null; error?: unknown }>
  accountInserts?: Array<{ data: { id: string } | null; error?: unknown }>
  accountUpdates?: Array<{ error?: unknown }>
  rules?: Array<{ pattern: string; field: string; category_id: string }>
  txUpsert?: { error?: unknown }
}

const OWNER = {
  household_id: '00000000-0000-0000-0000-0000000000a1',
  user_id: '00000000-0000-0000-0000-000000000001',
}

function buildMockDb(opts: MockOpts = {}) {
  const tables: string[] = []
  const inserts: unknown[] = []
  const updates: unknown[] = []
  const upserts: Array<[unknown, unknown]> = []

  let selectIdx = 0
  let insertIdx = 0
  let updateIdx = 0

  const next = <T>(queue: T[] | undefined, idx: number, fallback: T): T =>
    queue?.[idx] ?? fallback

  const householdMembers = () => {
    const b: Record<string, unknown> = {}
    Object.assign(b, {
      select: () => b,
      eq: () => b,
      order: () => b,
      limit: () => b,
      maybeSingle: () =>
        Promise.resolve({
          data: opts.owner === undefined ? OWNER : opts.owner,
          error: opts.ownerError ?? null,
        }),
    })
    return b
  }

  const accounts = () => {
    // Una cuenta, dentro de una misma petición, o se actualiza o se inserta —
    // nunca ambas. Los flags desambiguan la cadena que sigue a cada mutación.
    const b: Record<string, unknown> & { _insert: boolean; _update: boolean } = {
      _insert: false,
      _update: false,
    }
    Object.assign(b, {
      select: () => {
        if (b._insert) {
          const result = next(opts.accountInserts, insertIdx++, { data: null, error: null })
          return { single: () => Promise.resolve(result) }
        }
        return b
      },
      eq: () => {
        if (b._update) return Promise.resolve(next(opts.accountUpdates, updateIdx++, { error: null }))
        return b
      },
      maybeSingle: () =>
        Promise.resolve(next(opts.accountSelects, selectIdx++, { data: null, error: null })),
      insert: (row: unknown) => {
        inserts.push(row)
        b._insert = true
        return b
      },
      update: (patch: unknown) => {
        updates.push(patch)
        b._update = true
        return b
      },
    })
    return b
  }

  const rules = () => {
    const b: Record<string, unknown> = {}
    Object.assign(b, {
      select: () => b,
      eq: () => b,
      order: () => Promise.resolve({ data: opts.rules ?? [], error: null }),
    })
    return b
  }

  const transactions = () => ({
    upsert: (rows: unknown, options: unknown) => {
      upserts.push([rows, options])
      return Promise.resolve(opts.txUpsert ?? { error: null })
    },
  })

  const db = {
    from: (table: string) => {
      tables.push(table)
      if (table === 'household_members') return householdMembers()
      if (table === 'accounts') return accounts()
      if (table === 'categorization_rules') return rules()
      if (table === 'transactions') return transactions()
      throw new Error(`Unmocked table: ${table}`)
    },
  }

  return { db: db as unknown as IngestDb, tables, inserts, updates, upserts }
}

function tx(externalId: string, description = 'Compra') {
  return { externalId, amount: -10, description, date: '2026-07-01' }
}

/** Cuenta mínima: identidad por nombre, sin number ni sortOrder. */
function minimalAccount(overrides: Partial<NormalizedAccount> = {}): NormalizedAccount {
  return {
    identity: { by: 'name', value: 'Edenred' },
    name: 'Edenred',
    type: 'edenred',
    isLiability: false,
    balance: 100,
    transactions: [tx('ext-1')],
    ...overrides,
  }
}

/** Conector de prueba: categorizador síncrono, no toca la BD. */
function fakeConnector(
  accounts: NormalizedAccount[],
  categorize: Connector<void>['prepareCategorizer'] = () => () => 'restaurant'
): Connector<void> {
  return {
    source: 'test',
    normalize: () => ({ lastSyncedAt: '2026-07-01T10:00:00Z', accounts }),
    prepareCategorizer: categorize,
  }
}

describe('ingest — hogar sin owner', () => {
  it('corta antes de tocar cuentas o transacciones', async () => {
    const { db, tables } = buildMockDb({ owner: null })

    const result = await ingest(db, fakeConnector([minimalAccount()]), undefined)

    expect(result).toEqual({ ok: false, error: { code: 'no_owner' } })
    expect(tables).toEqual(['household_members'])
  })
})

describe('ingest — upsert de transacciones', () => {
  it('agrega las txns de todas las cuentas en un único upsert idempotente', async () => {
    const { db, upserts } = buildMockDb({
      accountSelects: [{ data: { id: 'acc-1' } }, { data: { id: 'acc-2' } }],
    })

    const result = await ingest(
      db,
      fakeConnector([
        minimalAccount({ transactions: [tx('a-1'), tx('a-2')] }),
        minimalAccount({
          identity: { by: 'external_id', value: 'card-2' },
          transactions: [tx('b-1')],
        }),
      ]),
      undefined
    )

    expect(result).toEqual({ ok: true, data: { accounts: 2, createdAccounts: 0, upserted: 3 } })

    expect(upserts).toHaveLength(1)
    const [rows, options] = upserts[0]
    expect(options).toEqual({
      onConflict: 'household_id,external_id',
      ignoreDuplicates: false,
    })
    expect(rows).toHaveLength(3)
    // Cada fila lleva el account_id de su cuenta.
    expect(rows).toMatchObject([
      { account_id: 'acc-1', external_id: 'a-1' },
      { account_id: 'acc-1', external_id: 'a-2' },
      { account_id: 'acc-2', external_id: 'b-1' },
    ])
  })

  it('no emite is_read, para no pisar el estado de lectura en un re-sync (#149)', async () => {
    const { db, upserts } = buildMockDb({ accountSelects: [{ data: { id: 'acc-1' } }] })

    await ingest(db, fakeConnector([minimalAccount()]), undefined)

    const [rows] = upserts[0]
    expect((rows as unknown[])[0]).not.toHaveProperty('is_read')
  })

  it('no llama a upsert si no hay ninguna transacción', async () => {
    const { db, upserts, tables } = buildMockDb({ accountSelects: [{ data: { id: 'acc-1' } }] })

    const result = await ingest(
      db,
      fakeConnector([minimalAccount({ transactions: [] })]),
      undefined
    )

    expect(result).toEqual({ ok: true, data: { accounts: 1, createdAccounts: 0, upserted: 0 } })
    expect(upserts).toHaveLength(0)
    expect(tables).not.toContain('transactions')
  })
})

describe('ingest — columnas divergentes del INSERT', () => {
  it('la cuenta mínima no emite number, external_id ni sort_order', async () => {
    const { db, inserts } = buildMockDb({
      accountSelects: [{ data: null }],
      accountInserts: [{ data: { id: 'acc-nueva' } }],
    })

    const result = await ingest(db, fakeConnector([minimalAccount()]), undefined)

    expect(result).toMatchObject({ ok: true, data: { createdAccounts: 1 } })
    expect(inserts[0]).toEqual({
      user_id: OWNER.user_id,
      household_id: OWNER.household_id,
      name: 'Edenred',
      type: 'edenred',
      source: 'scraper',
      is_liability: false,
      balance: 100,
      last_synced: '2026-07-01T10:00:00Z',
      currency: 'EUR',
    })
  })

  it('la cuenta completa emite number, external_id y sort_order', async () => {
    const { db, inserts } = buildMockDb({
      accountSelects: [{ data: null }],
      accountInserts: [{ data: { id: 'acc-nueva' } }],
    })

    await ingest(
      db,
      fakeConnector([
        minimalAccount({
          identity: { by: 'external_id', value: 'plan-1' },
          name: 'Plan de ahorro',
          type: 'savings',
          number: null,
          sortOrder: 15,
        }),
      ]),
      undefined
    )

    expect(inserts[0]).toMatchObject({
      name: 'Plan de ahorro',
      type: 'savings',
      external_id: 'plan-1',
      number: null,
      sort_order: 15,
    })
  })
})

describe('ingest — UPDATE de una cuenta existente', () => {
  it('nunca reescribe el nombre: sólo balance y last_synced (#313)', async () => {
    const { db, updates, inserts } = buildMockDb({ accountSelects: [{ data: { id: 'acc-1' } }] })

    await ingest(db, fakeConnector([minimalAccount({ name: 'Renombrada en BD' })]), undefined)

    expect(inserts).toHaveLength(0)
    expect(updates[0]).toEqual({ balance: 100, last_synced: '2026-07-01T10:00:00Z' })
  })
})

describe('ingest — categorización', () => {
  it('un categorizador síncrono no consulta las reglas del hogar', async () => {
    const { db, tables, upserts } = buildMockDb({ accountSelects: [{ data: { id: 'acc-1' } }] })

    await ingest(
      db,
      fakeConnector([minimalAccount()], () => tx => (tx.amount > 0 ? 'payroll' : 'restaurant')),
      undefined
    )

    expect(tables).not.toContain('categorization_rules')
    const [rows] = upserts[0]
    expect((rows as Array<{ category: string }>)[0].category).toBe('restaurant')
  })

  it('el prefetch async se resuelve una sola vez y se aplica a todas las cuentas', async () => {
    const { db, tables, upserts } = buildMockDb({
      accountSelects: [{ data: { id: 'acc-1' } }, { data: { id: 'acc-2' } }],
    })

    const prepare = vi.fn(async (db_: IngestDb, householdId: string) => {
      const { data } = await db_
        .from('categorization_rules')
        .select('pattern, field, category_id')
        .eq('household_id', householdId)
        .eq('is_active', true)
        .order('priority', { ascending: false })
      return () => (data ? 'groceries' : null)
    })

    await ingest(
      db,
      fakeConnector(
        [
          minimalAccount({ transactions: [tx('a-1')] }),
          minimalAccount({
            identity: { by: 'external_id', value: 'card-2' },
            transactions: [tx('b-1')],
          }),
        ],
        prepare
      ),
      undefined
    )

    expect(prepare).toHaveBeenCalledTimes(1)
    expect(tables.filter(t => t === 'categorization_rules')).toHaveLength(1)
    const [rows] = upserts[0]
    expect(rows).toMatchObject([{ category: 'groceries' }, { category: 'groceries' }])
  })

  it('persiste null cuando el categorizador no asigna categoría', async () => {
    const { db, upserts } = buildMockDb({ accountSelects: [{ data: { id: 'acc-1' } }] })

    await ingest(db, fakeConnector([minimalAccount()], () => () => null), undefined)

    const [rows] = upserts[0]
    expect((rows as Array<{ category: string | null }>)[0].category).toBeNull()
  })
})

describe('ingest — errores de base de datos', () => {
  const dbError = { ok: false, error: { code: 'db_error' } }

  it('corta si falla el SELECT de la cuenta', async () => {
    const { db, tables } = buildMockDb({
      accountSelects: [{ data: null, error: { message: 'boom' } }],
    })

    const result = await ingest(db, fakeConnector([minimalAccount()]), undefined)

    expect(result).toEqual(dbError)
    expect(tables).not.toContain('transactions')
  })

  it('corta si falla el UPDATE de la cuenta', async () => {
    const { db, tables } = buildMockDb({
      accountSelects: [{ data: { id: 'acc-1' } }],
      accountUpdates: [{ error: { message: 'boom' } }],
    })

    const result = await ingest(db, fakeConnector([minimalAccount()]), undefined)

    expect(result).toEqual(dbError)
    expect(tables).not.toContain('transactions')
  })

  it('corta si falla el INSERT de la cuenta', async () => {
    const { db, tables } = buildMockDb({
      accountSelects: [{ data: null }],
      accountInserts: [{ data: null, error: { message: 'boom' } }],
    })

    const result = await ingest(db, fakeConnector([minimalAccount()]), undefined)

    expect(result).toEqual(dbError)
    expect(tables).not.toContain('transactions')
  })

  it('no procesa la segunda cuenta si falla la primera', async () => {
    const { db, inserts } = buildMockDb({
      accountSelects: [{ data: null, error: { message: 'boom' } }, { data: null }],
    })

    const result = await ingest(
      db,
      fakeConnector([minimalAccount(), minimalAccount({ name: 'Otra' })]),
      undefined
    )

    expect(result).toEqual(dbError)
    expect(inserts).toHaveLength(0)
  })

  it('devuelve db_error si falla el upsert de transacciones', async () => {
    const { db } = buildMockDb({
      accountSelects: [{ data: { id: 'acc-1' } }],
      txUpsert: { error: { message: 'boom' } },
    })

    const result = await ingest(db, fakeConnector([minimalAccount()]), undefined)

    expect(result).toEqual(dbError)
  })
})
