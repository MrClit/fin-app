// Parsers del scraper de Sabadell.
//
// A diferencia de Edenred (que muestra los importes/fechas sólo como texto en
// español), las celdas de movimiento de Sabadell exponen el valor en formato
// máquina dentro del atributo `abbr`:
//   - fecha:   <td headers="fecha" abbr="2026-05-25"> 25/05 </td>   (ISO)
//   - importe: <td headers="amount" abbr="156.20"> 156,20&nbsp;€ </td> (punto decimal)
// Por eso el scraper lee `abbr` y estos parsers son finos, pero se mantienen
// tolerantes por si Sabadell cambiara el front (fallback al texto en español).

// "156.20" | "-156.20" | "1234.56" (formato `abbr`, punto decimal, sin miles) →
// número. Fallback: texto español "1.234,56 €" → 1234.56.
export function parseAmount(raw) {
  if (raw == null) return NaN
  let s = String(raw).replace(/&nbsp;/gi, ' ').replace(/[€\s]/g, '').trim()
  if (s === '') return NaN
  // Formato español (coma decimal): hay coma → los puntos son separador de miles.
  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.')
  }
  const n = Number(s)
  return Number.isFinite(n) ? n : NaN
}

// "2026-05-25" (atributo `abbr`, ya ISO) → "2026-05-25". Valida el formato y lo
// normaliza; devuelve null si no es una fecha ISO reconocible.
export function parseDate(raw) {
  if (raw == null) return null
  const s = String(raw).trim()
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  return `${m[1]}-${m[2]}-${m[3]}`
}
