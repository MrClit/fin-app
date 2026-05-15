import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppHeader } from '@/components/app-header'
import { BottomNav } from '@/components/bottom-nav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="relative mx-auto w-full max-w-105 min-h-screen overflow-clip bg-background">
      <AppHeader email={user.email ?? ''} />
      <main className="pb-22.5 animate-fade-in">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
