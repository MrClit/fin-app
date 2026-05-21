'use client'

import { usePathname } from 'next/navigation'
import { Bell } from 'lucide-react'
import { UserMenuTrigger } from './dashboard/UserMenuTrigger'
import { StatusBanner } from './sync/StatusBanner'
import type { ConsentBannerData } from '@/lib/accounts'

type Props = { email: string; consentBanner: ConsentBannerData | null }

export function AppHeader({ email, consentBanner }: Props) {
  const pathname = usePathname()
  if (pathname.startsWith('/analisis/categoria/')) return null

  return (
    <header className="safe-top sticky top-0 z-40 bg-background/85 backdrop-blur-xl">
      <div className="flex h-12 items-center justify-between px-4">
        <UserMenuTrigger email={email} />
        <button
          type="button"
          aria-label="Notificaciones"
          disabled
          className="grid size-9 place-items-center rounded-full text-muted-foreground disabled:cursor-not-allowed"
        >
          <Bell className="size-4.5" strokeWidth={2} />
        </button>
      </div>
      <StatusBanner consent={consentBanner} />
    </header>
  )
}
