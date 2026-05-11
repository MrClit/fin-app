'use client'

import { useState } from 'react'
import {
  ComposedChart, Bar, XAxis, YAxis, ResponsiveContainer,
} from 'recharts'
import type { PeriodData } from '@/types'

// ─── Custom bar shapes ────────────────────────────────────────────────────────

interface BarShapeProps {
  x?: number
  y?: number
  width?: number
  height?: number
  background?: { height?: number; y?: number }
  // injected via chartData entry
  isSelected?: boolean
  yoyRatio?: number | null
  // passed as extra props on <Bar>
  barColor: string
  topColor: string
  glow: string
  gradId: string
  showYoY: boolean
  onBarClick?: () => void
}

function BarShape({
  x = 0, y = 0, width = 0, height = 0,
  background,
  isSelected = false, yoyRatio = null,
  barColor, topColor, glow, gradId, showYoY, onBarClick,
}: BarShapeProps) {
  if (!width || width <= 0) return null

  const lineY = yoyRatio != null && height > 0
    ? Math.max(y, y + height * (1 - Math.min(yoyRatio, 2)))
    : null

  // Full-column hit area (including empty space above short bars)
  const hitY = background?.y ?? y
  const hitH = (background?.height ?? 0) || height

  return (
    <g
      onClick={onBarClick}
      tabIndex={-1}
      style={{ cursor: 'pointer', outline: 'none', opacity: isSelected ? 1 : 0.45, transition: 'opacity 0.2s' }}
    >
      {/* Transparent hit area covering the full column height */}
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
          style={{ filter: isSelected ? `drop-shadow(0 4px 14px ${glow})` : 'none' }}
        />
      )}
      {showYoY && lineY != null && (
        <g>
          <line
            x1={x - 3} y1={lineY} x2={x + width + 3} y2={lineY}
            stroke={barColor} strokeWidth={2} strokeLinecap="round"
          />
          <rect x={x - 3} y={lineY - 3} width={2} height={8} rx={1} fill={barColor} opacity={0.8} />
          <rect x={x + width + 1} y={lineY - 3} width={2} height={8} rx={1} fill={barColor} opacity={0.8} />
        </g>
      )}
    </g>
  )
}

// ─── Custom X-axis tick ───────────────────────────────────────────────────────

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
    <g
      onClick={onTickClick}
      tabIndex={-1}
      style={{ cursor: 'pointer', outline: 'none' }}
    >
      {/* Transparent hit area */}
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

// ─── YoY legend icon ──────────────────────────────────────────────────────────

function YoYIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="10" viewBox="0 0 18 10">
      <line x1="0" y1="5" x2="18" y2="5" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="0" y1="2" x2="0"  y2="8" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="18" y1="2" x2="18" y2="8" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

const WINDOW = 6

interface DualBarChartProps {
  allData: PeriodData[]
  selectedBarIdx: number | null
  onSelect: (idx: number) => void
  showYoY: boolean
}

