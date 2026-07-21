import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { getCurrentUser, getCurrentHouseholdId, getRequestClient } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/service'
import { getAccountTransactions, type EBTransaction } from '@/lib/enablebanking'
import { SYNC_COOLDOWN_MS } from '@/lib/sync'
import { callAt } from '@/tests/helpers'

vi.mock('@/lib/auth/session', () => ({
  getCurrentUser: vi.fn(),
  getCurrentHouseholdId: vi.fn(),
  getRequestClient: vi.fn(),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(),
}))

vi.mock('@/lib/enablebanking', () => ({
  getAccountTransactions: vi.fn(),
}))

// El 500 de `withAuth` pasa por logError, que escribiría en la BD real.
vi.mock('@/lib/error-log', () => ({
  logError: vi.fn(async () => {}),
}))

const { POST } = await import('./route')

const USER_ID = '00000000-0000-0000-0000-000000000001'
const HOUSEHOLD_ID = '00000000-0000-0000-0000-0000000000a1'
const ACCOUNT_A = '00000000-0000-0000-0000-000000000aaa'
const ACCOUNT_B = '00000000-0000-0000-0000-000000000bbb'

type AccountRow = {
  id: string
  external_id: string | null
  session_id: string | null
  last_synced: string | null
}

type MockOpts = {
  accounts?: AccountRow[]
  accountsError?: unknown
  rules?: Array<{ pattern: string; field: string; category_id: string }>
  txUpsert?: { error?: unknown }
}

/**
 * Mock de Supabase para el sync manual. `accounts` se usa en dos modos dentro de
 * la misma petición: una consulta (encadenable y "thenable", porque la ruta la
 * mete en un `Promise.all`) y luego un update por cuenta.
 */
function buildMockDb(opts: MockOpts = {}) {
  const upsertSpy = vi.fn()
  const updateSpy = vi.fn()
  /** Filtros `.eq`/`.gt` de la consulta de cuentas, para comprobar el scoping. */
  const accountFilters: Array<[string, unknown]> = []

  const accountsResult = {
    data: opts.accountsError ? null : (opts.accounts ?? []),
    error: opts.accountsError ?? null,
  }

  function accountsBuilder() {
    const b: Record<string, unknown> & { _update: boolean } = { _update: false }
    Object.assign(b, {
      select: () => b,
      eq: (column: string, value: unknown) => {
        if (b._update) return Promise.resolve({ error: null })
        accountFilters.push([column, value])
        return b
      },
      gt: (column: string, value: unknown) => {
        accountFilters.push([column, value])
        return b
      },
      update: (patch: unknown) => {
        updateSpy(patch)
        b._update = true
        return b
      },
      // La consulta se resuelve al await del Promise.all de la ruta.
      then: (resolve: (value: unknown) => unknown) => resolve(accountsResult),
    })
    return b
  }

  const rulesBuilder: Record<string, unknown> = {}
  Object.assign(rulesBuilder, {
    select: () => rulesBuilder,
    eq: () => rulesBuilder,
    order: () => Promise.resolve({ data: opts.rules ?? [], error: null }),
  })

  const txBuilder = {
    upsert: (rows: unknown, options: unknown) => {
      upsertSpy(rows, options)
      return Promise.resolve(opts.txUpsert ?? { error: null })
    },
  }

  const db = {
    from: vi.fn((table: string) => {
      if (table === 'accounts') return accountsBuilder()
      if (table === 'categorization_rules') return rulesBuilder
      if (table === 'transactions') return txBuilder
      throw new Error(`Unmocked table: ${table}`)
    }),
  }

  return { db, upsertSpy, updateSpy, accountFilters }
}

function mockSession({ user = { id: USER_ID }, householdId = HOUSEHOLD_ID } = {}) {
  vi.mocked(getCurrentUser).mockResolvedValue(user as never)
  vi.mocked(getCurrentHouseholdId).mockResolvedValue(householdId)
  vi.mocked(getRequestClient).mockResolvedValue({} as never)
}

function useDb(opts: MockOpts = {}) {
  const mock = buildMockDb(opts)
  vi.mocked(createServiceClient).mockReturnValue(
    mock.db as unknown as ReturnType<typeof createServiceClient>
  )
  return mock
}

