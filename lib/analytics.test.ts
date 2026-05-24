import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  PERIOD_LABELS,
  getPeriodRange,
  getWindowPeriods,
  getYoYRange,
  toISODate,
  yoyDelta,
  type PeriodRange,
} from './analytics'

// NOW = jueves 21 mayo 2026, 12:00 local. Suficientemente lejos de bordes
// (semana lun 18 — dom 24, Q2, año 2026) para los casos felices.
const NOW = new Date(2026, 4, 21, 12, 0, 0, 0)

function setNow(d: Date) {
  vi.setSystemTime(d)
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('toISODate', () => {
  it('formatea YYYY-MM-DD con padding de mes y día', () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(toISODate(new Date(2026, 8, 9))).toBe('2026-09-09')
    expect(toISODate(new Date(2026, 11, 31))).toBe('2026-12-31')
  })

  it('usa la fecha local (no UTC) — clave para evitar shift de timezone', () => {
    // En zona +0200, new Date(2026, 0, 1, 23, ...) podría caer en 2026-01-02 si
    // se serializara como ISO UTC. toISODate debe usar getFullYear/Month/Date.
    expect(toISODate(new Date(2026, 0, 1, 23, 30, 0))).toBe('2026-01-01')
  })
})

describe('yoyDelta', () => {
  it('devuelve N/A cuando previous === 0', () => {
    expect(yoyDelta(100, 0)).toBe('N/A')
    expect(yoyDelta(0, 0)).toBe('N/A')
    expect(yoyDelta(-50, 0)).toBe('N/A')
  })

  it('devuelve +X% si current crece sobre previous', () => {
    expect(yoyDelta(150, 100)).toBe('+50%')
    expect(yoyDelta(101, 100)).toBe('+1%')
    expect(yoyDelta(200, 100)).toBe('+100%')
  })

  it('devuelve -X% si current cae respecto a previous', () => {
    expect(yoyDelta(50, 100)).toBe('-50%')
    expect(yoyDelta(0, 100)).toBe('-100%')
  })

  it('marca +0% (signo positivo) cuando current === previous', () => {
    expect(yoyDelta(100, 100)).toBe('+0%')
  })

  it('redondea a 0 decimales', () => {
    // (133-100)/100 = 33%
    expect(yoyDelta(133, 100)).toBe('+33%')
    // (134.7-100)/100 = 34.7%, toFixed(0) redondea a 35
    expect(yoyDelta(134.7, 100)).toBe('+35%')
  })
})

describe('getPeriodRange — week', () => {
  it('devuelve lunes 00:00 a domingo 23:59:59.999 que contiene NOW', () => {
    // NOW = jueves 21 mayo 2026 → semana 18–24 mayo
    const r = getPeriodRange('week', 0)
    expect(r.start.getFullYear()).toBe(2026)
    expect(r.start.getMonth()).toBe(4)
    expect(r.start.getDate()).toBe(18)
    expect(r.start.getHours()).toBe(0)
    expect(r.start.getMinutes()).toBe(0)
    expect(r.end.getFullYear()).toBe(2026)
    expect(r.end.getMonth()).toBe(4)
    expect(r.end.getDate()).toBe(24)
    expect(r.end.getHours()).toBe(23)
    expect(r.end.getMinutes()).toBe(59)
    expect(r.end.getSeconds()).toBe(59)
    expect(r.label).toBe('18 May')
  })

  it('aplica el offset retrocediendo semanas completas', () => {
    const r = getPeriodRange('week', 1)
    // Semana anterior: 11–17 mayo 2026
    expect(toISODate(r.start)).toBe('2026-05-11')
    expect(toISODate(r.end)).toBe('2026-05-17')
    expect(r.label).toBe('11 May')
  })

  it('cuando NOW cae en domingo, ese mismo domingo cierra la semana actual', () => {
    // Domingo 24 mayo 2026
    setNow(new Date(2026, 4, 24, 10, 0, 0))
    const r = getPeriodRange('week', 0)
    expect(toISODate(r.start)).toBe('2026-05-18')
    expect(toISODate(r.end)).toBe('2026-05-24')
  })

  it('cuando NOW cae en lunes, la semana empieza ese día', () => {
    setNow(new Date(2026, 4, 18, 8, 0, 0))
    const r = getPeriodRange('week', 0)
    expect(toISODate(r.start)).toBe('2026-05-18')
    expect(toISODate(r.end)).toBe('2026-05-24')
  })

  it('cubre el cruce de año si la semana actual atraviesa diciembre/enero', () => {
    // Viernes 1 enero 2027 → la semana ISO es lun 28 dic 2026 — dom 3 ene 2027
    setNow(new Date(2027, 0, 1, 12, 0, 0))
    const r = getPeriodRange('week', 0)
    expect(toISODate(r.start)).toBe('2026-12-28')
    expect(toISODate(r.end)).toBe('2027-01-03')
  })
})

