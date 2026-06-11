import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createServiceClient } from '@/lib/supabase/service'

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(),
}))

const { POST } = await import('./route')

const SECRET = 'test-secret'
const USER_ID = '00000000-0000-0000-0000-000000000001'
const HOUSEHOLD_ID = '00000000-0000-0000-0000-0000000000a1'
const ACCOUNT_ID = '00000000-0000-0000-0000-000000000aaa'

type MockOpts = {
  userConfig?: { data: { user_id: string; household_id?: string } | null; error?: unknown }
  accountSelect?: { data: { id: string } | null; error?: unknown }
  accountInsert?: { data: { id: string } | null; error?: unknown }
  accountUpdate?: { error?: unknown }
  txUpsert?: { error?: unknown }
}

function buildMockDb(opts: MockOpts = {}) {
  const insertSpy = vi.fn()
  const updateSpy = vi.fn()
  const upsertSpy = vi.fn()

  const userConfigBuilder: Record<string, unknown> = {}
  Object.assign(userConfigBuilder, {
    select: vi.fn(() => userConfigBuilder),
    limit: vi.fn(() => userConfigBuilder),
    maybeSingle: vi.fn(() =>
      Promise.resolve(opts.userConfig ?? { data: null, error: null })
    ),
  })

  // Shared builder for `accounts`. Within a single POST, the handler either
  // updates an existing account or inserts a new one — never both — so the
  // `_after*` flags route the post-mutation chain correctly.
  const accountsBuilder: Record<string, unknown> & {
    _afterInsert: boolean
    _afterUpdate: boolean
  } = { _afterInsert: false, _afterUpdate: false }
  Object.assign(accountsBuilder, {
    select: vi.fn(() => {
      if (accountsBuilder._afterInsert) {
        return {
          single: vi.fn(() =>
            Promise.resolve(opts.accountInsert ?? { data: null, error: null })
          ),
        }
      }
      return accountsBuilder
    }),
    eq: vi.fn(() => {
      if (accountsBuilder._afterUpdate) {
        return Promise.resolve(opts.accountUpdate ?? { error: null })
      }
      return accountsBuilder
    }),
    maybeSingle: vi.fn(() =>
      Promise.resolve(opts.accountSelect ?? { data: null, error: null })
    ),
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
      if (table === 'user_config') return userConfigBuilder
      if (table === 'accounts') return accountsBuilder
      if (table === 'transactions') return txBuilder
      throw new Error(`Unmocked table: ${table}`)
    }),
  }

  return { db, insertSpy, updateSpy, upsertSpy }
}

function callRoute(
  body: unknown,
  opts: { auth?: string | null; rawBody?: string } = {}
) {
  const headers: Record<string, string> = {}
  if (opts.auth !== null) {
    headers.authorization = opts.auth ?? `Bearer ${SECRET}`
  }
  return POST(
    new Request('http://test/api/edenred', {
      method: 'POST',
      headers,
      body: opts.rawBody ?? JSON.stringify(body),
    })
  )
}

const validPayload = {
  balance: 12.34,
  last_synced_at: '2026-05-19T10:00:00Z',
  transactions: [
    {
      external_id: 'ext-1',
      amount: -4.5,
      description: 'Bar Pepe',
      transaction_date: '2026-05-18',
    },
  ],
}

