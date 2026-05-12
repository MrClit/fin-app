'use client'

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts'
import type { CategoryPeriodData } from '@/types'

interface BarShapeProps {
  x?: number
  y?: number
  width?: number
  height?: number
  background?: { height?: number; y?: number }
  isSelected?: boolean
  barColor: string
  gradId: string
  onBarClick?: () => void
}

function BarShape({
  x = 0, y = 0, width = 0, height = 0,
  background,
  isSelected = false,
  barColor, gradId, onBarClick,
}: BarShapeProps) {
  if (!width || width <= 0) return null

  const hitY = background?.y ?? y
  const hitH = (background?.height ?? 0) || height
  const topColor = barColor + 'cc'

  return (
    <g
      onClick={onBarClick}
      tabIndex={-1}
      style={{ cursor: 'pointer', outline: 'none', opacity: isSelected ? 1 : 0.4, transition: 'opacity 0.2s' }}
    >
      <rect x={x} y={hitY} width={width} height={hitH} fill="transparent" />
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={topColor} />
          <stop offset="100%" stopColor={barColor} />
        </linearGradient>
      </defs>
      {height > 0 && (
        <rect
          x={x} y={y} width={width} height={height} rx={4} ry={4}
          fill={isSelected ? `url(#${gradId})` : barColor}
          style={{ filter: isSelected ? `drop-shadow(0 4px 14px ${barColor}66)` : 'none' }}
        />
      )}
    </g>
  )
}

interface TickProps {
  x?: number
  y?: number
  payload?: { value: string; index: number }
  clampedSel: number
  onTickClick?: () => void
}

function CustomTick({ x = 0, y = 0, payload, clampedSel, onTickClick }: TickProps) {
  if (!payload) return null
  const isSel = payload.index === clampedSel
  return (
    <g onClick={onTickClick} tabIndex={-1} style={{ cursor: 'pointer', outline: 'none' }}>
      <rect x={x - 16} y={y} width={32} height={20} fill="transparent" />
      <text
        x={x} y={y + 10} textAnchor="middle" dominantBaseline="middle"
        fontSize={isSel ? 10 : 9} fontWeight={isSel ? 700 : 400}
        fill={isSel ? 'var(--foreground)' : 'var(--muted-foreground)'}
        opacity={isSel ? 0.9 : 0.35}
        style={{ userSelect: 'none', pointerEvents: 'none' }}
      >
        {payload.value}
      </text>
    </g>
  )
}

interface CategoryBarChartProps {
  periods: CategoryPeriodData[]
  selectedIdx: number
  onSelect: (idx: number) => void
  color: string
}

export default function CategoryBarChart({ periods, selectedIdx, onSelect, color }: CategoryBarChartProps) {
  const maxVal = Math.max(...periods.map(p => p.amount), 1)

  const chartData = periods.map((p, i) => ({
    label: p.label,
    amount: p.amount,
    isSelected: i === selectedIdx,
  }))

  return (
    <ResponsiveContainer width="100%" height={110}>
      <BarChart
        data={chartData}
        barCategoryGap="18%"
        margin={{ top: 4, right: 4, bottom: 0, left: 4 }}
        tabIndex={-1}
        style={{ outline: 'none' }}
      >
        <YAxis domain={[0, maxVal]} hide />
        <Bar
          dataKey="amount"
          shape={(props: object) => {
            const p = props as BarShapeProps & { index?: number; isSelected?: boolean }
            return (
              <BarShape
                {...p}
                barColor={color}
                gradId="grad-cat-sel"
                onBarClick={() => typeof p.index === 'number' && onSelect(p.index)}
              />
            )
          }}
          isAnimationActive={false}
        />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={(props: object) => {
            const p = props as TickProps
            const localIdx = p.payload?.index
            return (
              <CustomTick
                {...p}
                clampedSel={selectedIdx}
                onTickClick={() => typeof localIdx === 'number' && onSelect(localIdx)}
              />
            )
          }}
          height={22}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
