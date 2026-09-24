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

// Importe y categoría de una fila de movimientos (#413).
//
// El signo es el que muestra Edenred ("-11,90 €" consumo, "225 €" recarga), sin
// reinterpretarlo: hasta agosto de 2026 los importes venían sin signo y se
// negaba todo lo que no fuera "RECARGA", pero Edenred empezó a mostrarlo y esa
// negación los invertía. Respetarlo también deja bien una devolución: entra en
// positivo en 'restaurant' (expense) y resta del gasto, como las de los bancos.
//
// "RECARGA" es el top-up del ticket restaurante que carga la empresa: retribución
// que forma parte de la nómina → 'payroll'. Todo lo demás → 'restaurant'. Ambos
// ids deben existir en `lib/categories/catalog.ts`.
export function parseMovement(description, rawAmount) {
  const isRecharge = description.toUpperCase() === 'RECARGA'
  return {
    amount: parseAmount(rawAmount),
    category: isRecharge ? 'payroll' : 'restaurant',
  }
}

// Detecta que Edenred ha vuelto a mostrar los importes sin signo (#413): hay
// movimientos que no son recarga y ninguno es negativo. Una lectura hecha solo
// de devoluciones daría también true, pero en la ventana de ~8 filas que
// muestra Edenred es prácticamente imposible, y abortar con aviso es preferible
// a guardar consumos en positivo en silencio.
export function looksUnsigned(movements) {
  const spending = movements.filter(m => m.category !== 'payroll')
  return spending.length > 0 && spending.every(m => m.amount >= 0)
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
