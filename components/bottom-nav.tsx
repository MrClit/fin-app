'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUnread } from '@/components/transactions/UnreadProvider'
import { NAV_ITEMS } from '@/components/nav-items'
import { cn } from '@/lib/utils'

/**
 * `alwaysShow`: la barra se ve en cualquier ruta y a cualquier ancho. Solo lo usa
 * `/~offline`, que vive fuera del app-shell y donde esta barra es la única salida
 * (allí no hay rail lateral). En el resto, la barra es la navegación de móvil y
 * cede el sitio a `SideNav` a partir de `md` (#364).
 */
export function BottomNav({ alwaysShow = false }: { alwaysShow?: boolean } = {}) {
  const pathname = usePathname()
  const { count: unreadCount } = useUnread()
  if (!alwaysShow && pathname.startsWith('/analytics/category/')) return null

  return (
    <nav
      className={cn(
        `fixed bottom-0 content-anchored z-100
         border-t border-border pb-[max(env(safe-area-inset-bottom),1.5rem)]`,
        !alwaysShow && 'md:hidden'
      )}
      style={{ background: 'var(--app-nav-bg)', backdropFilter: 'blur(20px)' }}
    >
      <div className="flex pt-2.5">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = pathname === href
          const showBadge = href === '/transactions' && unreadCount > 0
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-1 flex-col items-center gap-0.75 py-1.5 text-3xs transition-colors duration-200',
                active ? 'text-primary font-semibold' : 'text-muted-foreground font-normal'
              )}
            >
              <span
                className={cn(
                  'relative flex items-center justify-center rounded-xl px-4 py-1 transition-colors duration-200',
                  active && 'bg-accent'
                )}
              >
                <Icon className="size-5" strokeWidth={active ? 2 : 1.8} />
                {showBadge && (
                  <span
                    className="absolute -top-0.5 right-2 flex h-4 min-w-4 items-center justify-center
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
    </nav>
  )
}
