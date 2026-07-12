import { describe, expect, it } from 'vitest'
import { createTransactionSchema, updateTransactionSchema } from './transactions'

const ACCOUNT_ID = '00000000-0000-0000-0000-0000000000a1'

/** Body sin categoría: el modal puede no enviarla. */
const sinCategoria = () => ({
  amount: -42.5,
  description: 'Compra',
  date: '2026-05-18',
  account_id: ACCOUNT_ID,
})

const body = () => ({ ...sinCategoria(), category_manual: 'groceries' })

describe('createTransactionSchema', () => {
  it('acepta el body que envía el modal de alta', () => {
    expect(createTransactionSchema.parse(body())).toEqual(body())
  })

  it('acepta el importe 0 (el chequeo por falsy anterior lo rechazaba)', () => {
    const result = createTransactionSchema.safeParse({ ...body(), amount: 0 })
    expect(result.success).toBe(true)
  })

  it('acepta que no venga categoría', () => {
    expect(createTransactionSchema.safeParse(sinCategoria()).success).toBe(true)
    expect(createTransactionSchema.safeParse({ ...body(), category_manual: null }).success).toBe(true)
  })

  it.each([
    ['el importe es un string', { ...body(), amount: 'abc' }],
    ['el importe no viene', { ...body(), amount: undefined }],
    ['la descripción está vacía', { ...body(), description: '   ' }],
    ['la fecha no es YYYY-MM-DD', { ...body(), date: '18/05/2026' }],
    ['la cuenta no es un UUID', { ...body(), account_id: 'abc' }],
    ['la categoría no está en el catálogo', { ...body(), category_manual: 'cripto' }],
  ])('rechaza el body si %s', (_label, payload) => {
    expect(createTransactionSchema.safeParse(payload).success).toBe(false)
  })
})

describe('updateTransactionSchema', () => {
  it('acepta un update de solo la categoría', () => {
    expect(updateTransactionSchema.parse({ category_manual: 'leisure' })).toEqual({
      category_manual: 'leisure',
    })
  })

  it('acepta `category_manual: null` («sin categoría»)', () => {
    expect(updateTransactionSchema.parse({ category_manual: null })).toEqual({ category_manual: null })
  })

  it('acepta un update de solo is_read', () => {
    expect(updateTransactionSchema.parse({ is_read: true })).toEqual({ is_read: true })
  })

  it('descarta los campos no reconocidos', () => {
    expect(updateTransactionSchema.parse({ is_read: true, amount: 999 })).toEqual({ is_read: true })
  })

  it.each([
    ['el body está vacío', {}],
    ['no trae ningún campo actualizable', { amount: 999 }],
    ['la categoría no está en el catálogo', { category_manual: 'cripto' }],
    ['is_read no es booleano', { is_read: 'sí' }],
  ])('rechaza el update si %s', (_label, payload) => {
    expect(updateTransactionSchema.safeParse(payload).success).toBe(false)
  })
})
