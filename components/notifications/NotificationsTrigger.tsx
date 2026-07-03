'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Bell, Loader2 } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { useNotifications } from '@/components/notifications/NotificationsProvider'

/**
 * Campana del header como centro de notificaciones in-app (#177). Muestra un badge
 * con el nº de no leídas (alimentado por NotificationsProvider) y, al abrir el
 * Sheet, la lista de avisos. Al abrir se marcan todas como leídas (badge a 0). El
 * toggle de activar/desactivar push vive ahora en el menú de usuario (PushToggleRow).
 */

interface NotificationItem {
  id: string
  source: string | null
  kind: string | null
  title: string
  body: string
  url: string | null
  read_at: string | null
  created_at: string
}

// Tiempo relativo en castellano, sin dependencias (Intl.RelativeTimeFormat).
const rtf = new Intl.RelativeTimeFormat('es-ES', { numeric: 'auto' })
function timeAgo(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now()
  const min = Math.round(diffMs / 60_000)
  if (Math.abs(min) < 60) return rtf.format(min, 'minute')
  const hours = Math.round(min / 60)
  if (Math.abs(hours) < 24) return rtf.format(hours, 'hour')
  return rtf.format(Math.round(hours / 24), 'day')
}

export function NotificationsTrigger() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotificationItem[] | null>(null)
  const [loading, setLoading] = useState(false)
  const { count, setCount } = useNotifications()

  // Al abrir: cargar la lista y marcar todas como leídas (badge optimista a 0).
  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next)
      if (!next) {
        setItems(null)
        return
      }

      setLoading(true)
      fetch('/api/notifications', { cache: 'no-store' })
        .then(res => (res.ok ? res.json() : null))
        .then(json => setItems(json?.notifications ?? []))
        .catch(() => setItems([]))
        .finally(() => setLoading(false))

      if (count > 0) {
        setCount(0)
        fetch('/api/notifications/mark-read', { method: 'POST' }).catch(() => {
          // Si falla, el provider revalidará el conteo real en el próximo ciclo.
        })
      }
    },
    [count, setCount]
  )

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger
        render={
          <button
            type="button"
            aria-label={count > 0 ? `Notificaciones (${count} sin leer)` : 'Notificaciones'}
            className="relative grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Bell className="size-4.5" strokeWidth={2} />
            {count > 0 && (
              <span
                className="absolute -top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center
                           rounded-full bg-primary px-1 text-3xs font-bold leading-none text-primary-foreground"
              >
                {count > 99 ? '99+' : count}
              </span>
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
            <SheetDescription className="text-xs">Avisos de la app</SheetDescription>
          </div>
        </SheetHeader>

        <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto px-4 pb-2 pt-2">
          {loading && items === null && (
            <p className="flex items-center gap-2 py-6 text-xs text-muted-foreground">
              <Loader2 className="size-4 animate-spin" strokeWidth={2} />
              Cargando…
            </p>
          )}

          {items !== null && items.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No tienes notificaciones
            </p>
          )}

          {items?.map(item => {
            const Inner = (
              <>
                <AlertTriangle
                  className="mt-0.5 size-4.5 shrink-0 text-amber-500"
                  strokeWidth={2}
                />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm font-medium text-foreground">{item.title}</span>
                  <span className="text-xs text-muted-foreground">{item.body}</span>
                  <span className="text-2xs text-muted-foreground/70">
                    {timeAgo(item.created_at)}
                  </span>
                </span>
              </>
            )
            const className =
              'flex items-start gap-3 rounded-xl border border-border bg-card px-3 py-3 text-left'
            return item.url ? (
              <Link
                key={item.id}
                href={item.url}
                onClick={() => setOpen(false)}
                className={`${className} transition-colors hover:bg-muted`}
              >
                {Inner}
              </Link>
            ) : (
              <div key={item.id} className={className}>
                {Inner}
              </div>
            )
          })}
        </div>
      </SheetContent>
    </Sheet>
  )
}
