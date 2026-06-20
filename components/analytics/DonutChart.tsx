'use client'

import type { LucideIcon } from 'lucide-react'
import type { CategoryId } from '@/types'
import { fmt } from '@/lib/formatting'

export interface DonutItem {
  key: string           // identificador único para selección (categoryId, '__sin_categoria__' o '__resto__')
  categoryId: CategoryId | null
  label: string
  color: string
  Icon: LucideIcon
  amount: number
  pct: number
}

interface DonutChartProps {
  items: DonutItem[]
  selectedIdx: number | null
  accentColor: string
  onSelect: (idx: number | null) => void
}

const SIZE = 260
const CX = 130
const CY = 130
const R = 86
const STROKE_W = 26
const CIRC = 2 * Math.PI * R
const ICON_R = R + STROKE_W / 2 + 18

const degToRad = (d: number) => (d * Math.PI) / 180

export default function DonutChart({ items, selectedIdx, accentColor, onSelect }: DonutChartProps) {
  const total = items.reduce((s, i) => s + i.amount, 0)

  const segments = items.map((item, i) => {
    const startPct = items.slice(0, i).reduce((s, it) => s + it.pct, 0)
    const midDeg = -90 + (startPct + item.pct / 2) * 3.6
    const offset = CIRC - (startPct / 100) * CIRC
    const dash = (item.pct / 100) * CIRC
    const ix = CX + ICON_R * Math.cos(degToRad(midDeg))
    const iy = CY + ICON_R * Math.sin(degToRad(midDeg))
    return { item, i, offset, dash, ix, iy }
  })

  const sel = selectedIdx !== null ? items[selectedIdx] : null
  const centerLabel = sel
    ? (sel.label.length > 10 ? sel.label.slice(0, 10) + '…' : sel.label)
    : 'Total'
  const centerValue = sel
    ? `${fmt(sel.amount)} €`
    : (total >= 10000 ? `${Math.round(total / 1000)}k €` : `${fmt(total)} €`)
  const centerColor = sel ? sel.color : accentColor

  return (
    <div className="relative" style={{ width: SIZE, height: SIZE, margin: '0 auto' }}>
      <svg width={SIZE} height={SIZE} style={{ overflow: 'visible', display: 'block' }}>
        {/* Track */}
        <circle
          cx={CX} cy={CY} r={R}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.06}
          strokeWidth={STROKE_W}
        />

        {/* Arc segments */}
        {segments.map(({ item, i, offset, dash }) => {
          const isSelected = selectedIdx === i
          const isDimmed = selectedIdx !== null && !isSelected
          return (
            <circle
              key={item.key}
              cx={CX} cy={CY} r={R}
              fill="none"
              stroke={item.color}
              strokeWidth={isSelected ? STROKE_W + 4 : STROKE_W}
              strokeDasharray={`${dash} ${CIRC - dash}`}
              strokeDashoffset={offset}
              strokeLinecap="butt"
              transform={`rotate(-90 ${CX} ${CY})`}
              opacity={isDimmed ? 0.2 : 1}
              style={{ cursor: 'pointer', transition: 'opacity 0.25s, stroke-width 0.2s' }}
              onClick={() => onSelect(selectedIdx === i ? null : i)}
            />
          )
        })}

        {/* Center label */}
        <text x={CX} y={CY - 10} textAnchor="middle" fontSize={12} fill="currentColor" fillOpacity={0.45}>
          {centerLabel}
        </text>

        {/* Center value */}
        <text x={CX} y={CY + 14} textAnchor="middle" fontSize={22} fontWeight={800} fill={centerColor} style={{ fontVariantNumeric: 'tabular-nums slashed-zero' }}>
          {centerValue}
        </text>
      </svg>

      {/* Icon overlays — positioned as HTML over the SVG to use LucideIcon components */}
      {segments.map(({ item, i, ix, iy }) => {
        const isSelected = selectedIdx === i
        const isDimmed = selectedIdx !== null && !isSelected
        const { Icon } = item
        return (
          <div
            key={item.key}
            onClick={() => onSelect(selectedIdx === i ? null : i)}
            style={{
              position: 'absolute',
              left: ix - 13,
              top: iy - 13,
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: isSelected ? item.color : `${item.color}33`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              opacity: isDimmed ? 0.15 : 1,
              transition: 'opacity 0.25s, background 0.2s',
            }}
          >
            <Icon size={14} color={isSelected ? 'white' : item.color} />
          </div>
        )
      })}
    </div>
  )
}
