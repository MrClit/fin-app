import { timingSafeEqual } from 'node:crypto'

/**
 * Comprueba en tiempo constante que el header `Authorization` coincide con
 * `Bearer <secret>`. Usado por los webhooks autenticados por secreto compartido
 * (scrapers de Edenred / Sabadell, cron de Enable Banking). Devuelve false si el
 * header falta o no coincide; nunca lanza.
 */
export function safeBearerMatch(header: string | null, secret: string): boolean {
  if (!header) return false
  const expected = `Bearer ${secret}`
  const a = Buffer.from(header)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
