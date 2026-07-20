import { describe, expect, it } from 'vitest'
import { bankingConnectSchema, bankingRenewSchema, syncEnablebankingSchema } from './banking'

const ACCOUNT_ID = '00000000-0000-0000-0000-0000000000a1'

describe('bankingConnectSchema', () => {
  it('acepta el banco y el país', () => {
    expect(bankingConnectSchema.parse({ aspspName: 'Sabadell', aspspCountry: 'ES' })).toEqual({
      aspspName: 'Sabadell',
      aspspCountry: 'ES',
    })
  })

  it.each([
    ['falta el país', { aspspName: 'Sabadell' }],
    ['falta el banco', { aspspCountry: 'ES' }],
    ['el banco está vacío', { aspspName: '', aspspCountry: 'ES' }],
  ])('rechaza el body si %s', (_label, payload) => {
    expect(bankingConnectSchema.safeParse(payload).success).toBe(false)
  })
})

describe('bankingRenewSchema', () => {
  it('acepta el id de la cuenta', () => {
    expect(bankingRenewSchema.parse({ accountId: ACCOUNT_ID })).toEqual({ accountId: ACCOUNT_ID })
  })

  it.each([
    ['no viene la cuenta', {}],
    ['la cuenta no es un UUID', { accountId: 'abc' }],
  ])('rechaza el body si %s', (_label, payload) => {
    expect(bankingRenewSchema.safeParse(payload).success).toBe(false)
  })
})

describe('syncEnablebankingSchema', () => {
  it('acepta el body ausente (sincroniza todas las cuentas)', () => {
    expect(syncEnablebankingSchema.parse(undefined)).toEqual({})
  })

  it('acepta una cuenta concreta', () => {
    expect(syncEnablebankingSchema.parse({ accountId: ACCOUNT_ID })).toEqual({ accountId: ACCOUNT_ID })
  })

  it('rechaza una cuenta que no es un UUID', () => {
    expect(syncEnablebankingSchema.safeParse({ accountId: 'abc' }).success).toBe(false)
  })
})
