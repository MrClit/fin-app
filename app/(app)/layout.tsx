import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppHeader } from '@/components/app-header'
import { BottomNav } from '@/components/bottom-nav'
import { SyncStatusProvider } from '@/components/sync/SyncStatusProvider'
import { UnreadProvider } from '@/components/transactions/UnreadProvider'
import { getConsentBannerData } from '@/lib/accounts'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Datos de perfil del proveedor OAuth (Google rellena estos campos en
  // user_metadata). Con login email/contraseña vienen vacíos.
  const meta = user.user_metadata ?? {}
  const avatarUrl = (meta.avatar_url ?? meta.picture ?? null) as string | null
  const fullName = (meta.full_name ?? meta.name ?? null) as string | null

  // Estado de caducidad PSD2 para el banner global (spec §9.2). Consulta
  // ligera; se reejecuta al montar el grupo (app) y tras router.refresh().
  const { data: ebAccounts } = await supabase
    .from('accounts')
    .select('name, source, consent_expires_at')
    .eq('source', 'enablebanking')
    .eq('is_active', true)
  const consentBanner = getConsentBannerData(ebAccounts ?? [])

  // Conteo de movimientos no leídos para el badge de la tabBar (issue #149). RLS
  // limita la consulta al hogar del usuario. `head: true` evita traer filas.
  const { count: unreadCount } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('is_read', false)

  return (
    <div className="relative mx-auto w-full max-w-105 min-h-screen overflow-clip bg-background">
      <SyncStatusProvider>
        <UnreadProvider initialCount={unreadCount ?? 0}>
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
        </UnreadProvider>
      </SyncStatusProvider>
    </div>
  )
}