describe('getPeriodRange — month', () => {
  it('devuelve el mes que contiene NOW, del 1 al último día', () => {
    const r = getPeriodRange('month', 0)
    expect(toISODate(r.start)).toBe('2026-05-01')
    expect(toISODate(r.end)).toBe('2026-05-31')
    expect(r.label).toBe('May')
  })

  it('aplica offset retrocediendo meses', () => {
    const r = getPeriodRange('month', 1)
    expect(toISODate(r.start)).toBe('2026-04-01')
    expect(toISODate(r.end)).toBe('2026-04-30')
    expect(r.label).toBe('Abr')
  })

  it('cruza año al retroceder lo suficiente', () => {
    // NOW mayo 2026 (mes idx 4). Offset 5 → diciembre 2025.
    const r = getPeriodRange('month', 5)
    expect(toISODate(r.start)).toBe('2025-12-01')
    expect(toISODate(r.end)).toBe('2025-12-31')
    expect(r.label).toBe('Dic')
  })

  it('respeta el último día de un mes corto (febrero, abril)', () => {
    // Febrero 2026 (no bisiesto) → 28 días
    setNow(new Date(2026, 1, 15, 12, 0, 0))
    const feb = getPeriodRange('month', 0)
    expect(toISODate(feb.start)).toBe('2026-02-01')
    expect(toISODate(feb.end)).toBe('2026-02-28')

    // Abril → 30 días
    setNow(new Date(2026, 3, 10, 12, 0, 0))
    const abr = getPeriodRange('month', 0)
    expect(toISODate(abr.end)).toBe('2026-04-30')
  })

  it('respeta febrero bisiesto (2028 es bisiesto)', () => {
    setNow(new Date(2028, 1, 15, 12, 0, 0))
    const r = getPeriodRange('month', 0)
    expect(toISODate(r.end)).toBe('2028-02-29')
  })
})

describe('getPeriodRange — quarter', () => {
  it('devuelve el trimestre que contiene NOW', () => {
    // NOW mayo (Q2) → abril–junio 2026
    const r = getPeriodRange('quarter', 0)
    expect(toISODate(r.start)).toBe('2026-04-01')
    expect(toISODate(r.end)).toBe('2026-06-30')
    expect(r.label).toBe('Q2 2026')
  })

  it('cubre Q1 cuando NOW es enero', () => {
    setNow(new Date(2026, 0, 15, 12, 0, 0))
    const r = getPeriodRange('quarter', 0)
    expect(toISODate(r.start)).toBe('2026-01-01')
    expect(toISODate(r.end)).toBe('2026-03-31')
    expect(r.label).toBe('Q1 2026')
  })

  it('cubre Q4 cuando NOW es diciembre', () => {
    setNow(new Date(2026, 11, 20, 12, 0, 0))
    const r = getPeriodRange('quarter', 0)
    expect(toISODate(r.start)).toBe('2026-10-01')
    expect(toISODate(r.end)).toBe('2026-12-31')
    expect(r.label).toBe('Q4 2026')
  })

  it('cruza año al retroceder trimestres', () => {
    // NOW Q2 2026, offset 2 → Q4 2025
    const r = getPeriodRange('quarter', 2)
    expect(toISODate(r.start)).toBe('2025-10-01')
    expect(toISODate(r.end)).toBe('2025-12-31')
    expect(r.label).toBe('Q4 2025')
  })
})

