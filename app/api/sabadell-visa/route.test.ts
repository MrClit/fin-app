import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createServiceClient } from '@/lib/supabase/service'

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(),
}))

const { POST } = await import('./route')

const SECRET = 'test-secret'
const USER_ID = '00000000-0000-0000-0000-000000000001'
const HOUSEHOLD_ID = '00000000-0000-0000-0000-0000000000a1'
const ACCOUNT_A = '00000000-0000-0000-0000-000000000aaa'
const ACCOUNT_B = '00000000-0000-0000-0000-000000000bbb'

type AccountResult = { data: { id: string } | null; error?: unknown }

type MockOpts = {
  userConfig?: { data: { user_id: string; household_id?: string } | null; error?: unknown }
  // Una entrada por tarjeta (el handler itera): select previo e insert posterior.
  accountSelects?: AccountResult[]
  accountInserts?: AccountResult[]
  rules?: { data: Array<{ pattern: string; field: string; category_id: string }> }
  txUpsert?: { error?: unknown }
}

function buildMockDb(opts: MockOpts = {}) {
  const insertSpy = vi.fn()
  const updateSpy = vi.fn()
  const upsertSpy = vi.fn()
  const rpcSpy = vi.fn()

  const userConfigBuilder: Record<string, unknown> = {}
  Object.assign(userConfigBuilder, {
    select: vi.fn(() => userConfigBuilder),
    limit: vi.fn(() => userConfigBuilder),
    maybeSingle: vi.fn(() => Promise.resolve(opts.userConfig ?? { data: null, error: null })),
  })

  const rulesBuilder: Record<string, unknown> = {}
  Object.assign(rulesBuilder, {
    select: vi.fn(() => rulesBuilder),
    eq: vi.fn(() => rulesBuilder),
    order: vi.fn(() => Promise.resolve(opts.rules ?? { data: [] })),
  })

  // `accounts` se consulta una vez por tarjeta. Se crea un builder fresco en cada
  // from('accounts') ligado al índice de tarjeta, para no arrastrar estado entre
  // iteraciones (a diferencia del mock de Edenred, de una sola cuenta).
  let accountsCall = -1
  function makeAccountsBuilder(idx: number) {
    const sel = opts.accountSelects?.[idx] ?? { data: null, error: null }
    const ins = opts.accountInserts?.[idx] ?? { data: null, error: null }
    const b: Record<string, unknown> & { _afterInsert: boolean; _afterUpdate: boolean } = {
      _afterInsert: false,
      _afterUpdate: false,
    }
    Object.assign(b, {
      select: vi.fn(() => {
        if (b._afterInsert) return { single: vi.fn(() => Promise.resolve(ins)) }
        return b
      }),
      eq: vi.fn(() => {
        if (b._afterUpdate) return Promise.resolve({ error: null })
        return b
      }),
      maybeSingle: vi.fn(() => Promise.resolve(sel)),
      insert: vi.fn((payload: unknown) => {
        insertSpy(payload)
        b._afterInsert = true
        return b
      }),
      update: vi.fn((payload: unknown) => {
        updateSpy(payload)
        b._afterUpdate = true
        return b
      }),
    })
    return b
  }

  const txBuilder = {
    upsert: vi.fn((rows: unknown, options: unknown) => {
      upsertSpy(rows, options)
      return Promise.resolve(opts.txUpsert ?? { error: null })
    }),
  }

  // El handler llama a from('accounts') dos veces por tarjeta (select + luego
  // insert/update). Se reutiliza el mismo builder en ese par y se avanza de
  // índice (siguiente tarjeta) sólo cuando el anterior ya mutó.
  let currentAccounts: ReturnType<typeof makeAccountsBuilder> | null = null
  const db = {
    from: vi.fn((table: string) => {
      if (table === 'user_config') return userConfigBuilder
      if (table === 'categorization_rules') return rulesBuilder
      if (table === 'accounts') {
        if (!currentAccounts || currentAccounts._afterInsert || currentAccounts._afterUpdate) {
          accountsCall++
          currentAccounts = makeAccountsBuilder(accountsCall)
        }
        return currentAccounts
      }
      if (table === 'transactions') return txBuilder
      throw new Error(`Unmocked table: ${table}`)
    }),
    rpc: vi.fn((fn: string) => {
      rpcSpy(fn)
      return Promise.resolve({ error: null })
    }),
  }

  return { db, insertSpy, updateSpy, upsertSpy, rpcSpy }
}

function callRoute(body: unknown, opts: { auth?: string | null; rawBody?: string } = {}) {
  const headers: Record<string, string> = {}
  if (opts.auth !== null) headers.authorization = opts.auth ?? `Bearer ${SECRET}`
  return POST(
    new Request('http://test/api/sabadell-visa', {
      method: 'POST',
      headers,
      body: opts.rawBody ?? JSON.stringify(body),
    })
  )
}

const validPayload = {
  last_synced_at: '2026-06-06T10:00:00Z',
  cards: [
    {
      card_id: '4106________4014',
      name: 'Sabadell VISA •••• 4014',
      number: '4106 •••• 4014',
      balance: -156.2,
      transactions: [
        { external_id: 'ref-1', amount: -156.2, description: 'Zara.com', transaction_date: '2026-05-25' },
      ],
    },
    {
      card_id: '4106________5011',
      name: 'Sabadell VISA •••• 5011',
      number: '4106 •••• 5011',
      balance: -14.99,
      transactions: [
        { external_id: 'ref-2', amount: -14.99, description: 'Pago sin patrón', transaction_date: '2026-05-20' },
      ],
    },
  ],
}

