import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createServiceClient } from '@/lib/supabase/service'
import { getAccountTransactions, type EBTransaction } from '@/lib/enablebanking'
import { sendPushToUser } from '@/lib/push'
import { at, callAt } from '@/tests/helpers'

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(),
}))

vi.mock('@/lib/enablebanking', () => ({
  getAccountTransactions: vi.fn(),
}))

// `selectAccountsToNotify` y `getConsentStatus` se dejan reales: son los que
// deciden qué cuenta entra en la ventana crítica. Sólo se intercepta el envío.
vi.mock('@/lib/push', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/push')>()),
  sendPushToUser: vi.fn(async () => {}),
}))

const { POST } = await import('./route')

const SECRET = 'test-secret'
const USER_A = '00000000-0000-0000-0000-000000000001'
const USER_B = '00000000-0000-0000-0000-000000000002'
const HOUSEHOLD_A = '00000000-0000-0000-0000-0000000000a1'
const HOUSEHOLD_B = '00000000-0000-0000-0000-0000000000b1'
const ACCOUNT_A = '00000000-0000-0000-0000-000000000aaa'
const ACCOUNT_B = '00000000-0000-0000-0000-000000000bbb'

type AccountRow = {
  id: string
  user_id: string
  household_id: string
  name: string
  external_id: string | null
  session_id: string | null
  last_synced: string | null
  consent_expires_at: string | null
  consent_reminder_sent_for: string | null
}

type RuleRow = {
  household_id: string
  pattern: string
  field: string
  category_id: string
}

type MockOpts = {
  accounts?: AccountRow[]
  accountsError?: unknown
  rules?: RuleRow[]
  rulesError?: unknown
  txUpsert?: { error?: unknown }
}