function callRoute(body?: unknown) {
  return POST(
    new NextRequest('http://test/api/sync/enablebanking', {
      method: 'POST',
      ...(body !== undefined && { body: JSON.stringify(body) }),
    })
  )
}

function account(overrides: Partial<AccountRow> = {}): AccountRow {
  return {
    id: ACCOUNT_A,
    external_id: 'eb-account-a',
    session_id: 'session-a',
    last_synced: null,
    ...overrides,
  }
}

function ebTx(overrides: Partial<EBTransaction> = {}): EBTransaction {
  return {
    entry_reference: 'ref-1',
    transaction_id: 'tx-1',
    booking_date: '2026-07-01',
    transaction_amount: { amount: '25.40', currency: 'EUR' },
    credit_debit_indicator: 'DBIT',
    // Descripción sin patrón: `categorizeWithRules` cae a AUTO_RULES cuando el
    // hogar no tiene reglas, así que un comercio conocido categorizaría solo.
    remittance_information: ['Pago sin patrón'],
    creditor: null,
    debtor: null,
    balance_after_transaction: { amount: '1200.55', currency: 'EUR' },
    ...overrides,
  }
}

beforeEach(() => {
  mockSession()
  vi.mocked(getAccountTransactions).mockResolvedValue([])
})

describe('POST /api/sync/enablebanking — auth', () => {
  it('rechaza con 401 sin sesión', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null as never)
    const { db } = useDb()

    const res = await callRoute()

    expect(res.status).toBe(401)
    expect(db.from).not.toHaveBeenCalled()
  })

  it('rechaza con 401 si el usuario no tiene hogar', async () => {
    vi.mocked(getCurrentHouseholdId).mockResolvedValue(null)
    const { db } = useDb()

    const res = await callRoute()

    expect(res.status).toBe(401)
    expect(db.from).not.toHaveBeenCalled()
  })
})

describe('POST /api/sync/enablebanking — selección de cuentas', () => {
  it('responde 0/0 y no llama a EB si no hay cuentas sincronizables', async () => {
    useDb({ accounts: [] })

    const res = await callRoute()

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ synced: 0, accounts: 0 })
    expect(getAccountTransactions).not.toHaveBeenCalled()
  })

  it('acota la consulta al hogar, al origen enablebanking y a los consentimientos vivos', async () => {
    const { accountFilters } = useDb({ accounts: [] })

    await callRoute()

    expect(accountFilters).toContainEqual(['household_id', HOUSEHOLD_ID])
    expect(accountFilters).toContainEqual(['source', 'enablebanking'])
    expect(accountFilters).toContainEqual(['is_active', true])
    expect(accountFilters.map(([column]) => column)).toContain('consent_expires_at')
  })

  it('con accountId en el body restringe la sync a esa cuenta', async () => {
    const { accountFilters } = useDb({ accounts: [account()] })

    await callRoute({ accountId: ACCOUNT_B })

    expect(accountFilters).toContainEqual(['id', ACCOUNT_B])
  })

  it('rechaza con 400 un accountId que no es un UUID', async () => {
    useDb({ accounts: [account()] })

    const res = await callRoute({ accountId: 'no-es-uuid' })

    expect(res.status).toBe(400)
  })
})

describe('POST /api/sync/enablebanking — cooldown', () => {
  it('devuelve 429 con availableAt si la última sync es reciente', async () => {
    const lastSynced = new Date(Date.now() - 60_000).toISOString()
    useDb({ accounts: [account({ last_synced: lastSynced })] })

    const res = await callRoute()

    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body.error).toBe('cooldown')
    expect(new Date(body.availableAt).getTime()).toBe(
      new Date(lastSynced).getTime() + SYNC_COOLDOWN_MS
    )
    expect(getAccountTransactions).not.toHaveBeenCalled()
  })

  it('deja pasar la sync si el cooldown ya venció', async () => {
    const lastSynced = new Date(Date.now() - SYNC_COOLDOWN_MS - 1000).toISOString()
    useDb({ accounts: [account({ last_synced: lastSynced })] })

    const res = await callRoute()

    expect(res.status).toBe(200)
    expect(getAccountTransactions).toHaveBeenCalledOnce()
  })
})

