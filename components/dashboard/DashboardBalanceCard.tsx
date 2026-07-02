import { Amount } from '@/components/ui/amount'
import { Sparkline } from './Sparkline'

interface DashboardBalanceCardProps {
  balance: number
  weeklyDelta: number
  dailyBalances: number[]
}

export function DashboardBalanceCard({ balance, weeklyDelta, dailyBalances }: DashboardBalanceCardProps) {
  const isPositive = weeklyDelta >= 0
  const deltaSign = isPositive ? '+' : ''
  // Pill colors matching prototype: green tint for positive, red tint for negative
  const pillColor    = isPositive ? 'var(--positive)' : 'var(--negative)'
  const pillBg       = isPositive ? 'var(--positive-subtle)' : 'var(--negative-subtle)'
  const deltaArrow   = isPositive ? '↑' : '↓'

  return (
    <div
      className="-mx-4 overflow-clip relative"
      style={{
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)',
      }}
    >
      {/* Decorative bubbles */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{ top: -20, right: -20, width: 120, height: 120, background: 'rgba(255,255,255,0.08)' }}
      />
      <div
        className="absolute rounded-full pointer-events-none"
        style={{ bottom: -30, left: 40, width: 80, height: 80, background: 'rgba(255,255,255,0.05)' }}
      />

      {/* Content */}
      <div className="relative z-10 px-4 pt-6">
        <div className="text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
          Balance total
        </div>
        <div className="text-amount-md font-extrabold text-white tracking-tight leading-none mb-1">
          <Amount value={balance} decimals={2} />
        </div>

        {/* Weekly delta pill */}
        <div className="flex items-center gap-2 mb-3.5">
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ color: pillColor, background: pillBg }}
          >
            {deltaArrow} {deltaSign}<Amount value={weeklyDelta} decimals={2} />
          </span>
          <span className="text-2xs" style={{ color: 'rgba(255,255,255,0.7)' }}>esta semana</span>
        </div>

        <Sparkline data={dailyBalances} />
        <div className="text-3xs mt-1 pb-5" style={{ color: 'rgba(255,255,255,0.55)' }}>
          Últimos 30 días
        </div>
      </div>
    </div>
  )
}
