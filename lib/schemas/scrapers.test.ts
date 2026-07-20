import { describe, expect, it } from 'vitest'
import {
  edenredPayloadSchema,
  sabadellSavingsPayloadSchema,
  sabadellVisaPayloadSchema,
  scraperNotifySchema,
} from './scrapers'

const tx = () => ({
  external_id: 'edenred-2026-05-18-1200',
  amount: -12.5,
  description: 'RESTAURANTE',
  transaction_date: '2026-05-18',
})

const LAST_SYNCED = '2026-05-18T10:00:00.000Z'

describe('edenredPayloadSchema', () => {
  it('acepta el payload del scraper', () => {
    const payload = {
      balance: 120.4,
      last_synced_at: LAST_SYNCED,
      transactions: [{ ...tx(), category: 'restaurant' }],
    }
    expect(edenredPayloadSchema.parse(payload)).toEqual(payload)
  })

  it('acepta un movimiento sin `category` (es opcional)', () => {
    const result = edenredPayloadSchema.safeParse({
      balance: 0,
      last_synced_at: LAST_SYNCED,
      transactions: [tx()],
    })
    expect(result.success).toBe(true)
  })

  it.each([
    ['falta el balance', { last_synced_at: LAST_SYNCED, transactions: [] }],
    ['el balance no es numérico', { balance: '10', last_synced_at: LAST_SYNCED, transactions: [] }],
    ['last_synced_at no es un instante ISO', { balance: 0, last_synced_at: '2026-05-18', transactions: [] }],
    ['transactions no es un array', { balance: 0, last_synced_at: LAST_SYNCED, transactions: {} }],
    [
      'un movimiento no tiene external_id',
      { balance: 0, last_synced_at: LAST_SYNCED, transactions: [{ ...tx(), external_id: '' }] },
    ],
    [
      'un movimiento tiene la fecha con hora',
      {
        balance: 0,
        last_synced_at: LAST_SYNCED,
        transactions: [{ ...tx(), transaction_date: '2026-05-18T10:00:00Z' }],
      },
    ],
    [
      'un movimiento tiene el importe como string',
      { balance: 0, last_synced_at: LAST_SYNCED, transactions: [{ ...tx(), amount: '-12.5' }] },
    ],
    [
      'un movimiento tiene una categoría fuera del catálogo',
      { balance: 0, last_synced_at: LAST_SYNCED, transactions: [{ ...tx(), category: 'not-a-category' }] },
    ],
  ])('rechaza el payload si %s', (_label, payload) => {
    expect(edenredPayloadSchema.safeParse(payload).success).toBe(false)
  })

  it('una categoría fuera del catálogo señala el campo exacto (#329)', () => {
    const result = edenredPayloadSchema.safeParse({
      balance: 0,
      last_synced_at: LAST_SYNCED,
      transactions: [{ ...tx(), category: 'not-a-category' }],
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(['transactions', 0, 'category'])
  })
})

describe('sabadellVisaPayloadSchema', () => {
  /** `number` es opcional en el payload del scraper. */
  const cardSinNumero = () => ({
    card_id: '4106________4014',
    name: 'VISA CLASSIC BSAB',
    balance: -230.15,
    transactions: [tx()],
  })

  const card = () => ({ ...cardSinNumero(), number: '4106________4014' })

  it('acepta el payload con varias tarjetas', () => {
    const payload = { last_synced_at: LAST_SYNCED, cards: [card(), card()] }
    expect(sabadellVisaPayloadSchema.parse(payload)).toEqual(payload)
  })

  it('acepta una tarjeta sin `number` (es opcional)', () => {
    const result = sabadellVisaPayloadSchema.safeParse({
      last_synced_at: LAST_SYNCED,
      cards: [cardSinNumero()],
    })
    expect(result.success).toBe(true)
  })

  it.each([
    ['faltan las tarjetas', { last_synced_at: LAST_SYNCED }],
    ['una tarjeta no tiene card_id', { last_synced_at: LAST_SYNCED, cards: [{ ...card(), card_id: '' }] }],
    ['una tarjeta no tiene balance', { last_synced_at: LAST_SYNCED, cards: [{ ...card(), balance: null }] }],
    [
      'un movimiento de una tarjeta es inválido',
      { last_synced_at: LAST_SYNCED, cards: [{ ...card(), transactions: [{ ...tx(), amount: 'x' }] }] },
    ],
  ])('rechaza el payload si %s', (_label, payload) => {
    expect(sabadellVisaPayloadSchema.safeParse(payload).success).toBe(false)
  })
})

describe('sabadellSavingsPayloadSchema', () => {
  const account = () => ({
    account_id: '32000007181690',
    name: 'Plan de ahorro',
    balance: 5400,
    transactions: [tx()],
  })

  it('acepta el payload con la cuenta única', () => {
    const payload = { last_synced_at: LAST_SYNCED, account: account() }
    expect(sabadellSavingsPayloadSchema.parse(payload)).toEqual(payload)
  })

  it.each([
    ['falta la cuenta', { last_synced_at: LAST_SYNCED }],
    ['la cuenta llega como array', { last_synced_at: LAST_SYNCED, account: [account()] }],
    ['la cuenta no tiene account_id', { last_synced_at: LAST_SYNCED, account: { ...account(), account_id: '' } }],
  ])('rechaza el payload si %s', (_label, payload) => {
    expect(sabadellSavingsPayloadSchema.safeParse(payload).success).toBe(false)
  })
})

describe('scraperNotifySchema', () => {
  it('acepta un aviso de un scraper conocido', () => {
    expect(scraperNotifySchema.parse({ source: 'sabadell_visa', kind: '2fa' })).toEqual({
      source: 'sabadell_visa',
      kind: '2fa',
    })
  })

  it.each([
    ['el source es desconocido', { source: 'bbva', kind: '2fa' }],
    ['falta el kind', { source: 'edenred' }],
    ['el kind está vacío', { source: 'edenred', kind: '' }],
  ])('rechaza el aviso si %s', (_label, payload) => {
    expect(scraperNotifySchema.safeParse(payload).success).toBe(false)
  })
})
