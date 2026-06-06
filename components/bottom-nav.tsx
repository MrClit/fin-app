'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, List, Wallet, BarChart2 } from 'lucide-react'
import { useUnread } from '@/components/transactions/UnreadProvider'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/',            label: 'Inicio',      Icon: Home },
  { href: '/transactions', label: 'Movimientos', Icon: List },
  { href: '/accounts',     label: 'Cuentas',     Icon: Wallet },
  { href: '/analytics',    label: 'Análisis',    Icon: BarChart2 },
] as const

export function BottomNav({ alwaysShow = false }: { alwaysShow?: boolean } = {}) {
  const pathname = usePathname()
  const { count: unreadCount } = useUnread()
  if (!alwaysShow && pathname.startsWith('/analytics/category/')) return null

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-105 z-100
                 border-t border-border pb-[max(env(safe-area-inset-bottom),1.5rem)]"
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
                'flex flex-1 flex-col items-center gap-0.75 py-1.5 text-[10px] transition-colors duration-200',
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
                               rounded-full bg-primary px-1 text-[9px] font-bold leading-none text-primary-foreground"
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
