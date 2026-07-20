import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createServiceClient } from '@/lib/supabase/service'
import { callAt } from '@/tests/helpers'

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(),
}))

const { POST } = await import('./route')

const SECRET = 'test-secret'
const USER_ID = '00000000-0000-0000-0000-000000000001'
const HOUSEHOLD_ID = '00000000-0000-0000-0000-0000000000a1'
const ACCOUNT_ID = '00000000-0000-0000-0000-000000000aaa'

type MockOpts = {
  householdOwner?: { data: { user_id: string; household_id?: string } | null; error?: unknown }
  accountSelect?: { data: { id: string } | null; error?: unknown }
  accountInsert?: { data: { id: string } | null; error?: unknown }
  accountUpdate?: { error?: unknown }
  txUpsert?: { error?: unknown }
}

// Mock del builder de Supabase para un handler de UNA cuenta (mismo patrón que
// /api/edenred): dentro de un POST el handler o actualiza la cuenta existente o
// inserta una nueva, nunca ambas; los flags `_after*` enrutan la cadena posterior.
function buildMockDb(opts: MockOpts = {}) {
  const insertSpy = vi.fn()
  const updateSpy = vi.fn()
  const upsertSpy = vi.fn()

  const householdMembersBuilder: Record<string, unknown> = {}
  Object.assign(householdMembersBuilder, {
    select: vi.fn(() => householdMembersBuilder),
    eq: vi.fn(() => householdMembersBuilder),
    order: vi.fn(() => householdMembersBuilder),
    limit: vi.fn(() => householdMembersBuilder),
    maybeSingle: vi.fn(() => Promise.resolve(opts.householdOwner ?? { data: null, error: null })),
  })

  const accountsBuilder: Record<string, unknown> & { _afterInsert: boolean; _afterUpdate: boolean } = {
    _afterInsert: false,
    _afterUpdate: false,
  }
  Object.assign(accountsBuilder, {
    select: vi.fn(() => {
      if (accountsBuilder._afterInsert) {
        return { single: vi.fn(() => Promise.resolve(opts.accountInsert ?? { data: null, error: null })) }
      }
      return accountsBuilder
    }),
    eq: vi.fn(() => {
      if (accountsBuilder._afterUpdate) return Promise.resolve(opts.accountUpdate ?? { error: null })
      return accountsBuilder
    }),
    maybeSingle: vi.fn(() => Promise.resolve(opts.accountSelect ?? { data: null, error: null })),
    insert: vi.fn((payload: unknown) => {
      insertSpy(payload)
      accountsBuilder._afterInsert = true
      return accountsBuilder
    }),
    update: vi.fn((payload: unknown) => {
      updateSpy(payload)
      accountsBuilder._afterUpdate = true
      return accountsBuilder
    }),
  })

  const txBuilder = {
    upsert: vi.fn((rows: unknown, options: unknown) => {
      upsertSpy(rows, options)
      return Promise.resolve(opts.txUpsert ?? { error: null })
    }),
  }

  const db = {
    from: vi.fn((table: string) => {
      if (table === 'household_members') return householdMembersBuilder
      if (table === 'accounts') return accountsBuilder
      if (table === 'transactions') return txBuilder
      throw new Error(`Unmocked table: ${table}`)
    }),
  }

  return { db, insertSpy, updateSpy, upsertSpy }
}

function callRoute(body: unknown, opts: { auth?: string | null; rawBody?: string } = {}) {
  const headers: Record<string, string> = {}
  if (opts.auth !== null) headers.authorization = opts.auth ?? `Bearer ${SECRET}`
  return POST(
    new Request('http://test/api/sabadell-savings', {
      method: 'POST',
      headers,
      body: opts.rawBody ?? JSON.stringify(body),
    })
  )
}

const validPayload = {
  last_synced_at: '2026-07-05T10:00:00Z',
  account: {
    account_id: '32000007181690',
    name: 'Plan Ahorro Trimestral',
    balance: 21462.28,
    transactions: [
      { external_id: 'save-apo-2026-07-01', amount: 300, description: 'APORT.PERIODICA', transaction_date: '2026-07-01' },
      { external_id: 'save-rev-2026-06-30', amount: 15.8, description: 'REVALORIZACION', transaction_date: '2026-06-30' },
    ],
  },
}