export default function DualBarChart({
  allData, selectedBarIdx, onSelect, showYoY,
}: DualBarChartProps) {
  const [offset, setOffset] = useState(0)

  const total    = allData.length
  const endIdx   = total - offset
  const startIdx = Math.max(0, endIdx - WINDOW)
  const visible  = allData.slice(startIdx, endIdx)

  const localSel   = selectedBarIdx !== null ? selectedBarIdx - startIdx : visible.length - 1
  const clampedSel = Math.max(0, Math.min(visible.length - 1, localSel))

  const maxVal = Math.max(...allData.map(d => Math.max(d.ingresos, d.gastos)), 1)

  const canGoBack = startIdx > 0
  const canGoFwd  = offset > 0

  const shift = (dir: 'back' | 'fwd') => {
    const newOffset = dir === 'back'
      ? Math.min(total - WINDOW, offset + 1)
      : Math.max(0, offset - 1)
    setOffset(newOffset)
    const newEndIdx   = total - newOffset
    const newStartIdx = Math.max(0, newEndIdx - WINDOW)
    onSelect(newStartIdx + Math.min(clampedSel, Math.min(WINDOW, newEndIdx - newStartIdx) - 1))
  }

  const chartData = visible.map((d, i) => ({
    ...d,
    isSelected: i === clampedSel,
    yoyIngRatio: (d.yoyIngresos != null && d.ingresos > 0) ? d.yoyIngresos / d.ingresos : null,
    yoyGasRatio: (d.yoyGastos   != null && d.gastos   > 0) ? d.yoyGastos   / d.gastos   : null,
  }))

  return (
    <div>
      {/* Legends */}
      <div className="mb-3.5 flex items-center justify-between">
        {/* Bar legend */}
        <div className="flex gap-3.5">
          {([['#22c55e', 'Ingresos'], ['#6366f1', 'Gastos']] as const).map(([color, lbl]) => (
            <div key={lbl} className="flex items-center gap-1.5">
              <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
              <span className="text-[11px] text-muted-foreground">{lbl}</span>
            </div>
          ))}
        </div>
        {/* YoY legend */}
        {showYoY && (
          <div className="flex gap-3.5">
            {([['#22c55e', 'Ingresos'] , ['#6366f1', 'Gastos']] as const).map(([color, lbl]) => (
              <div key={lbl} className="flex items-center gap-1.5">
                <YoYIcon color={color} />
                <span className="text-[10px] text-muted-foreground">{lbl} ant.</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={118}>
        <ComposedChart
          data={chartData}
          barGap={4}
          barCategoryGap="10%"
          margin={{ top: 4, right: 4, bottom: 0, left: 4 }}
          tabIndex={-1}
          style={{ outline: 'none' }}
        >
          <YAxis domain={[0, maxVal]} hide />
          <Bar
            dataKey="ingresos"
            shape={(props: object) => {
              const p = props as BarShapeProps & { index?: number }
              return (
                <BarShape
                  {...p}
                  barColor="#22c55e" topColor="#4ade80" glow="#22c55e44"
                  gradId="grad-ing-sel" showYoY={showYoY}
                  yoyRatio={(p as { yoyIngRatio?: number | null }).yoyIngRatio ?? null}
                  onBarClick={() => typeof p.index === 'number' && onSelect(startIdx + p.index)}
                />
              )
            }}
            isAnimationActive={false}
          />
          <Bar
            dataKey="gastos"
            shape={(props: object) => {
              const p = props as BarShapeProps & { index?: number }
              return (
                <BarShape
                  {...p}
                  barColor="#6366f1" topColor="#818cf8" glow="#6366f144"
                  gradId="grad-gas-sel" showYoY={showYoY}
                  yoyRatio={(p as { yoyGasRatio?: number | null }).yoyGasRatio ?? null}
                  onBarClick={() => typeof p.index === 'number' && onSelect(startIdx + p.index)}
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
                  clampedSel={clampedSel}
                  onTickClick={() => typeof localIdx === 'number' && onSelect(startIdx + localIdx)}
                />
              )
            }}
            height={22}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Navigation */}
      <div className="mt-2.5 flex items-center justify-between">
        <button
          onClick={() => canGoBack && shift('back')}
          className="text-[13px] font-semibold transition-colors"
          style={{
            background: 'none', border: 'none', padding: 0, cursor: canGoBack ? 'pointer' : 'default',
            color: canGoBack ? 'var(--muted-foreground)' : 'transparent',
          }}
        >
          ‹ Anteriores
        </button>
        <button
          onClick={() => canGoFwd && shift('fwd')}
          className="text-[13px] font-semibold transition-colors"
          style={{
            background: 'none', border: 'none', padding: 0, cursor: canGoFwd ? 'pointer' : 'default',
            color: canGoFwd ? 'var(--muted-foreground)' : 'transparent',
          }}
        >
          Siguientes ›
        </button>
      </div>
    </div>
  )
}
