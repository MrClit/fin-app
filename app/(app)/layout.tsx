import { redirect } from 'next/navigation'
import { getCurrentUser, getCurrentHouseholdId, getRequestClient } from '@/lib/auth/session'
import { AppHeader } from '@/components/app-header'
import { BottomNav } from '@/components/bottom-nav'
import { SideNav } from '@/components/side-nav'
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

  // App-shell (#363): el ancho útil ya no lo fija el contenedor raíz sino el área
  // de contenido, vía `--content-max`. El padding izquierdo reserva el sitio del
  // rail de navegación; la clase `app-shell` es la que declara su ancho por
  // breakpoint (`--content-offset`, 0 en móvil).
  return (
    <div className="app-shell min-h-screen bg-background pl-(--content-offset)">
      <SyncStatusProvider>
        <UnreadProvider initialCount={unreadCount}>
          <NotificationsProvider initialCount={unreadNotifications}>
            {/* Área de contenido: la columna. `overflow-clip` —nunca `hidden`—
                recorta el slide del detalle de categoría sin crear un contenedor
                de scroll: el scroll sigue siendo el del documento y los sticky
                siguen anclados al viewport. */}
            <div className="relative mx-auto w-full max-w-(--content-max) overflow-clip">
              <AppHeader
                email={user.email ?? ''}
                avatarUrl={avatarUrl}
                fullName={fullName}
                consentBanner={consentBanner}
              />
              {/* El colchón inferior solo existe por la bottom nav; en `md+` la
                  navegación es lateral y no hay nada que esquivar. */}
              <main className="pb-22.5 animate-fade-in md:pb-8">
                {children}
              </main>
            </div>
            {/* Slot de navegación: los dos son `fixed` y viven fuera del flujo, y
                son excluyentes por breakpoint. Cuelgan de aquí —fuera del template
                de analytics— para que el slide del detalle de categoría no los
                capture. */}
            <BottomNav />
            <SideNav email={user.email ?? ''} avatarUrl={avatarUrl} fullName={fullName} />
          </NotificationsProvider>
        </UnreadProvider>
      </SyncStatusProvider>
    </div>
  )
}
