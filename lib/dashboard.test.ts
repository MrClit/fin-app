import { describe, expect, it } from 'vitest'
import {
  buildDailyBalances,
  buildNetWorthSeries,
  calculateNetWorth,
  weeklyDeltaFrom,
} from './dashboard'
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

// Días consecutivos de una ventana, más antiguo → más reciente, como los
// construye getDashboardData.
function daysFrom(start: string, count: number): string[] {
  const base = new Date(`${start}T00:00:00Z`)
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(base)
    d.setUTCDate(d.getUTCDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

describe('buildDailyBalances', () => {
  const days = daysFrom('2026-05-01', 5)

  it('sin movimientos, la serie es plana al saldo actual', () => {
    expect(buildDailyBalances(1000, days, {})).toEqual([1000, 1000, 1000, 1000, 1000])
  })

  it('el último elemento es siempre el saldo actual', () => {
    const series = buildDailyBalances(1000, days, { '2026-05-03': -50 })
    expect(series[series.length - 1]).toBe(1000)
  })

  it('un movimiento sólo afecta a los días anteriores a él, no al suyo', () => {
    // El día 3 entran -50: el saldo del día 2 hacia atrás era 50 más alto.
    expect(buildDailyBalances(1000, days, { '2026-05-03': -50 })).toEqual([
      1050, 1050, 1000, 1000, 1000,
    ])
  })

  it('acumula varios movimientos hacia atrás', () => {
    // Hacia atrás desde el 05: el -50 del día 4 sube el saldo del 3 y del 2, y
    // el +30 del día 2 lo baja al llegar al 1.
    expect(buildDailyBalances(1000, days, { '2026-05-02': 30, '2026-05-04': -50 })).toEqual([
      1020, 1050, 1050, 1000, 1000,
    ])
  })

  it('el movimiento del día más antiguo no altera la serie (no hay días previos)', () => {
    expect(buildDailyBalances(1000, days, { '2026-05-01': -999 })).toEqual([
      1000, 1000, 1000, 1000, 1000,
    ])
  })

  it('devuelve una serie vacía si no hay días', () => {
    expect(buildDailyBalances(1000, [], {})).toEqual([])
  })
})

describe('weeklyDeltaFrom', () => {
  it('suma sólo los movimientos de los últimos 7 días', () => {
    const days = daysFrom('2026-05-01', 30)
    // 2026-05-01 queda fuera de la ventana de 7 (últimos = 24..30 de mayo).
    const txByDay = { '2026-05-01': 1000, '2026-05-25': -40, '2026-05-30': 10 }
    expect(weeklyDeltaFrom(days, txByDay)).toBe(-30)
  })

  it('es 0 si no hubo movimientos en la ventana', () => {
    expect(weeklyDeltaFrom(daysFrom('2026-05-01', 30), { '2026-05-02': 500 })).toBe(0)
  })

  it('con menos de 7 días disponibles suma los que haya', () => {
    expect(weeklyDeltaFrom(daysFrom('2026-05-01', 3), { '2026-05-02': 20 })).toBe(20)
  })
})

describe('buildNetWorthSeries', () => {
  const twelveMonths = Array.from({ length: 12 }, (_, i) =>
    `2026-${String(i + 1).padStart(2, '0')}`
  )

  it('etiqueta cada punto con el mes en castellano', () => {
    const { netWorthData } = buildNetWorthSeries(100, ['2026-01', '2026-02', '2026-03'], {})
    expect(netWorthData.map(p => p.label)).toEqual(['Ene', 'Feb', 'Mar'])
  })

  it('el último punto es el saldo actual y los previos se reconstruyen hacia atrás', () => {
    const { netWorthData } = buildNetWorthSeries(1000, ['2026-01', '2026-02', '2026-03'], {
      '2026-03': -200,
    })
    expect(netWorthData.map(p => p.value)).toEqual([1200, 1200, 1000])
  })

  it('redondea los valores de la serie', () => {
    const { netWorthData } = buildNetWorthSeries(1000.4, ['2026-01', '2026-02'], {
      '2026-02': 0.2,
    })
    expect(netWorthData.map(p => p.value)).toEqual([1000, 1000])
  })

  it('annualDelta es null si la ventana no tiene los 12 meses', () => {
    const { annualDelta } = buildNetWorthSeries(1000, ['2026-01', '2026-02'], { '2026-02': 50 })
    expect(annualDelta).toBeNull()
  })

  it('annualDelta con 12 meses es el saldo actual menos el del mes más antiguo', () => {
    // Movimientos en meses posteriores al primero: el patrimonio de enero era
    // 1000 - 300 = 700, así que la variación anual es +300.
    const { annualDelta } = buildNetWorthSeries(1000, twelveMonths, {
      '2026-05': 200,
      '2026-09': 100,
    })
    expect(annualDelta).toBe(300)
  })

  it('el movimiento del mes más antiguo no cuenta para annualDelta', () => {
    const { annualDelta } = buildNetWorthSeries(1000, twelveMonths, { '2026-01': 999 })
    expect(annualDelta).toBe(0)
  })
})
