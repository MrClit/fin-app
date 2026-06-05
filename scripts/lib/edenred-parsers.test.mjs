import { describe, it, expect } from 'vitest'
import { parseAmount, parseDate } from './edenred-parsers.mjs'

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