beforeEach(() => {
  vi.stubEnv('SABADELL_VISA_WEBHOOK_SECRET', SECRET)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('POST /api/sabadell-visa — auth', () => {
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

describe('POST /api/sabadell-visa — configuración', () => {
  it('devuelve 500 si falta SABADELL_VISA_WEBHOOK_SECRET', async () => {
    vi.unstubAllEnvs()
    delete process.env.SABADELL_VISA_WEBHOOK_SECRET
    const { db } = buildMockDb()
    vi.mocked(createServiceClient).mockReturnValue(db as unknown as ReturnType<typeof createServiceClient>)
    const res = await callRoute(validPayload)
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Server misconfigured' })
  })
})

describe('POST /api/sabadell-visa — validación de body', () => {
  it.each<[string, string | object]>([
    ['JSON no parseable', 'not-json{'],
    ['falta cards', { last_synced_at: '2026-06-06T10:00:00Z' }],
    ['cards no es array', { last_synced_at: 'x', cards: 'oops' }],
    ['card sin card_id', { last_synced_at: 'x', cards: [{ name: 'n', balance: 0, transactions: [] }] }],
    [
      'tx con amount string',
      {
        last_synced_at: 'x',
        cards: [
          {
            card_id: 'c1',
            name: 'n',
            balance: 0,
            transactions: [{ external_id: 'a', amount: 'mal', description: 'x', transaction_date: '2026-05-18' }],
          },
        ],
      },
    ],
  ])('devuelve 400 cuando %s', async (_label, body) => {
    const { db } = buildMockDb()
    vi.mocked(createServiceClient).mockReturnValue(db as unknown as ReturnType<typeof createServiceClient>)
    const res = typeof body === 'string' ? await callRoute(null, { rawBody: body }) : await callRoute(body)
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Invalid body' })
  })
})

describe('POST /api/sabadell-visa — user_config', () => {
  it('devuelve 500 si user_config está vacío', async () => {
    const { db } = buildMockDb({ userConfig: { data: null, error: null } })
    vi.mocked(createServiceClient).mockReturnValue(db as unknown as ReturnType<typeof createServiceClient>)
    const res = await callRoute(validPayload)
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'No user configured' })
  })
})

describe('POST /api/sabadell-visa — primer POST (crea cuentas)', () => {
  it('inserta una cuenta de tarjeta por cada card y upsertea sus txns', async () => {
    const { db, insertSpy, upsertSpy, rpcSpy } = buildMockDb({
      userConfig: { data: { user_id: USER_ID, household_id: HOUSEHOLD_ID }, error: null },
      accountSelects: [{ data: null }, { data: null }],
      accountInserts: [{ data: { id: ACCOUNT_A } }, { data: { id: ACCOUNT_B } }],
    })
    vi.mocked(createServiceClient).mockReturnValue(db as unknown as ReturnType<typeof createServiceClient>)

    const res = await callRoute(validPayload)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ cards: 2, created_accounts: 2, upserted: 2 })

    expect(insertSpy).toHaveBeenCalledTimes(2)
    expect(insertSpy).toHaveBeenNthCalledWith(1, expect.objectContaining({
      household_id: HOUSEHOLD_ID,
      name: 'Sabadell VISA •••• 4014',
      type: 'card',
      source: 'scraper',
      is_liability: true,
      balance: -156.2,
      external_id: '4106________4014',
      number: '4106 •••• 4014',
      currency: 'EUR',
    }))

    const [rows] = upsertSpy.mock.calls[0]
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ account_id: ACCOUNT_A, external_id: 'ref-1', source: 'scraper' })
    expect(rows[1]).toMatchObject({ account_id: ACCOUNT_B, external_id: 'ref-2' })
    // Auto-categorización: "Zara.com" → clothing; sin patrón → null
    expect(rows[0].category).toBe('clothing')
    expect(rows[1].category).toBeNull()
    // is_read no se envía (preserva estado de lectura en re-syncs)
    expect(rows[0]).not.toHaveProperty('is_read')
    // Refresca la matview
    expect(rpcSpy).toHaveBeenCalledWith('refresh_monthly_summary')
  })
})

describe('POST /api/sabadell-visa — POST siguiente (actualiza cuentas)', () => {
  it('actualiza balance/last_synced/name de cada cuenta existente sin insertar', async () => {
    const { db, insertSpy, updateSpy } = buildMockDb({
      userConfig: { data: { user_id: USER_ID, household_id: HOUSEHOLD_ID }, error: null },
      accountSelects: [{ data: { id: ACCOUNT_A } }, { data: { id: ACCOUNT_B } }],
    })
    vi.mocked(createServiceClient).mockReturnValue(db as unknown as ReturnType<typeof createServiceClient>)

    const res = await callRoute(validPayload)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ cards: 2, created_accounts: 0, upserted: 2 })
    expect(insertSpy).not.toHaveBeenCalled()
    expect(updateSpy).toHaveBeenCalledTimes(2)
    expect(updateSpy).toHaveBeenNthCalledWith(1, {
      balance: -156.2,
      last_synced: validPayload.last_synced_at,
      name: 'Sabadell VISA •••• 4014',
    })
  })
})

describe('POST /api/sabadell-visa — idempotencia', () => {
  it('upsert con onConflict="household_id,external_id" e ignoreDuplicates=false', async () => {
    const { db, upsertSpy } = buildMockDb({
      userConfig: { data: { user_id: USER_ID, household_id: HOUSEHOLD_ID }, error: null },
      accountSelects: [{ data: { id: ACCOUNT_A } }, { data: { id: ACCOUNT_B } }],
    })
    vi.mocked(createServiceClient).mockReturnValue(db as unknown as ReturnType<typeof createServiceClient>)
    await callRoute(validPayload)
    const [, options] = upsertSpy.mock.calls[0]
    expect(options).toEqual({ onConflict: 'household_id,external_id', ignoreDuplicates: false })
  })
})
