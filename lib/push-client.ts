/**
 * Helpers de push seguros para el cliente (issue #115). No importa `web-push`
 * (Node-only) para no arrastrarlo al bundle del navegador.
 */

/**
 * Convierte la clave VAPID pública (base64url) al `Uint8Array` que exige
 * `pushManager.subscribe({ applicationServerKey })`.
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  // Buffer ArrayBuffer explícito: satisface el tipo BufferSource que exige
  // pushManager.subscribe (TS 5.7+ distingue ArrayBuffer de ArrayBufferLike).
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length))
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
