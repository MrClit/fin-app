import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getAccountTransactions, type EBTransaction } from '@/lib/enablebanking'
import {
  balanceFromEbTransactions,
  normalizeEbTransactions,
  syncEbAccount,
} from './enablebanking'
import type { IngestDb } from './types'
import { at, callAt } from '@/tests/helpers'

vi.mock('@/lib/enablebanking', () => ({
  getAccountTransactions: vi.fn(),
}))

const OWNER = {
  userId: '00000000-0000-0000-0000-000000000001',
  householdId: '00000000-0000-0000-0000-0000000000a1',
}
const ACCOUNT_ID = '00000000-0000-0000-0000-000000000aaa'

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
    balance_after_transaction: null,
    ...overrides,
  }
}

function buildMockDb(opts: { txUpsert?: { error?: unknown } } = {}) {
  const upsertSpy = vi.fn()
  const updateSpy = vi.fn()

  const accountsBuilder = () => {
    const b: Record<string, unknown> = {}
    Object.assign(b, {
      update: (patch: unknown) => {
        updateSpy(patch)
        return b
      },
      eq: () => Promise.resolve({ error: null }),
    })
    return b
  }

  const db = {
    from: vi.fn((table: string) => {
      if (table === 'accounts') return accountsBuilder()
      if (table === 'transactions') {
        return {
          upsert: (rows: unknown, options: unknown) => {
            upsertSpy(rows, options)
            return Promise.resolve(opts.txUpsert ?? { error: null })
          },
        }
      }
      throw new Error(`Unmocked table: ${table}`)
    }),
  }

  return { db: db as unknown as IngestDb, upsertSpy, updateSpy }
}

function account(overrides: Partial<Parameters<typeof syncEbAccount>[1]['account']> = {}) {
  return {
    id: ACCOUNT_ID,
    external_id: 'eb-account-a',
    session_id: 'session-a',
    last_synced: null,
    ...overrides,
  }
}

function sync(db: IngestDb, overrides: Partial<Parameters<typeof syncEbAccount>[1]> = {}) {
  return syncEbAccount(db, {
    account: account(),
    owner: OWNER,
    categorize: () => null,
    tag: '[test]',
    ...overrides,
  })
}

beforeEach(() => {
  vi.mocked(getAccountTransactions).mockResolvedValue([])
})

describe('normalizeEbTransactions', () => {
  it('aplica el signo según credit_debit_indicator', () => {
    const [debit, credit] = normalizeEbTransactions([
      ebTx({ credit_debit_indicator: 'DBIT' }),
      ebTx({ credit_debit_indicator: 'CRDT' }),
    ])

    expect(debit?.amount).toBe(-25.4)
    expect(credit?.amount).toBe(25.4)
  })

  it('prefiere entry_reference y cae a transaction_id', () => {
    const [conRef, sinRef] = normalizeEbTransactions([
      ebTx(),
      ebTx({ entry_reference: null }),
    ])

    expect(conRef?.externalId).toBe('ref-1')
    expect(sinRef?.externalId).toBe('tx-1')
  })

  it('recorre la cascada de descripción: remittance, acreedor, deudor', () => {
    const descriptions = normalizeEbTransactions([
      ebTx({ remittance_information: ['  Con espacios  '] }),
      ebTx({ remittance_information: null, creditor: { name: 'Acreedor SL' } }),
      ebTx({ remittance_information: [''], creditor: null, debtor: { name: 'Deudor SL' } }),
      ebTx({ remittance_information: null, creditor: null, debtor: null }),
    ]).map(tx => tx.description)

    expect(descriptions).toEqual(['Con espacios', 'Acreedor SL', 'Deudor SL', 'Sin descripción'])
  })

  it('emite merchant sólo cuando EB nombra a la contraparte', () => {
    const [conComercio, sinComercio] = normalizeEbTransactions([
      ebTx({ creditor: { name: 'Mercadona' } }),
      ebTx(),
    ])

    expect(conComercio?.merchant).toBe('Mercadona')
    expect(sinComercio).not.toHaveProperty('merchant')
  })
})

