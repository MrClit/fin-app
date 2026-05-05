import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ThemeToggle } from '@/components/theme-toggle'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: config } = await supabase
      .from('user_config')
      .select('has_onboarded')
      .eq('user_id', user.id)
      .single()

    if (!config?.has_onboarded) redirect('/onboarding')
  }

  return (
    <div className="px-6 pt-14 flex flex-col gap-4">
      <div className="flex justify-end">
        <ThemeToggle />
      </div>
      <p className="text-muted-foreground text-sm">Dashboard — próximamente</p>
    </div>
  )
}
