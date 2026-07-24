import { Suspense } from 'react'
import { getDashboardData } from '@/lib/dashboard'
import { DashboardBalanceCard } from '@/components/dashboard/DashboardBalanceCard'
import { DashboardAccountGrid } from '@/components/dashboard/DashboardAccountGrid'
import { NetWorthChart } from '@/components/dashboard/NetWorthChart'
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton'

export default function HomePage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  )
}

async function DashboardContent() {
  const { balance, weeklyDelta, dailyBalances, accounts, netWorthData, annualDelta } = await getDashboardData()

  // `data-content="wide"` marca la pantalla como de rejilla: el app-shell ensancha su
  // columna a 960px desde `lg` (#366). En `lg` saldo y patrimonio pasan a ir lado a
  // lado —como items de grid igualan altura solos— con las cuentas debajo a lo ancho.
  return (
    <div data-content="wide" className="flex flex-col gap-4 px-4 pt-3 pb-6">
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2">
        <DashboardBalanceCard
          balance={balance}
          weeklyDelta={weeklyDelta}
          dailyBalances={dailyBalances}
        />
        <NetWorthChart data={netWorthData} annualDelta={annualDelta} />
      </div>
      <DashboardAccountGrid accounts={accounts} />
    </div>
  )
}
