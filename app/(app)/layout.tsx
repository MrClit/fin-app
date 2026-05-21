import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppHeader } from '@/components/app-header'
import { BottomNav } from '@/components/bottom-nav'
import { SyncStatusProvider } from '@/components/sync/SyncStatusProvider'
import { getConsentBannerData } from '@/lib/accounts'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Estado de caducidad PSD2 para el banner global (spec §9.2). Consulta
  // ligera; se reejecuta al montar el grupo (app) y tras router.refresh().
  const { data: ebAccounts } = await supabase
    .from('accounts')
    .select('name, source, consent_expires_at')
    .eq('source', 'enablebanking')
    .eq('is_active', true)
  const consentBanner = getConsentBannerData(ebAccounts ?? [])

  return (
    <div className="relative mx-auto w-full max-w-105 min-h-screen overflow-clip bg-background">
      <SyncStatusProvider>
        <AppHeader email={user.email ?? ''} consentBanner={consentBanner} />
        <main className="pb-22.5 animate-fade-in">
          {children}
        </main>
        <BottomNav />
      </SyncStatusProvider>
    </div>
  )
}
