import { Suspense } from 'react'
import { getDashboardData } from '@/lib/dashboard'
import { DashboardBalanceCard } from '@/components/dashboard/DashboardBalanceCard'
import { DashboardAccountGrid } from '@/components/dashboard/DashboardAccountGrid'
import { PatrimonioChart } from '@/components/dashboard/PatrimonioChart'
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton'

export default function HomePage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  )
}

async function DashboardContent() {
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