beforeEach(() => {
  vi.stubEnv('EDENRED_WEBHOOK_SECRET', SECRET)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('POST /api/edenred — auth', () => {
  it('rechaza con 401 (sin body) si falta el header Authorization', async () => {
    const { db } = buildMockDb()
    vi.mocked(createServiceClient).mockReturnValue(
      db as unknown as ReturnType<typeof createServiceClient>
    )

    const res = await callRoute(validPayload, { auth: null })
    expect(res.status).toBe(401)
    expect(await res.text()).toBe('')
    // No debe haber tocado Supabase
    expect(db.from).not.toHaveBeenCalled()
  })

  it('rechaza con 401 (sin body) si el Bearer es incorrecto', async () => {
    const { db } = buildMockDb()
    vi.mocked(createServiceClient).mockReturnValue(
      db as unknown as ReturnType<typeof createServiceClient>
    )

    const res = await callRoute(validPayload, { auth: 'Bearer wrong-secret' })
    expect(res.status).toBe(401)
    expect(await res.text()).toBe('')
    expect(db.from).not.toHaveBeenCalled()
  })
})

describe('POST /api/edenred — configuración', () => {
  it('devuelve 500 "Server misconfigured" si falta EDENRED_WEBHOOK_SECRET', async () => {
    vi.unstubAllEnvs()
    // Eliminar la variable por si el entorno del test la tenía seteada
    delete process.env.EDENRED_WEBHOOK_SECRET

    const { db } = buildMockDb()
    vi.mocked(createServiceClient).mockReturnValue(
      db as unknown as ReturnType<typeof createServiceClient>
    )

    const res = await callRoute(validPayload)
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Server misconfigured' })
    expect(db.from).not.toHaveBeenCalled()
  })
})

describe('POST /api/edenred — validación de body', () => {
  it.each<[string, string | object]>([
    ['JSON no parseable', 'not-a-json{'],
    [
      'falta el campo balance',
      { last_synced_at: '2026-05-19T10:00:00Z', transactions: [] },
    ],
    [
      'transactions no es array',
      {
        balance: 1,
        last_synced_at: '2026-05-19T10:00:00Z',
        transactions: 'oops',
      },
    ],
    [
      'tx con tipos incorrectos (amount string)',
      {
        balance: 1,
        last_synced_at: '2026-05-19T10:00:00Z',
        transactions: [
          {
            external_id: 'a',
            amount: 'mal',
            description: 'x',
            transaction_date: '2026-05-18',
          },
        ],
      },
    ],
  ])('devuelve 400 "Invalid body" cuando %s', async (_label, body) => {
    const { db } = buildMockDb()
    vi.mocked(createServiceClient).mockReturnValue(
      db as unknown as ReturnType<typeof createServiceClient>
    )

    const res =
      typeof body === 'string'
        ? await callRoute(null, { rawBody: body })
        : await callRoute(body)

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Invalid body' })
  })
})

describe('POST /api/edenred — user_config', () => {
  it('devuelve 500 "No user configured" si user_config está vacío', async () => {
    const { db } = buildMockDb({ userConfig: { data: null, error: null } })
    vi.mocked(createServiceClient).mockReturnValue(
      db as unknown as ReturnType<typeof createServiceClient>
    )

    const res = await callRoute(validPayload)
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'No user configured' })
  })
})

describe('POST /api/edenred — primer POST (crea cuenta)', () => {
  it('inserta la cuenta Edenred con los campos esperados y upsertea las txns', async () => {
    const { db, insertSpy, upsertSpy } = buildMockDb({
      userConfig: { data: { user_id: USER_ID, household_id: HOUSEHOLD_ID }, error: null },
      accountSelect: { data: null, error: null },
      accountInsert: { data: { id: ACCOUNT_ID }, error: null },
    })
    vi.mocked(createServiceClient).mockReturnValue(
      db as unknown as ReturnType<typeof createServiceClient>
    )

    const res = await callRoute(validPayload)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ created_account: true, upserted: 1 })

    expect(insertSpy).toHaveBeenCalledTimes(1)
    expect(insertSpy).toHaveBeenCalledWith({
      user_id: USER_ID,
      household_id: HOUSEHOLD_ID,
      name: 'Edenred',
      type: 'edenred',
      source: 'scraper',
      is_liability: false,
      balance: validPayload.balance,
      last_synced: validPayload.last_synced_at,
      currency: 'EUR',
    })

    // La cuenta nueva debe quedar asociada a las txns insertadas
    const [rows] = upsertSpy.mock.calls[0]
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      user_id: USER_ID,
      household_id: HOUSEHOLD_ID,
      account_id: ACCOUNT_ID,
      external_id: 'ext-1',
      source: 'scraper',
    })
  })
})