function buildMockDb(opts: MockOpts = {}) {
  const upsertSpy = vi.fn()
  /** `[patch, accountId]` de cada accounts.update, en orden. */
  const updates: Array<[unknown, unknown]> = []

  const accountsResult = {
    data: opts.accountsError ? null : (opts.accounts ?? []),
    error: opts.accountsError ?? null,
  }

  function accountsBuilder() {
    const b: Record<string, unknown> & { _patch?: unknown } = {}
    Object.assign(b, {
      select: () => b,
      eq: (column: string, value: unknown) => {
        if ('_patch' in b) {
          updates.push([b._patch, value])
          return Promise.resolve({ error: null })
        }
        void column
        return b
      },
      update: (patch: unknown) => {
        b._patch = patch
        return b
      },
      then: (resolve: (value: unknown) => unknown) => resolve(accountsResult),
    })
    return b
  }

  const rulesBuilder: Record<string, unknown> = {}
  Object.assign(rulesBuilder, {
    select: () => rulesBuilder,
    in: () => rulesBuilder,
    eq: () => rulesBuilder,
    order: () =>
      Promise.resolve({
        data: opts.rulesError ? null : (opts.rules ?? []),
        error: opts.rulesError ?? null,
      }),
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

  return { db, upsertSpy, updates }
}

function useDb(opts: MockOpts = {}) {
  const mock = buildMockDb(opts)
  vi.mocked(createServiceClient).mockReturnValue(
    mock.db as unknown as ReturnType<typeof createServiceClient>
  )
  return mock
}

function callRoute({ auth }: { auth?: string | null } = {}) {
  const headers: Record<string, string> = {}
  if (auth !== null) headers.authorization = auth ?? `Bearer ${SECRET}`
  return POST(
    new Request('http://test/api/sync/enablebanking/cron', { method: 'POST', headers })
  )
}

/** Consentimiento vivo y fuera de la ventana de aviso (>7 días). */
const FAR_EXPIRY = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()

function account(overrides: Partial<AccountRow> = {}): AccountRow {
  return {
    id: ACCOUNT_A,
    user_id: USER_A,
    household_id: HOUSEHOLD_A,
    name: 'Sabadell corriente',
    external_id: 'eb-account-a',
    session_id: 'session-a',
    last_synced: null,
    consent_expires_at: FAR_EXPIRY,
    consent_reminder_sent_for: null,
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
    remittance_information: ['Pago sin patrón'],
    creditor: null,
    debtor: null,
    balance_after_transaction: { amount: '1200.55', currency: 'EUR' },
    ...overrides,
  }
}

beforeEach(() => {
  vi.stubEnv('ENABLEBANKING_WEBHOOK_SECRET', SECRET)
  vi.mocked(getAccountTransactions).mockResolvedValue([])
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('POST /api/sync/enablebanking/cron — auth', () => {
  it('devuelve 500 si el secreto no está configurado', async () => {
    vi.stubEnv('ENABLEBANKING_WEBHOOK_SECRET', '')
    const { db } = useDb()
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const res = await callRoute()

    expect(res.status).toBe(500)
    expect(db.from).not.toHaveBeenCalled()
  })

  it('devuelve 401 sin header Authorization', async () => {
    const { db } = useDb()

    const res = await callRoute({ auth: null })

    expect(res.status).toBe(401)
    expect(db.from).not.toHaveBeenCalled()
  })

  it('devuelve 401 con un Bearer incorrecto', async () => {
    const { db } = useDb()

    const res = await callRoute({ auth: 'Bearer wrong' })

    expect(res.status).toBe(401)
    expect(db.from).not.toHaveBeenCalled()
  })
})

describe('POST /api/sync/enablebanking/cron — barrido', () => {
  it('responde con los contadores a cero si no hay cuentas', async () => {
    useDb({ accounts: [] })

    const res = await callRoute()

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ synced: 0, accounts: 0, skipped: [], failed: [] })
  })

  it('devuelve 500 si falla la consulta de cuentas', async () => {
    useDb({ accountsError: { message: 'db down' } })
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const res = await callRoute()

    expect(res.status).toBe(500)
  })

  it('devuelve 500 si falla la consulta de reglas', async () => {
    useDb({ accounts: [account()], rulesError: { message: 'db down' } })
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const res = await callRoute()

    expect(res.status).toBe(500)
  })

  it('sincroniza y upsertea sin pisar los movimientos ya importados', async () => {
    const { upsertSpy } = useDb({ accounts: [account()] })
    vi.mocked(getAccountTransactions).mockResolvedValue([ebTx()])

    const res = await callRoute()

    expect(await res.json()).toMatchObject({ synced: 1, accounts: 1, skipped: [], failed: [] })
    const [rows, options] = callAt(upsertSpy, 0)
    expect(options).toEqual({
      onConflict: 'household_id,external_id',
      ignoreDuplicates: true,
    })
    expect(rows).toEqual([
      {
        user_id: USER_A,
        household_id: HOUSEHOLD_A,
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

  it('aplica a cada cuenta las reglas de SU hogar', async () => {
    const { upsertSpy } = useDb({
      accounts: [
        account(),
        account({ id: ACCOUNT_B, user_id: USER_B, household_id: HOUSEHOLD_B }),
      ],
      rules: [
        { household_id: HOUSEHOLD_A, pattern: 'sin patrón', field: 'description', category_id: 'shopping' },
        { household_id: HOUSEHOLD_B, pattern: 'sin patrón', field: 'description', category_id: 'health' },
      ],
    })
    vi.mocked(getAccountTransactions).mockResolvedValue([ebTx()])

    await callRoute()

    const categoryOf = (call: number) =>
      (callAt(upsertSpy, call)[0] as Array<{ category: string | null }>)[0]?.category
    expect(categoryOf(0)).toBe('shopping')
    expect(categoryOf(1)).toBe('health')
  })
})

describe('POST /api/sync/enablebanking/cron — consentimiento caducado', () => {
  it('salta las cuentas caducadas y las reporta en skipped', async () => {
    useDb({
      accounts: [
        account({ consent_expires_at: new Date(Date.now() - 1000).toISOString() }),
        account({ id: ACCOUNT_B, consent_expires_at: null }),
      ],
    })

    const res = await callRoute()

    expect(await res.json()).toMatchObject({
      synced: 0,
      accounts: 0,
      skipped: [
        { account_id: ACCOUNT_A, reason: 'consent_expired' },
        { account_id: ACCOUNT_B, reason: 'consent_expired' },
      ],
    })
    expect(getAccountTransactions).not.toHaveBeenCalled()
  })
})

describe('POST /api/sync/enablebanking/cron — fallos por cuenta', () => {
  it('reporta el fallo de EB y sigue con la siguiente cuenta', async () => {
    const { upsertSpy } = useDb({
      accounts: [account(), account({ id: ACCOUNT_B, external_id: 'eb-account-b' })],
    })
    vi.mocked(getAccountTransactions)
      .mockRejectedValueOnce(new Error('EB 500'))
      .mockResolvedValueOnce([ebTx({ entry_reference: 'ref-2' })])
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const res = await callRoute()

    expect(await res.json()).toMatchObject({
      synced: 1,
      accounts: 2,
      failed: [{ account_id: ACCOUNT_A, error: 'EB 500' }],
    })
    expect(upsertSpy).toHaveBeenCalledOnce()
  })

  it('reporta el fallo del upsert y no avanza last_synced de esa cuenta', async () => {
    const { updates } = useDb({
      accounts: [account()],
      txUpsert: { error: { message: 'boom' } },
    })
    vi.mocked(getAccountTransactions).mockResolvedValue([ebTx()])
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const res = await callRoute()

    expect(await res.json()).toMatchObject({
      synced: 0,
      failed: [{ account_id: ACCOUNT_A, error: 'boom' }],
    })
    expect(updates).toEqual([])
  })
})

describe('POST /api/sync/enablebanking/cron — aviso de caducidad PSD2', () => {
  /** Dentro de la ventana crítica (≤7 días) y todavía sincronizable. */
  const SOON = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()

  it('manda un solo push por usuario y marca las cuentas como avisadas', async () => {
    const { updates } = useDb({
      accounts: [
        account({ consent_expires_at: SOON }),
        account({ id: ACCOUNT_B, consent_expires_at: SOON }),
      ],
    })

    const res = await callRoute()

    expect(await res.json()).toMatchObject({ notified: 2 })
    expect(sendPushToUser).toHaveBeenCalledOnce()
    const marked = updates.filter(([patch]) =>
      Object.hasOwn(patch as object, 'consent_reminder_sent_for')
    )
    expect(marked).toHaveLength(2)
    expect(at(marked, 0)[0]).toEqual({ consent_reminder_sent_for: SOON })
  })

  it('no reavisa si ya se notificó este ciclo de caducidad', async () => {
    useDb({
      accounts: [account({ consent_expires_at: SOON, consent_reminder_sent_for: SOON })],
    })

    const res = await callRoute()

    expect(await res.json()).toMatchObject({ notified: 0 })
    expect(sendPushToUser).not.toHaveBeenCalled()
  })
})