beforeEach(() => {
  vi.stubEnv('SABADELL_SAVINGS_WEBHOOK_SECRET', SECRET)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('POST /api/sabadell-savings — auth', () => {
  it('rechaza con 401 si falta el header Authorization', async () => {
    const { db } = buildMockDb()
    vi.mocked(createServiceClient).mockReturnValue(db as unknown as ReturnType<typeof createServiceClient>)
    const res = await callRoute(validPayload, { auth: null })
    expect(res.status).toBe(401)
    expect(db.from).not.toHaveBeenCalled()
  })

  it('rechaza con 401 si el Bearer es incorrecto', async () => {
    const { db } = buildMockDb()
    vi.mocked(createServiceClient).mockReturnValue(db as unknown as ReturnType<typeof createServiceClient>)
    const res = await callRoute(validPayload, { auth: 'Bearer wrong' })
    expect(res.status).toBe(401)
    expect(db.from).not.toHaveBeenCalled()
  })
})

describe('POST /api/sabadell-savings — configuración', () => {
  it('devuelve 500 si falta SABADELL_SAVINGS_WEBHOOK_SECRET', async () => {
    vi.unstubAllEnvs()
    delete process.env.SABADELL_SAVINGS_WEBHOOK_SECRET
    const { db } = buildMockDb()
    vi.mocked(createServiceClient).mockReturnValue(db as unknown as ReturnType<typeof createServiceClient>)
    const res = await callRoute(validPayload)
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Server misconfigured' })
  })
})

describe('POST /api/sabadell-savings — validación de body', () => {
  it.each<[string, string | object]>([
    ['JSON no parseable', 'not-json{'],
    ['falta account', { last_synced_at: '2026-07-05T10:00:00Z' }],
    ['account sin account_id', { last_synced_at: 'x', account: { name: 'n', balance: 0, transactions: [] } }],
    ['balance no numérico', { last_synced_at: 'x', account: { account_id: 'p', name: 'n', balance: 'mal', transactions: [] } }],
    [
      'tx con amount string',
      {
        last_synced_at: 'x',
        account: {
          account_id: 'p',
          name: 'n',
          balance: 0,
          transactions: [{ external_id: 'a', amount: 'mal', description: 'x', transaction_date: '2026-07-01' }],
        },
      },
    ],
  ])('devuelve 400 cuando %s', async (_label, body) => {
    const { db } = buildMockDb()
    vi.mocked(createServiceClient).mockReturnValue(db as unknown as ReturnType<typeof createServiceClient>)
    const res = typeof body === 'string' ? await callRoute(null, { rawBody: body }) : await callRoute(body)
    expect(res.status).toBe(400)
    // El esquema de Zod añade el detalle por campo en `issues` (#308).
    expect(await res.json()).toMatchObject({ error: 'Invalid body' })
  })
})

describe('POST /api/sabadell-savings — household owner', () => {
  it('devuelve 500 si no hay owner de hogar', async () => {
    const { db } = buildMockDb({ householdOwner: { data: null, error: null } })
    vi.mocked(createServiceClient).mockReturnValue(db as unknown as ReturnType<typeof createServiceClient>)
    const res = await callRoute(validPayload)
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'No user configured' })
  })
})

describe('POST /api/sabadell-savings — primer POST (crea cuenta)', () => {
  it('inserta la cuenta de ahorro con type=savings, is_liability=false y sort_order=15', async () => {
    const { db, insertSpy, upsertSpy } = buildMockDb({
      householdOwner: { data: { user_id: USER_ID, household_id: HOUSEHOLD_ID }, error: null },
      accountSelect: { data: null, error: null },
      accountInsert: { data: { id: ACCOUNT_ID }, error: null },
    })
    vi.mocked(createServiceClient).mockReturnValue(db as unknown as ReturnType<typeof createServiceClient>)

    const res = await callRoute(validPayload)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ created_account: true, upserted: 2 })

    expect(insertSpy).toHaveBeenCalledTimes(1)
    expect(insertSpy).toHaveBeenCalledWith({
      user_id: USER_ID,
      household_id: HOUSEHOLD_ID,
      name: 'Plan Ahorro Trimestral',
      type: 'savings',
      source: 'scraper',
      is_liability: false,
      balance: 21462.28,
      number: null,
      external_id: '32000007181690',
      last_synced: validPayload.last_synced_at,
      sort_order: 15,
      currency: 'EUR',
    })

    // Categorización por concepto: APORT.PERIODICA → savings; REVALORIZACION → returns.
    const [rows] = callAt(upsertSpy, 0)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ account_id: ACCOUNT_ID, external_id: 'save-apo-2026-07-01', category: 'savings', amount: 300 })
    expect(rows[1]).toMatchObject({ account_id: ACCOUNT_ID, external_id: 'save-rev-2026-06-30', category: 'returns', amount: 15.8 })
    // is_read no se envía (preserva estado de lectura en re-syncs).
    expect(rows[0]).not.toHaveProperty('is_read')
  })
})

describe('POST /api/sabadell-savings — POST siguiente (actualiza cuenta)', () => {
  it('actualiza balance/last_synced de la cuenta existente sin insertar ni tocar el nombre', async () => {
    const { db, insertSpy, updateSpy } = buildMockDb({
      householdOwner: { data: { user_id: USER_ID, household_id: HOUSEHOLD_ID }, error: null },
      accountSelect: { data: { id: ACCOUNT_ID }, error: null },
    })
    vi.mocked(createServiceClient).mockReturnValue(db as unknown as ReturnType<typeof createServiceClient>)

    const res = await callRoute(validPayload)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ created_account: false, upserted: 2 })
    expect(insertSpy).not.toHaveBeenCalled()
    expect(updateSpy).toHaveBeenCalledTimes(1)
    expect(updateSpy).toHaveBeenCalledWith({
      balance: 21462.28,
      last_synced: validPayload.last_synced_at,
    })
  })
})

describe('POST /api/sabadell-savings — idempotencia', () => {
  it('upsert con onConflict="household_id,external_id" e ignoreDuplicates=false', async () => {
    const { db, upsertSpy } = buildMockDb({
      householdOwner: { data: { user_id: USER_ID, household_id: HOUSEHOLD_ID }, error: null },
      accountSelect: { data: { id: ACCOUNT_ID }, error: null },
    })
    vi.mocked(createServiceClient).mockReturnValue(db as unknown as ReturnType<typeof createServiceClient>)
    await callRoute(validPayload)
    const [, options] = callAt(upsertSpy, 0)
    expect(options).toEqual({ onConflict: 'household_id,external_id', ignoreDuplicates: false })
  })
})
