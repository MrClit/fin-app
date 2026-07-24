'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUnread } from '@/components/transactions/UnreadProvider'
import { NAV_ITEMS } from '@/components/nav-items'
import { UserMenuTrigger } from '@/components/dashboard/UserMenuTrigger'
import { NotificationsTrigger } from '@/components/notifications/NotificationsTrigger'
import { cn } from '@/lib/utils'

type Props = {
  email: string
  avatarUrl?: string | null
  fullName?: string | null
}

/**
 * Navegación lateral de `md` en adelante (#364): rail de iconos + etiqueta a 80px
 * que se expande a sidebar de 240px en `xl`. Sustituye a `BottomNav`, que se
 * oculta a partir de `md`, y recoge los disparadores de notificaciones y menú de
 * usuario que en móvil viven en `AppHeader`.
 *
 * Su ancho **es** `--content-offset`, el mismo hueco que el app-shell reserva con
 * `padding-left`: así el rail y su hueco no pueden desincronizarse. Cuelga del
 * shell y no del `template.tsx` de analytics, para que el slide del detalle de
 * categoría (#315) no lo convierta en viewport de su `position: fixed`.
 */
export function SideNav({ email, avatarUrl, fullName }: Props) {
  const pathname = usePathname()
  const { count: unreadCount } = useUnread()

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-y-0 left-0 z-100 hidden w-(--content-offset) flex-col
                 border-r border-sidebar-border bg-sidebar text-sidebar-foreground
                 pt-[max(env(safe-area-inset-top),1rem)]
                 pb-[max(env(safe-area-inset-bottom),1rem)] md:flex"
    >
      <div className="flex justify-center px-2 xl:justify-end xl:px-4">
        <NotificationsTrigger />
      </div>

      <div className="mt-4 flex flex-col gap-1 px-2 xl:px-3">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          // A diferencia de la bottom nav —que se oculta en el detalle de
          // categoría—, el rail sigue visible allí: «Análisis» debe quedar activo
          // en sus subrutas.
          const active = pathname === href || (href !== '/' && pathname.startsWith(`${href}/`))
          const showBadge = href === '/transactions' && unreadCount > 0
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                `flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-3xs
                 transition-colors duration-200
                 xl:flex-row xl:gap-3 xl:px-3 xl:py-2.5 xl:text-sm`,
                active
                  ? 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground'
                  : 'font-normal text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )}
            >
              <span className="relative flex items-center justify-center">
                <Icon className="size-5" strokeWidth={active ? 2 : 1.8} />
                {showBadge && (
                  <span
                    className="absolute -top-1 -right-2 flex h-4 min-w-4 items-center justify-center
                               rounded-full bg-primary px-1 text-3xs font-bold leading-none text-primary-foreground"
                    aria-label={`${unreadCount} movimientos no leídos`}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </span>
              {label}
            </Link>
          )
        })}
      </div>

      <div className="mt-auto flex justify-center px-2 xl:justify-start xl:px-4">
        <UserMenuTrigger email={email} avatarUrl={avatarUrl} fullName={fullName} />
      </div>
    </nav>
  )
}
