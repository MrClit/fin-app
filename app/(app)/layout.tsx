import { redirect } from 'next/navigation'
import { getCurrentUser, getCurrentHouseholdId, getRequestClient } from '@/lib/auth/session'
import { AppHeader } from '@/components/app-header'
import { BottomNav } from '@/components/bottom-nav'
import { SyncStatusProvider } from '@/components/sync/SyncStatusProvider'
import { UnreadProvider } from '@/components/transactions/UnreadProvider'
import { NotificationsProvider } from '@/components/notifications/NotificationsProvider'
import { getConsentBannerData, getActiveAccounts } from '@/lib/accounts'
import { getUnreadCount } from '@/lib/transactions'
import { getUnreadNotificationsCount } from '@/lib/notifications'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const householdId = await getCurrentHouseholdId()
  if (!householdId) redirect('/login')

  const supabase = await getRequestClient()

  // Datos de perfil del proveedor OAuth (Google rellena estos campos en
  // user_metadata). Con login email/contraseña vienen vacíos.
  const meta = user.user_metadata ?? {}
  const avatarUrl = (meta.avatar_url ?? meta.picture ?? null) as string | null
  const fullName = (meta.full_name ?? meta.name ?? null) as string | null

  // Datos de los badges y del banner PSD2 (spec §9.2). Consultas ligeras que se
  // reejecutan al montar el grupo (app) y tras router.refresh(); van en paralelo
  // porque son independientes entre sí.
  const [accounts, unreadCount, unreadNotifications] = await Promise.all([
    getActiveAccounts(supabase, householdId),
    getUnreadCount(supabase, householdId),
    getUnreadNotificationsCount(supabase, user.id),
  ])

  // `getConsentBannerData` ya se queda sólo con las cuentas `enablebanking`.
  const consentBanner = getConsentBannerData(accounts)

  return (
    <div className="relative mx-auto w-full max-w-105 min-h-screen overflow-clip bg-background">
      <SyncStatusProvider>
        <UnreadProvider initialCount={unreadCount}>
          <NotificationsProvider initialCount={unreadNotifications}>
            <AppHeader
              email={user.email ?? ''}
              avatarUrl={avatarUrl}
              fullName={fullName}
              consentBanner={consentBanner}
            />
            <main className="pb-22.5 animate-fade-in">
              {children}
            </main>
            <BottomNav />
          </NotificationsProvider>
        </UnreadProvider>
      </SyncStatusProvider>
    </div>
  )
}