describe('getPeriodRange — year', () => {
  it('devuelve 1 ene a 31 dic del año actual', () => {
    const r = getPeriodRange('year', 0)
    expect(toISODate(r.start)).toBe('2026-01-01')
    expect(toISODate(r.end)).toBe('2026-12-31')
    expect(r.label).toBe('2026')
  })

  it('aplica offset retrocediendo años', () => {
    const r = getPeriodRange('year', 3)
    expect(toISODate(r.start)).toBe('2023-01-01')
    expect(toISODate(r.end)).toBe('2023-12-31')
    expect(r.label).toBe('2023')
  })
})

describe('getWindowPeriods', () => {
  it('devuelve la longitud correcta por granularidad (§5.1)', () => {
    expect(getWindowPeriods('week', 0)).toHaveLength(9)
    expect(getWindowPeriods('month', 0)).toHaveLength(12)
    expect(getWindowPeriods('quarter', 0)).toHaveLength(10)
    expect(getWindowPeriods('year', 0)).toHaveLength(8)
  })

  it('ordena del más antiguo al más reciente; el último elemento es el período actual', () => {
    const w = getWindowPeriods('month', 0)
    // último = mes actual
    expect(toISODate(w[w.length - 1].start)).toBe('2026-05-01')
    // primero = 11 meses antes (mayo 2025)
    expect(toISODate(w[0].start)).toBe('2025-06-01')
    // monotonía estricta
    for (let i = 1; i < w.length; i++) {
      expect(w[i].start.getTime()).toBeGreaterThan(w[i - 1].start.getTime())
    }
  })

  it('aplica offset desplazando la ventana entera hacia atrás', () => {
    const w = getWindowPeriods('month', 3)
    // Último elemento = mes actual - 3 = febrero 2026
    expect(toISODate(w[w.length - 1].start)).toBe('2026-02-01')
    // Primero = 11 meses antes = marzo 2025
    expect(toISODate(w[0].start)).toBe('2025-03-01')
  })
})

describe('getYoYRange', () => {
  it('resta un año a ambos extremos del rango y preserva el label', () => {
    const current: PeriodRange = {
      start: new Date(2026, 4, 1),
      end: new Date(2026, 4, 31, 23, 59, 59, 999),
      label: 'May',
    }
    const yoy = getYoYRange(current)
    expect(toISODate(yoy.start)).toBe('2025-05-01')
    expect(toISODate(yoy.end)).toBe('2025-05-31')
    expect(yoy.label).toBe('May')
  })

  it('no muta el rango de entrada', () => {
    const current: PeriodRange = {
      start: new Date(2026, 4, 1),
      end: new Date(2026, 4, 31),
      label: 'May',
    }
    getYoYRange(current)
    expect(current.start.getFullYear()).toBe(2026)
    expect(current.end.getFullYear()).toBe(2026)
  })

  it('caso 29-feb: restar un año a un febrero bisiesto cae en 1 marzo del año anterior (comportamiento nativo de setFullYear)', () => {
    const current: PeriodRange = {
      start: new Date(2028, 1, 29),
      end: new Date(2028, 1, 29, 23, 59, 59, 999),
      label: '29 Feb',
    }
    const yoy = getYoYRange(current)
    // 2027 no es bisiesto → setFullYear desborda a 1 marzo
    expect(toISODate(yoy.start)).toBe('2027-03-01')
  })
})

describe('PERIOD_LABELS', () => {
  it('expone una etiqueta legible para cada granularidad', () => {
    expect(PERIOD_LABELS).toEqual({
      week: 'Semana',
      month: 'Mes',
      quarter: 'Trimestre',
      year: 'Año',
    })
  })
})
