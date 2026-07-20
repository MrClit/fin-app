/**
 * Utilidades de fecha compartidas.
 *
 * `MONTH_LABELS` estaba triplicado (`lib/dashboard.ts`, `lib/analytics.ts`,
 * `lib/transactions.ts`) y cada copia se indexaba a mano, que es justo el patrón
 * que `noUncheckedIndexedAccess` destapa (#270). Aquí la tabla es una tupla de
 * 12 y el acceso pasa siempre por `monthLabel`, que normaliza el índice.
 */

export const MONTH_LABELS = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
] as const

/**
 * Etiqueta del mes a partir de su índice base 0 (0 = enero).
 *
 * Normaliza con módulo positivo, así que acepta índices desplazados
 * (`month - offset` puede salir negativo al retroceder períodos) sin que el
 * llamante tenga que envolverlos.
 */
export function monthLabel(monthIndex: number): string {
  // El módulo positivo acota el índice a 0-11 sobre una tupla de 12, pero TS no
  // puede probarlo: es el único punto donde la aserción está justificada. Un
  // `?? ''` aquí sería peor, porque renderizaría una etiqueta vacía en silencio.
  return MONTH_LABELS[((monthIndex % 12) + 12) % 12]!
}

/** Partes de una fecha `YYYY-MM-DD` (calendario local, sin husos). */
export interface ISODateParts {
  year: number
  month: number
  /** Base 1, tal cual aparece en la cadena. */
  day: number
}

/**
 * Descompone una fecha `YYYY-MM-DD` en sus partes numéricas.
 *
 * Trabaja por posición en vez de `split('-')` porque el formato es de ancho
 * fijo: evita el acceso por índice a un array de tamaño desconocido.
 */
export function parseISODate(date: string): ISODateParts {
  return {
    year: Number(date.slice(0, 4)),
    month: Number(date.slice(5, 7)),
    day: Number(date.slice(8, 10)),
  }
}
