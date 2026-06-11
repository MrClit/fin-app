// Parsers puros del scraper de Edenred. Sin dependencias de Playwright ni de
// process.exit: así son testeables de forma aislada (ver parsers.test.mjs).
// Las usa scrape.mjs.

// Parsea importes en formato español ("12,50 €" o "-12,50 €") a number.
export function parseAmount(raw) {
  const cleaned = raw.replace(/[^0-9,.\-]/g, '').replace(/\./g, '').replace(',', '.')
  const n = Number.parseFloat(cleaned)
  if (Number.isNaN(n)) throw new Error(`No se pudo parsear importe: "${raw}"`)
  return n
}

// "15/05/2026" o "15 may 2026" → "2026-05-15".
export function parseDate(raw) {
  const m = raw.trim().match(/(\d{1,2})[\/\s-](\d{1,2}|[a-záéíóú]+)[\/\s-](\d{4})/i)
  if (!m) throw new Error(`No se pudo parsear fecha: "${raw}"`)
  const day = m[1].padStart(2, '0')
  const monthRaw = m[2].toLowerCase()
  const months = {
    ene: '01', feb: '02', mar: '03', abr: '04', may: '05', jun: '06',
    jul: '07', ago: '08', sep: '09', oct: '10', nov: '11', dic: '12',
  }
  let month
  if (/^\d+$/.test(monthRaw)) {
    month = monthRaw.padStart(2, '0')
  } else {
    month = months[monthRaw.slice(0, 3)]
    if (!month) throw new Error(`Mes desconocido: "${monthRaw}"`)
  }
  return `${m[3]}-${month}-${day}`
}
