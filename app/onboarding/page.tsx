import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OnboardingClient } from '@/components/onboarding/OnboardingClient'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: config } = await supabase
    .from('user_config')
    .select('has_onboarded')
    .eq('user_id', user.id)
    .single()

  if (config?.has_onboarded) redirect('/')

  return <OnboardingClient />
}