describe('POST /api/sync/enablebanking — ingesta', () => {
  it('upsertea los movimientos sin pisar los ya importados', async () => {
    const { upsertSpy } = useDb({ accounts: [account()] })
    vi.mocked(getAccountTransactions).mockResolvedValue([ebTx()])

    const res = await callRoute()

    expect(await res.json()).toEqual({ synced: 1, accounts: 1 })
    const [rows, options] = callAt(upsertSpy, 0)
    expect(options).toEqual({
      onConflict: 'household_id,external_id',
      ignoreDuplicates: true,
    })
    expect(rows).toEqual([
      {
        user_id: USER_ID,
        household_id: HOUSEHOLD_ID,
        account_id: ACCOUNT_A,
        date: '2026-07-01',
        amount: -25.4,
        description: 'Pago sin patrón',
        category: null,
        source: 'enablebanking',
        external_id: 'ref-1',
      },
    ])
  })

  it('categoriza con las reglas del hogar (descripción y comercio)', async () => {
    const { upsertSpy } = useDb({
      accounts: [account()],
      rules: [{ pattern: 'mercadona', field: 'description', category_id: 'groceries' }],
    })
    vi.mocked(getAccountTransactions).mockResolvedValue([
      ebTx({ remittance_information: ['COMPRA MERCADONA 4021'] }),
    ])

    await callRoute()

    const [rows] = callAt(upsertSpy, 0)
    expect((rows as Array<{ category: string | null }>)[0]?.category).toBe('groceries')
  })

  it('actualiza balance y last_synced desde el último movimiento', async () => {
    const { updateSpy } = useDb({ accounts: [account()] })
    vi.mocked(getAccountTransactions).mockResolvedValue([ebTx()])

    await callRoute()

    const [patch] = callAt(updateSpy, 0)
    expect(patch).toMatchObject({ balance: 1200.55 })
    expect(typeof (patch as { last_synced: string }).last_synced).toBe('string')
  })

  it('sin movimientos no upsertea, pero sí marca la cuenta como sincronizada', async () => {
    const { upsertSpy, updateSpy } = useDb({ accounts: [account()] })

    const res = await callRoute()

    expect(await res.json()).toEqual({ synced: 0, accounts: 1 })
    expect(upsertSpy).not.toHaveBeenCalled()
    const [patch] = callAt(updateSpy, 0)
    expect(patch).not.toHaveProperty('balance')
  })

  it('salta las cuentas sin external_id o session_id', async () => {
    const { updateSpy } = useDb({
      accounts: [account({ external_id: null }), account({ id: ACCOUNT_B, session_id: null })],
    })

    const res = await callRoute()

    expect(await res.json()).toEqual({ synced: 0, accounts: 2 })
    expect(getAccountTransactions).not.toHaveBeenCalled()
    expect(updateSpy).not.toHaveBeenCalled()
  })

  it('un fallo de EB en una cuenta no impide sincronizar la siguiente', async () => {
    const { upsertSpy } = useDb({
      accounts: [account(), account({ id: ACCOUNT_B, external_id: 'eb-account-b' })],
    })
    vi.mocked(getAccountTransactions)
      .mockRejectedValueOnce(new Error('EB 500'))
      .mockResolvedValueOnce([ebTx({ entry_reference: 'ref-2' })])
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const res = await callRoute()

    expect(await res.json()).toEqual({ synced: 1, accounts: 2 })
    expect(upsertSpy).toHaveBeenCalledOnce()
  })

  it('no cuenta como sincronizados los movimientos de un upsert fallido', async () => {
    useDb({ accounts: [account()], txUpsert: { error: { message: 'boom' } } })
    vi.mocked(getAccountTransactions).mockResolvedValue([ebTx()])
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const res = await callRoute()

    expect(await res.json()).toEqual({ synced: 0, accounts: 1 })
  })

  it('no avanza last_synced si el upsert falló', async () => {
    // `last_synced` es el `dateFrom` de la siguiente sync: avanzarlo tras un
    // upsert fallido perdería esos movimientos para siempre (#331). El cron ya
    // se comportaba así; el sync manual no.
    const { updateSpy } = useDb({
      accounts: [account()],
      txUpsert: { error: { message: 'boom' } },
    })
    vi.mocked(getAccountTransactions).mockResolvedValue([ebTx()])
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await callRoute()

    expect(updateSpy).not.toHaveBeenCalled()
  })

  it('devuelve 500 si falla la consulta de cuentas', async () => {
    useDb({ accountsError: { message: 'db down' } })
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const res = await callRoute()

    expect(res.status).toBe(500)
  })
})
