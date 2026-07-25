'use client'

import { usePathname } from 'next/navigation'
import { UserMenuTrigger } from './dashboard/UserMenuTrigger'
import { NotificationsTrigger } from './notifications/NotificationsTrigger'
import { StatusBanner } from './sync/StatusBanner'
import type { ConsentBannerData } from '@/lib/accounts'

type Props = {
  email: string
  avatarUrl?: string | null
  fullName?: string | null
  consentBanner: ConsentBannerData | null
}

export function AppHeader({ email, avatarUrl, fullName, consentBanner }: Props) {
  const pathname = usePathname()
  if (pathname.startsWith('/analytics/category/')) return null

  return (
    <header className="pt-[env(safe-area-inset-top)] sticky top-0 z-40 bg-background/85 backdrop-blur-xl">
      {/* En `md+` estos dos disparadores viven en el rail lateral (#364); el header
          se queda como cabecera de contenido, solo para el StatusBanner. */}
      <div className="flex h-12 items-center justify-between px-4 md:hidden">
        <UserMenuTrigger email={email} avatarUrl={avatarUrl} fullName={fullName} />
        <NotificationsTrigger />
      </div>
      <StatusBanner consent={consentBanner} />
    </header>
  )
}
