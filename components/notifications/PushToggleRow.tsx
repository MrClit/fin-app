'use client'

import { Bell, BellRing, Loader2 } from 'lucide-react'
import { usePushSubscription } from '@/hooks/usePushSubscription'
import { useSyncStatus } from '@/components/sync/SyncStatusProvider'

/**
 * Fila de activar/desactivar notificaciones push, pensada para el menú de usuario
 * (#177). Antes vivía en la campana (NotificationsTrigger, #115); se movió aquí al
 * convertir la campana en un centro de notificaciones (lista in-app).
 *
 * El toggle es el **interruptor maestro de todo el push** del dispositivo
 * (`push_subscriptions` no distingue por tipo): cubre avisos de caducidad del
 * acceso bancario (#115) y de fallos de sincronización de los scrapers (#177). La
 * lista de la campana funciona aunque el push esté desactivado.
 */
export function PushToggleRow() {
  const { support, enabled, busy, denied, subscribe, unsubscribe } = usePushSubscription()
  const { showToast } = useSyncStatus()

  // El hook rechaza la promesa si algo falla; la capturamos para avisar al usuario
  // en vez de dejar el botón como si «no hubiera pasado nada» (#123).
  async function handleSubscribe() {
    try {
      await subscribe()
    } catch (err) {
      console.error('[PushToggleRow.subscribe]', err)
      showToast('No se pudieron activar las notificaciones, inténtalo de nuevo.', handleSubscribe)
    }
  }

  async function handleUnsubscribe() {
    try {
      await unsubscribe()
    } catch (err) {
      console.error('[PushToggleRow.unsubscribe]', err)
      showToast('No se pudieron desactivar las notificaciones, inténtalo de nuevo.', handleUnsubscribe)
    }
  }

  return (
    <div className="flex flex-col">
      <div className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-sm font-medium text-foreground">
        <span className="flex items-center gap-3">
          {enabled ? (
            <BellRing className="size-4.5 text-primary" strokeWidth={2} />
          ) : (
            <Bell className="size-4.5" strokeWidth={2} />
          )}
          Notificaciones push
        </span>

        {support === 'loading' && (
          <Loader2 className="size-4 animate-spin text-muted-foreground" strokeWidth={2} />
        )}

        {support === 'supported' && (
          <button
            type="button"
            onClick={enabled ? handleUnsubscribe : handleSubscribe}
            disabled={busy || (!enabled && denied)}
            aria-pressed={enabled}
            className={
              enabled
                ? 'rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50'
                : 'rounded-lg bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50'
            }
          >
            {enabled ? 'Desactivar' : 'Activar'}
          </button>
        )}
      </div>

      {support === 'error' && (
        <p className="px-3 pb-1 text-xs text-muted-foreground">
          No se pudo cargar el servicio de notificaciones. Recarga la página e inténtalo de nuevo.
        </p>
      )}
      {support === 'unsupported' && (
        <p className="px-3 pb-1 text-xs text-muted-foreground">
          Tu navegador no admite notificaciones push. En iPhone, instala antes la app desde
          «Compartir → Añadir a pantalla de inicio» (requiere iOS 16.4 o superior).
        </p>
      )}
      {support === 'supported' && denied && !enabled && (
        <p className="px-3 pb-1 text-xs text-muted-foreground">
          Has bloqueado las notificaciones para este sitio. Habilítalas en los ajustes del
          navegador para poder activarlas.
        </p>
      )}
      {support === 'supported' && !denied && (
        <p className="px-3 pb-1 text-xs text-muted-foreground">
          {enabled
            ? 'Avisos de caducidad del acceso bancario y de fallos de sincronización.'
            : 'Actívalas para recibir avisos de caducidad bancaria y de fallos de sincronización.'}
        </p>
      )}
    </div>
  )
}
