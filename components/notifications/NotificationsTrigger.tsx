'use client'

import { useState } from 'react'
import { Bell, BellOff, BellRing, Loader2 } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { usePushSubscription } from '@/hooks/usePushSubscription'
import { useSyncStatus } from '@/components/sync/SyncStatusProvider'

/**
 * Campana del header (issue #115). Abre un Sheet para activar/desactivar las
 * notificaciones push. El permiso se solicita solo al pulsar "Activar".
 */
export function NotificationsTrigger() {
  const [open, setOpen] = useState(false)
  const { support, enabled, busy, denied, subscribe, unsubscribe } = usePushSubscription()
  const { showToast } = useSyncStatus()

  // El hook rechaza la promesa si algo falla; aquí la capturamos para avisar al
  // usuario en vez de dejar el botón como si «no hubiera pasado nada» (#123).
  async function handleSubscribe() {
    try {
      await subscribe()
    } catch (err) {
      console.error('[NotificationsTrigger.subscribe]', err)
      showToast('No se pudieron activar las notificaciones, inténtalo de nuevo.', handleSubscribe)
    }
  }

  async function handleUnsubscribe() {
    try {
      await unsubscribe()
    } catch (err) {
      console.error('[NotificationsTrigger.unsubscribe]', err)
      showToast(
        'No se pudieron desactivar las notificaciones, inténtalo de nuevo.',
        handleUnsubscribe
      )
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <button
            type="button"
            aria-label="Notificaciones"
            className="grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {enabled ? (
              <BellRing className="size-4.5 text-primary" strokeWidth={2} />
            ) : (
              <Bell className="size-4.5" strokeWidth={2} />
            )}
          </button>
        }
      />
      <SheetContent
        side="bottom"
        className="rounded-t-3xl pt-2 pb-[max(env(safe-area-inset-bottom),1.5rem)]"
      >
        <SheetHeader className="flex flex-row items-center gap-3 pt-3">
          <div className="grid size-10 place-items-center rounded-full bg-accent text-foreground">
            <Bell className="size-5" strokeWidth={2} />
          </div>
          <div className="flex flex-col gap-0.5 text-left">
            <SheetTitle className="text-sm">Notificaciones</SheetTitle>
            <SheetDescription className="text-xs">
              Avisos de caducidad del acceso bancario
            </SheetDescription>
          </div>
        </SheetHeader>

        <div className="flex flex-col gap-3 px-4 pb-2 pt-2">
          {support === 'loading' && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-4 animate-spin" strokeWidth={2} />
              Comprobando compatibilidad…
            </p>
          )}

          {support === 'error' && (
            <p className="text-xs text-muted-foreground">
              No se pudo cargar el servicio de notificaciones. Recarga la página e inténtalo de
              nuevo.
            </p>
          )}

          {support === 'unsupported' && (
            <p className="text-xs text-muted-foreground">
              Tu navegador no admite notificaciones push. En iPhone, instala antes la app desde
              «Compartir → Añadir a pantalla de inicio» (requiere iOS 16.4 o superior).
            </p>
          )}

          {support === 'supported' && denied && !enabled && (
            <p className="text-xs text-muted-foreground">
              Has bloqueado las notificaciones para este sitio. Habilítalas en los ajustes del
              navegador para poder activarlas.
            </p>
          )}

          {support === 'supported' && !denied && (
            <p className="text-xs text-muted-foreground">
              {enabled
                ? 'Recibirás un aviso cuando el acceso a alguno de tus bancos esté a punto de caducar.'
                : 'Activa los avisos para enterarte antes de que caduque el acceso a tus bancos.'}
            </p>
          )}

          {support === 'supported' &&
            (enabled ? (
              <button
                type="button"
                onClick={handleUnsubscribe}
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-border px-3 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
              >
                <BellOff className="size-4.5" strokeWidth={2} />
                Desactivar notificaciones
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubscribe}
                disabled={busy || denied}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                <BellRing className="size-4.5" strokeWidth={2} />
                Activar notificaciones
              </button>
            ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}
