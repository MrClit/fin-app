import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getConsentStatus,
  getConsentBannerData,
  getActiveAccounts,
  getManualAccountId,
} from './accounts'
import { argsOf, called, createFakeSupabase, queryAt } from '@/tests/supabase-fake'
import type { Account } from '@/types'

const DAY_MS = 86_400_000
const NOW = new Date('2026-05-21T12:00:00.000Z')

/** ISO de una fecha situada a `days` días de NOW (negativo = en el pasado). */
function isoInDays(days: number): string {
  return new Date(NOW.getTime() + days * DAY_MS).toISOString()
}

type ConsentAccount = Pick<Account, 'name' | 'source' | 'consent_expires_at'>

function account(over: Partial<ConsentAccount> = {}): ConsentAccount {
  return {
    name: 'Cuenta Corriente',
    source: 'enablebanking',
    consent_expires_at: isoInDays(30),
    ...over,
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('getConsentStatus', () => {
  it('clasifica como ok cuando faltan más de 14 días', () => {
    expect(getConsentStatus(isoInDays(30))).toEqual({ status: 'ok', daysLeft: 30 })
    expect(getConsentStatus(isoInDays(15)).status).toBe('ok')
  })

  it('clasifica como warning entre 7 y 14 días (ambos inclusive)', () => {
    expect(getConsentStatus(isoInDays(14))).toEqual({ status: 'warning', daysLeft: 14 })
    expect(getConsentStatus(isoInDays(10))).toEqual({ status: 'warning', daysLeft: 10 })
    expect(getConsentStatus(isoInDays(7))).toEqual({ status: 'warning', daysLeft: 7 })
  })

  it('clasifica como critical con menos de 7 días', () => {
    expect(getConsentStatus(isoInDays(6))).toEqual({ status: 'critical', daysLeft: 6 })
    expect(getConsentStatus(isoInDays(1))).toEqual({ status: 'critical', daysLeft: 1 })
  })

  it('clasifica como expired una fecha pasada', () => {
    expect(getConsentStatus(isoInDays(-1))).toEqual({ status: 'expired', daysLeft: 0 })
  })

  it('clasifica como expired cuando no hay fecha o es inválida', () => {
    expect(getConsentStatus(null)).toEqual({ status: 'expired', daysLeft: 0 })
    expect(getConsentStatus('no-es-una-fecha')).toEqual({ status: 'expired', daysLeft: 0 })
  })
})

describe('getConsentBannerData', () => {
  it('devuelve null cuando ninguna conexión está en riesgo', () => {
    expect(getConsentBannerData([])).toBeNull()
    expect(
      getConsentBannerData([
        account({ consent_expires_at: isoInDays(30) }),
        account({ consent_expires_at: isoInDays(10) }), // warning, no cuenta
      ])
    ).toBeNull()
  })

  it('resume una única conexión critical con sus datos', () => {
    const result = getConsentBannerData([
      account({ name: 'Mi Banco', consent_expires_at: isoInDays(3) }),
    ])
    expect(result).toEqual({
      count: 1,
      only: { name: 'Mi Banco', status: 'critical', expiresAt: isoInDays(3) },
    })
  })

  it('resume una única conexión expired', () => {
    const result = getConsentBannerData([
      account({ name: 'Mi Banco', consent_expires_at: isoInDays(-2) }),
    ])
    expect(result).toEqual({
      count: 1,
      only: { name: 'Mi Banco', status: 'expired', expiresAt: isoInDays(-2) },
    })
  })

  it('agrupa varias conexiones en riesgo sin detalle individual', () => {
    const result = getConsentBannerData([
      account({ consent_expires_at: isoInDays(3) }),
      account({ consent_expires_at: isoInDays(-2) }),
      account({ consent_expires_at: isoInDays(30) }), // ok, no cuenta
    ])
    expect(result).toEqual({ count: 2, only: null })
  })

  it('ignora cuentas que no son de Enable Banking', () => {
    expect(
      getConsentBannerData([
        account({ source: 'manual', consent_expires_at: null }),
        account({ source: 'scraper', consent_expires_at: null }),
      ])
    ).toBeNull()
  })
})

// ─── Acceso a datos (issue #306) ─────────────────────────────────────────────

describe('getActiveAccounts', () => {
  it('filtra por hogar y activas, y ordena por sort_order → created_at', async () => {
    const { supabase, queries } = createFakeSupabase(() => ({ data: [] }))

    await getActiveAccounts(supabase, 'hh-1')

    const q = queryAt(queries, 0)
    expect(q.table).toBe('accounts')
    expect(q.calls.filter(c => c.method === 'eq')).toEqual([
      { method: 'eq', args: ['household_id', 'hh-1'] },
      { method: 'eq', args: ['is_active', true] },
    ])
    expect(q.calls.filter(c => c.method === 'order')).toEqual([
      { method: 'order', args: ['sort_order', { ascending: true }] },
      { method: 'order', args: ['created_at', { ascending: true }] },
    ])
  })

  it('propaga el error de BD en vez de renderizar el estado vacío', async () => {
    const { supabase } = createFakeSupabase(() => ({
      error: { message: 'permission denied', code: '42501' },
    }))

    await expect(getActiveAccounts(supabase, 'hh-1')).rejects.toThrow('permission denied')
  })
})

describe('getManualAccountId', () => {
  it('devuelve la cuenta manual del hogar', async () => {
    const { supabase, queries } = createFakeSupabase(() => ({ data: [{ id: 'acc-manual' }] }))

    expect(await getManualAccountId(supabase, 'hh-1')).toBe('acc-manual')
    expect(argsOf(queryAt(queries, 0), 'eq')).toEqual(['household_id', 'hh-1'])
    expect(called(queryAt(queries, 0), 'insert')).toBe(false)
  })

  // La fila la garantiza el bootstrap del hogar (#307): la lectura nunca escribe,
  // ni siquiera cuando el hogar no la tiene.
  it('devuelve null sin insertar cuando el hogar no la tiene', async () => {
    const { supabase, queries } = createFakeSupabase(() => ({ data: [] }))

    expect(await getManualAccountId(supabase, 'hh-1')).toBeNull()
    expect(queries).toHaveLength(1)
    expect(called(queryAt(queries, 0), 'insert')).toBe(false)
  })
})
