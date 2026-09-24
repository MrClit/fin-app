import { describe, it, expect } from 'vitest'
import { looksUnsigned, parseAmount, parseDate, parseMovement } from './parsers.mjs'

describe('parseAmount', () => {
  it('parsea importes con coma decimal', () => {
    expect(parseAmount('12,50 €')).toBe(12.5)
  })

  it('parsea importes negativos', () => {
    expect(parseAmount('-12,50 €')).toBe(-12.5)
  })

  it('parsea importes con separador de miles', () => {
    expect(parseAmount('1.234,56 €')).toBe(1234.56)
  })

  it('parsea el cero', () => {
    expect(parseAmount('0,00 €')).toBe(0)
  })

  it('lanza error si no hay número', () => {
    expect(() => parseAmount('abc')).toThrow()
  })
})

// Formato real de la celda de importe desde septiembre de 2026 (#413).
describe('parseMovement', () => {
  it('un consumo con signo se guarda negativo, no invertido', () => {
    expect(parseMovement('BAR CHEERS RESTAURANTE', '-11,90 €')).toEqual({
      amount: -11.9,
      category: 'restaurant',
    })
  })

  it('una devolución en positivo resta del gasto: positiva y en restaurant', () => {
    expect(parseMovement('BAR CHEERS RESTAURANTE', '+5,00 €')).toEqual({
      amount: 5,
      category: 'restaurant',
    })
  })

  it('la recarga es nómina y positiva, con o sin "+"', () => {
    expect(parseMovement('RECARGA', '225 €')).toEqual({ amount: 225, category: 'payroll' })
    expect(parseMovement('recarga', '+225,00 €')).toEqual({ amount: 225, category: 'payroll' })
  })
})

describe('looksUnsigned', () => {
  const spend = amount => ({ amount, category: 'restaurant' })
  const recharge = { amount: 225, category: 'payroll' }

  it('detecta consumos sin signo (el formato anterior a septiembre de 2026)', () => {
    expect(looksUnsigned([spend(11.9), spend(2), recharge])).toBe(true)
  })

  it('acepta una lectura con consumos negativos, aunque haya devoluciones', () => {
    expect(looksUnsigned([spend(-11.9), spend(5), recharge])).toBe(false)
  })

  it('no salta si solo hay recargas', () => {
    expect(looksUnsigned([recharge])).toBe(false)
  })
})

describe('parseDate', () => {
  it('parsea fechas con barras', () => {
    expect(parseDate('15/05/2026')).toBe('2026-05-15')
  })

  it('parsea fechas con mes abreviado en castellano', () => {
    expect(parseDate('15 may 2026')).toBe('2026-05-15')
  })

  it('rellena con ceros día y mes de un dígito', () => {
    expect(parseDate('5/1/2026')).toBe('2026-01-05')
  })

  it('es insensible a mayúsculas en el mes', () => {
    expect(parseDate('15 MAY 2026')).toBe('2026-05-15')
  })

  it('lanza error ante un mes desconocido', () => {
    expect(() => parseDate('15 xxx 2026')).toThrow()
  })

  it('lanza error si no es una fecha', () => {
    expect(() => parseDate('no es fecha')).toThrow()
  })
})
