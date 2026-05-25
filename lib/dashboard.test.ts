import { describe, expect, it } from 'vitest'
import { calculateNetWorth } from './dashboard'
import type { Account } from '@/types'

type AccountSlice = Pick<Account, 'is_liability' | 'balance'>

function asset(balance: number): AccountSlice {
  return { is_liability: false, balance }
}

function liability(balance: number): AccountSlice {
  return { is_liability: true, balance }
}

describe('calculateNetWorth', () => {
  it('devuelve 0 con una lista vacía', () => {
    expect(calculateNetWorth([])).toBe(0)
  })

  it('suma los saldos cuando solo hay activos', () => {
    expect(calculateNetWorth([asset(1000), asset(500)])).toBe(1500)
  })

  it('resta el valor absoluto de un pasivo con saldo negativo', () => {
    expect(calculateNetWorth([liability(-200)])).toBe(-200)
  })

  // Contrato actual: Math.abs() sobre la suma de pasivos hace que un crédito
  // a favor aislado en un pasivo también reste del patrimonio. Documentado en
  // spec §5.5; si en el futuro se considera incorrecto se abre issue aparte.
  it('aplica Math.abs también cuando el único pasivo tiene saldo positivo', () => {
    expect(calculateNetWorth([liability(50)])).toBe(-50)
  })

  it('mezcla activos y pasivos: activos − |Σ pasivos|', () => {
    expect(calculateNetWorth([asset(1000), asset(500), liability(-200)])).toBe(1300)
  })

  it('un activo en descubierto resta del lado activo, no se mueve a pasivos', () => {
    expect(calculateNetWorth([asset(1000), asset(-150), liability(-200)])).toBe(650)
  })

  it('un crédito a favor en una tarjeta reduce la deuda total ("resta menos")', () => {
    // Σ pasivos = -200 + 50 = -150 → |-150| = 150 → 1000 - 150 = 850.
    // Comparado con sólo liability(-200) (que restaría 200), el crédito
    // hace que el patrimonio quede en 850 en lugar de 800.
    expect(calculateNetWorth([asset(1000), liability(-200), liability(50)])).toBe(850)
  })

  it('caso mixto: activo en descubierto + pasivo con crédito a favor', () => {
    // assets = 1000 + (-150) = 850
    // Σ pasivos = -200 + 50 = -150 → |.| = 150
    // patrimonio = 850 - 150 = 700
    expect(
      calculateNetWorth([asset(1000), asset(-150), liability(-200), liability(50)])
    ).toBe(700)
  })
})
