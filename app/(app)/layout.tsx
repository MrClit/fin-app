import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BottomNav } from '@/components/bottom-nav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="relative mx-auto w-full max-w-[420px] min-h-screen overflow-clip bg-background">
      <main className="pb-[90px] animate-fade-in">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
