import { TrendingUp, TrendingDown } from 'lucide-react'
import { fmt } from '@/lib/formatting'
import { Sparkline } from './Sparkline'

interface DashboardBalanceCardProps {
  balance: number
  weeklyDelta: number
  dailyBalances: number[]
}

export function DashboardBalanceCard({ balance, weeklyDelta, dailyBalances }: DashboardBalanceCardProps) {
  const isPositive = weeklyDelta >= 0
  const DeltaIcon = isPositive ? TrendingUp : TrendingDown
  const deltaColor = isPositive ? '#4ade80' : '#fca5a5'

  return (
    <div
      className="rounded-3xl px-5 pt-5 overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
    >
      <div className="text-[13px] font-medium text-white/70 mb-1">Balance total</div>
      <div className="text-[36px] font-extrabold text-white tracking-tight leading-none mb-3">
        {fmt(balance, 2)} €
      </div>
      <div className="flex items-center gap-1.5 mb-4">
        <DeltaIcon className="size-3.5" style={{ color: deltaColor }} />
        <span className="text-[13px] font-semibold" style={{ color: deltaColor }}>
          {isPositive ? '+' : ''}{fmt(weeklyDelta, 2)} € esta semana
        </span>
      </div>
      <Sparkline data={dailyBalances} />
      <div className="text-[10px] mt-1 pb-4" style={{ color: 'rgba(255,255,255,0.55)' }}>
        Últimos 30 días
      </div>
    </div>
  )
}
