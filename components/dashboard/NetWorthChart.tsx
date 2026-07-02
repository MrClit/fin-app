'use client'
import { AreaChart, Area, XAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { fmt } from '@/lib/formatting'
import { Amount } from '@/components/ui/amount'

interface Props {
  data: { label: string; value: number }[]
  annualDelta: number | null
}

export function NetWorthChart({ data, annualDelta }: Props) {
  return (
    <div className="bg-secondary -mx-4 px-4 py-5 border-y border-border">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[15px] font-bold">Patrimonio neto</span>
        {annualDelta !== null ? (
          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
            annualDelta >= 0
              ? 'text-positive bg-positive-subtle'
              : 'text-negative bg-negative-subtle'
          }`}>
            {annualDelta >= 0 ? '↑' : '↓'} {annualDelta >= 0 ? '+' : ''}
            <Amount value={annualDelta} /> vs hace 12 meses
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground px-2.5 py-0.5">
            — vs hace 12 meses
          </span>
        )}
      </div>
      <p className="text-[12px] text-muted-foreground mb-3.5">
        Últimos {data.length} {data.length === 1 ? 'mes' : 'meses'}
      </p>
      <ResponsiveContainer width="100%" height={80}>
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
          <defs>
            <linearGradient id="netWorthGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#6366f1"
            strokeWidth={2.5}
            fill="url(#netWorthGrad)"
            dot={false}
            activeDot={{ r: 4, fill: '#6366f1' }}
          />
          <Tooltip
            formatter={(v) => [typeof v === 'number' ? `${fmt(v)} €` : '—', 'Patrimonio']}
            contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)', fontVariantNumeric: 'tabular-nums' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
