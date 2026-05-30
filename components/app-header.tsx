'use client'

import { usePathname } from 'next/navigation'
import { UserMenuTrigger } from './dashboard/UserMenuTrigger'
import { NotificationsTrigger } from './notifications/NotificationsTrigger'
import { StatusBanner } from './sync/StatusBanner'
import type { ConsentBannerData } from '@/lib/accounts'

type Props = { email: string; consentBanner: ConsentBannerData | null }

export function AppHeader({ email, consentBanner }: Props) {
  const pathname = usePathname()
  if (pathname.startsWith('/analisis/categoria/')) return null

  return (
    <header className="pt-[env(safe-area-inset-top)] sticky top-0 z-40 bg-background/85 backdrop-blur-xl">
      <div className="flex h-12 items-center justify-between px-4">
        <UserMenuTrigger email={email} />
        <NotificationsTrigger />
      </div>
      <StatusBanner consent={consentBanner} />
    </header>
  )
}
