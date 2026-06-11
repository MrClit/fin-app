import { describe, it, expect } from 'vitest'
import { parseAmount, parseDate } from './parsers.mjs'

describe('parseAmount', () => {
  it('parsea el valor máquina del atributo abbr (punto decimal)', () => {
    expect(parseAmount('156.20')).toBe(156.2)
  })

  it('parsea importes negativos (abonos)', () => {
    expect(parseAmount('-156.20')).toBe(-156.2)
  })

  it('parsea importes grandes sin separador de miles', () => {
    expect(parseAmount('1234.56')).toBe(1234.56)
  })

  it('fallback: texto español con coma y separador de miles', () => {
    expect(parseAmount('1.234,56 €')).toBe(1234.56)
  })

  it('fallback: texto español con &nbsp; y símbolo', () => {
    expect(parseAmount('156,20&nbsp;€')).toBe(156.2)
  })

  it('parsea el cero', () => {
    expect(parseAmount('0.00')).toBe(0)
  })

  it('devuelve NaN si no hay número', () => {
    expect(parseAmount('abc')).toBeNaN()
    expect(parseAmount('')).toBeNaN()
    expect(parseAmount(null)).toBeNaN()
  })
})

describe('parseDate', () => {
  it('normaliza la fecha ISO del atributo abbr', () => {
    expect(parseDate('2026-05-25')).toBe('2026-05-25')
  })

  it('ignora la parte horaria si la hubiera', () => {
    expect(parseDate('2026-05-25T10:00:00')).toBe('2026-05-25')
  })

  it('devuelve null ante formato no ISO', () => {
    expect(parseDate('25/05/2026')).toBeNull()
    expect(parseDate('no es fecha')).toBeNull()
    expect(parseDate(null)).toBeNull()
  })
})
