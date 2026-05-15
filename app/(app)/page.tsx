import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDashboardData } from '@/lib/dashboard'
import { DashboardBalanceCard } from '@/components/dashboard/DashboardBalanceCard'
import { DashboardAccountGrid } from '@/components/dashboard/DashboardAccountGrid'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { PatrimonioChart } from '@/components/dashboard/PatrimonioChart'

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

  const { balance, weeklyDelta, dailyBalances, accounts, patrimonioData, annualDelta } = await getDashboardData()

  return (
    <>
      <DashboardHeader email={user?.email ?? ''} />
      <div className="flex flex-col gap-4 px-4 pt-3 pb-6">
        <DashboardBalanceCard
          balance={balance}
          weeklyDelta={weeklyDelta}
          dailyBalances={dailyBalances}
        />
        <PatrimonioChart data={patrimonioData} annualDelta={annualDelta} />
        <DashboardAccountGrid accounts={accounts} />
      </div>
    </>
  )
}
