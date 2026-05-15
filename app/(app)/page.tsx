import { getDashboardData } from '@/lib/dashboard'
import { DashboardBalanceCard } from '@/components/dashboard/DashboardBalanceCard'
import { DashboardAccountGrid } from '@/components/dashboard/DashboardAccountGrid'
import { PatrimonioChart } from '@/components/dashboard/PatrimonioChart'

export default async function HomePage() {
  const { balance, weeklyDelta, dailyBalances, accounts, patrimonioData, annualDelta } = await getDashboardData()

  return (
    <div className="flex flex-col gap-4 px-4 pt-3 pb-6">
      <DashboardBalanceCard
        balance={balance}
        weeklyDelta={weeklyDelta}
        dailyBalances={dailyBalances}
      />
      <PatrimonioChart data={patrimonioData} annualDelta={annualDelta} />
      <DashboardAccountGrid accounts={accounts} />
    </div>
  )
}
