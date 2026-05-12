'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, List, Wallet, BarChart2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/',            label: 'Inicio',      Icon: Home },
  { href: '/movimientos', label: 'Movimientos', Icon: List },
  { href: '/cuentas',     label: 'Cuentas',     Icon: Wallet },
  { href: '/analisis',    label: 'Análisis',    Icon: BarChart2 },
] as const

export function BottomNav() {
  const pathname = usePathname()
  if (pathname.startsWith('/analisis/categoria/')) return null

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-105 z-100
                 border-t border-border safe-bottom"
      style={{ background: 'var(--app-nav-bg)', backdropFilter: 'blur(20px)' }}
    >
      <div className="flex pt-2.5">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = pathname === href
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
                  'flex items-center justify-center rounded-xl px-4 py-1 transition-colors duration-200',
                  active && 'bg-accent'
                )}
              >
                <Icon className="size-5" strokeWidth={active ? 2 : 1.8} />
              </span>
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