describe('balanceFromEbTransactions', () => {
  it('toma el saldo posterior al último movimiento', () => {
    const balance = balanceFromEbTransactions([
      ebTx({ balance_after_transaction: { amount: '100.00', currency: 'EUR' } }),
      ebTx({ balance_after_transaction: { amount: '74.60', currency: 'EUR' } }),
    ])

    expect(balance).toBe(74.6)
  })

  it('devuelve null sin movimientos o si EB no emite el saldo', () => {
    expect(balanceFromEbTransactions([])).toBeNull()
    expect(balanceFromEbTransactions([ebTx()])).toBeNull()
  })
})

describe('syncEbAccount', () => {
  it('pide los movimientos desde el día de la última sincronización', async () => {
    const { db } = buildMockDb()

    await sync(db, { account: account({ last_synced: '2026-07-01T10:30:00Z' }) })

    expect(getAccountTransactions).toHaveBeenCalledWith(
      'eb-account-a',
      'session-a',
      '2026-07-01'
    )
  })

  it('upsertea sin pisar los movimientos ya importados', async () => {
    const { db, upsertSpy } = buildMockDb()
    vi.mocked(getAccountTransactions).mockResolvedValue([ebTx()])

    const result = await sync(db, { categorize: () => 'groceries' })

    expect(result).toEqual({ ok: true, upserted: 1 })
    const [rows, options] = callAt(upsertSpy, 0)
    expect(options).toMatchObject({ ignoreDuplicates: true })
    expect(at(rows as unknown[], 0)).toMatchObject({
      user_id: OWNER.userId,
      household_id: OWNER.householdId,
      account_id: ACCOUNT_ID,
      source: 'enablebanking',
      category: 'groceries',
    })
  })

  it('no llama a EB si la cuenta no tiene conexión viva', async () => {
    const { db, updateSpy } = buildMockDb()

    const sinExternal = await sync(db, { account: account({ external_id: null }) })
    const sinSesion = await sync(db, { account: account({ session_id: null }) })

    expect(sinExternal).toEqual({ ok: true, upserted: 0 })
    expect(sinSesion).toEqual({ ok: true, upserted: 0 })
    expect(getAccountTransactions).not.toHaveBeenCalled()
    expect(updateSpy).not.toHaveBeenCalled()
  })

  it('marca la cuenta como sincronizada aunque no haya movimientos nuevos', async () => {
    const { db, upsertSpy, updateSpy } = buildMockDb()

    const result = await sync(db)

    expect(result).toEqual({ ok: true, upserted: 0 })
    expect(upsertSpy).not.toHaveBeenCalled()
    const [patch] = callAt(updateSpy, 0)
    // Sin saldo que aplicar, no se emite la columna: no se pisa el que hubiera.
    expect(patch).not.toHaveProperty('balance')
    expect(patch).toHaveProperty('last_synced')
  })

  it('devuelve el fallo de EB sin tocar la cuenta', async () => {
    const { db, updateSpy } = buildMockDb()
    vi.mocked(getAccountTransactions).mockRejectedValue(new Error('EB 500'))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await sync(db)

    expect(result).toEqual({ ok: false, error: 'EB 500' })
    expect(updateSpy).not.toHaveBeenCalled()
  })

  it('no avanza last_synced si el upsert falló', async () => {
    // `last_synced` es el `date_from` de la siguiente petición a EB: avanzarlo
    // tras un upsert fallido perdería esos movimientos para siempre (#331).
    const { db, updateSpy } = buildMockDb({ txUpsert: { error: { message: 'boom' } } })
    vi.mocked(getAccountTransactions).mockResolvedValue([ebTx()])
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await sync(db)

    expect(result).toEqual({ ok: false, error: 'boom' })
    expect(updateSpy).not.toHaveBeenCalled()
  })

  it('actualiza el saldo con el posterior al último movimiento', async () => {
    const { db, updateSpy } = buildMockDb()
    vi.mocked(getAccountTransactions).mockResolvedValue([
      ebTx({ balance_after_transaction: { amount: '1200.55', currency: 'EUR' } }),
    ])

    await sync(db)

    expect(callAt(updateSpy, 0)[0]).toMatchObject({ balance: 1200.55 })
  })
})
