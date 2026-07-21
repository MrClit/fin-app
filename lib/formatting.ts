export const fmt = (n: number, decimals = 0): string => {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  // `split('.')` siempre devuelve al menos un elemento, pero TS no lo sabe: el
  // default en el destructuring lo estrecha sin cambiar el comportamiento.
  const [intPart = '', decPart] = abs.toFixed(decimals).split('.')
  const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return sign + intFormatted + (decPart !== undefined ? ',' + decPart : '')
}
