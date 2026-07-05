import { describe, it, expect } from 'vitest'
import { categorizeSavingsMovement } from './categories'

describe('categorizeSavingsMovement', () => {
  it('REVALORIZACION → returns (income, el rendimiento del plan)', () => {
    expect(categorizeSavingsMovement('REVALORIZACION')).toBe('returns')
  })

  it('tolera variantes de mayúsculas/acentos del concepto', () => {
    expect(categorizeSavingsMovement('revalorización')).toBe('returns')
    expect(categorizeSavingsMovement('Revaloriza cuenta')).toBe('returns')
  })

  it('APORT.PERIODICA → savings (non_computable)', () => {
    expect(categorizeSavingsMovement('APORT.PERIODICA')).toBe('savings')
  })

  it('regresión: un concepto de intereses NO cae en fees (evita AUTO_RULES)', () => {
    // El fallback genérico de AUTO_RULES mandaría "intereses" a `fees`; aquí, al
    // no ser REVALORIZACION, cae en `savings`, nunca en `fees`.
    expect(categorizeSavingsMovement('ABONO INTERESES')).not.toBe('fees')
    expect(categorizeSavingsMovement('ABONO INTERESES')).toBe('savings')
  })

  it('cualquier otro concepto (rescate…) → savings', () => {
    expect(categorizeSavingsMovement('RESCATE PARCIAL')).toBe('savings')
    expect(categorizeSavingsMovement('')).toBe('savings')
  })
})