describe('POST /api/edenred — POST siguiente (actualiza cuenta)', () => {
  it('actualiza solo balance y last_synced de la cuenta existente', async () => {
    const { db, insertSpy, updateSpy, upsertSpy } = buildMockDb({
      userConfig: { data: { user_id: USER_ID, household_id: HOUSEHOLD_ID }, error: null },
      accountSelect: { data: { id: ACCOUNT_ID }, error: null },
    })
    vi.mocked(createServiceClient).mockReturnValue(
      db as unknown as ReturnType<typeof createServiceClient>
    )

    const res = await callRoute(validPayload)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ created_account: false, upserted: 1 })

    expect(insertSpy).not.toHaveBeenCalled()
    expect(updateSpy).toHaveBeenCalledTimes(1)
    const [updatePayload] = updateSpy.mock.calls[0]
    expect(updatePayload).toEqual({
      balance: validPayload.balance,
      last_synced: validPayload.last_synced_at,
    })

    // Asegurar que la cuenta usada es la existente
    const [rows] = upsertSpy.mock.calls[0]
    expect(rows[0]).toMatchObject({ account_id: ACCOUNT_ID })
  })
})

describe('POST /api/edenred — idempotencia', () => {
  it('llama a upsert con onConflict="household_id,external_id" e ignoreDuplicates=false', async () => {
    const { db, upsertSpy } = buildMockDb({
      userConfig: { data: { user_id: USER_ID, household_id: HOUSEHOLD_ID }, error: null },
      accountSelect: { data: { id: ACCOUNT_ID }, error: null },
    })
    vi.mocked(createServiceClient).mockReturnValue(
      db as unknown as ReturnType<typeof createServiceClient>
    )

    await callRoute(validPayload)

    expect(upsertSpy).toHaveBeenCalledTimes(1)
    const [, options] = upsertSpy.mock.calls[0]
    expect(options).toEqual({
      onConflict: 'household_id,external_id',
      ignoreDuplicates: false,
    })
  })
})

describe('POST /api/edenred — mapeo de category', () => {
  it('aplica "restaurant" cuando la txn no trae category', async () => {
    const { db, upsertSpy } = buildMockDb({
      userConfig: { data: { user_id: USER_ID, household_id: HOUSEHOLD_ID }, error: null },
      accountSelect: { data: { id: ACCOUNT_ID }, error: null },
    })
    vi.mocked(createServiceClient).mockReturnValue(
      db as unknown as ReturnType<typeof createServiceClient>
    )

    await callRoute({
      ...validPayload,
      transactions: [
        {
          external_id: 'ext-a',
          amount: -3,
          description: 'Comida',
          transaction_date: '2026-05-18',
        },
      ],
    })

    const [rows] = upsertSpy.mock.calls[0]
    expect(rows[0].category).toBe('restaurant')
  })

  it('respeta la category provista por el scraper (p. ej. "payroll" en una recarga)', async () => {
    const { db, upsertSpy } = buildMockDb({
      userConfig: { data: { user_id: USER_ID, household_id: HOUSEHOLD_ID }, error: null },
      accountSelect: { data: { id: ACCOUNT_ID }, error: null },
    })
    vi.mocked(createServiceClient).mockReturnValue(
      db as unknown as ReturnType<typeof createServiceClient>
    )

    await callRoute({
      ...validPayload,
      transactions: [
        {
          external_id: 'recarga-1',
          amount: 50,
          description: 'Recarga mensual',
          transaction_date: '2026-05-01',
          category: 'payroll',
        },
        {
          external_id: 'gasto-1',
          amount: -7.2,
          description: 'Menú del día',
          transaction_date: '2026-05-02',
        },
      ],
    })

    const [rows] = upsertSpy.mock.calls[0]
    expect(rows).toHaveLength(2)
    expect(rows[0].category).toBe('payroll')
    expect(rows[1].category).toBe('restaurant')
  })
})
