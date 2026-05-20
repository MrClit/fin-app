/**
 * Cooldown mínimo entre sincronizaciones con Enable Banking.
 *
 * EB permite 4 syncs/día por consentimiento. Con un cooldown de 6h entre
 * sincronizaciones (manual o cron, ambas actualizan `accounts.last_synced`)
 * no se puede superar ese límite. Se enforza en el servidor; el cliente lo
 * usa solo para mostrar el estado del botón.
 */
export const SYNC_COOLDOWN_MS = 6 * 60 * 60 * 1000

/**
 * Devuelve el instante (ms epoch) en que el sync volverá a estar disponible,
 * o `null` si ya se puede sincronizar.
 */
export function syncAvailableAt(lastSynced: string | number | null): number | null {
  if (!lastSynced) return null
  const last = typeof lastSynced === 'number' ? lastSynced : new Date(lastSynced).getTime()
  if (Number.isNaN(last)) return null
  const availableAt = last + SYNC_COOLDOWN_MS
  return availableAt > Date.now() ? availableAt : null
}
