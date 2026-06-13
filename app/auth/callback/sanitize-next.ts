/**
 * Garantiza que el destino post-login sea una ruta interna relativa.
 * Rechaza rutas externas: protocol-relative (`//host`), backslash trick
 * (`/\host`) y cualquier valor que no empiece por `/`.
 */
export function sanitizeNext(raw: string): string {
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) {
    return '/'
  }
  return raw
}
