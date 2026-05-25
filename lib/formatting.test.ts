import { describe, expect, it } from 'vitest'
import { fmt } from './formatting'

describe('fmt', () => {
  describe('enteros sin separador de miles', () => {
    it('formatea 0 como "0"', () => {
      expect(fmt(0)).toBe('0')
    })

    it('formatea un dígito sin separador', () => {
      expect(fmt(7)).toBe('7')
    })

    it('formatea tres dígitos sin separador', () => {
      expect(fmt(999)).toBe('999')
    })
  })

  describe('separador de miles con punto', () => {
    it('inserta punto en miles de 4 dígitos', () => {
      expect(fmt(1234)).toBe('1.234')
    })

    it('inserta puntos en millones', () => {
      expect(fmt(1234567)).toBe('1.234.567')
    })

    it('formatea el borde 1000 con punto', () => {
      expect(fmt(1000)).toBe('1.000')
    })
  })

  describe('coma decimal', () => {
    it('separa la parte decimal con coma', () => {
      expect(fmt(1234.5, 2)).toBe('1.234,50')
    })

    it('formatea valores < 1 con coma', () => {
      expect(fmt(0.1, 1)).toBe('0,1')
    })
  })

  describe('decimals por defecto = 0', () => {
    it('redondea 0.5 según toFixed (V8 → "1")', () => {
      expect(fmt(0.5)).toBe('1')
    })

    it('redondea 0.4 hacia abajo a "0"', () => {
      expect(fmt(0.4)).toBe('0')
    })

    it('redondea 1.5 a "2"', () => {
      expect(fmt(1.5)).toBe('2')
    })
  })

  describe('negativos', () => {
    it('mantiene el signo en enteros', () => {
      expect(fmt(-1234)).toBe('-1.234')
    })

    it('mantiene el signo con decimales', () => {
      expect(fmt(-0.4, 1)).toBe('-0,4')
    })

    it('mantiene el signo combinando miles y decimales', () => {
      expect(fmt(-1234.5, 2)).toBe('-1.234,50')
    })
  })

  describe('cero negativo', () => {
    it('formatea -0 como "0" sin signo', () => {
      expect(fmt(-0)).toBe('0')
    })

    it('formatea -0 con decimales como "0,00"', () => {
      expect(fmt(-0, 2)).toBe('0,00')
    })
  })

  describe('decimales pedidos pero sin parte fraccional', () => {
    it('añade coma y ceros al entero', () => {
      expect(fmt(100, 2)).toBe('100,00')
    })

    it('añade coma y ceros al cero', () => {
      expect(fmt(0, 2)).toBe('0,00')
    })
  })

  describe('padding de ceros decimales', () => {
    it('rellena ceros a la derecha de la parte fraccional', () => {
      expect(fmt(1.5, 3)).toBe('1,500')
    })

    it('rellena ceros cuando no hay parte fraccional', () => {
      expect(fmt(1, 4)).toBe('1,0000')
    })
  })
})
