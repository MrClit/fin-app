'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MoreHorizontal } from 'lucide-react'
import type { CategoryBreakdown } from '@/types'
import { CATEGORY_META } from '@/lib/theme'
import { fmt } from '@/lib/formatting'
import DonutChart, { type DonutItem } from './DonutChart'

const MIN_PCT = 5
const RESTO_KEY = '__resto__'
const RESTO_COLOR = '#94a3b8'

interface CategoryBreakdownSectionProps {
  byCategory: CategoryBreakdown[]
}

export default function CategoryBreakdownSection({ byCategory }: CategoryBreakdownSectionProps) {
  const router = useRouter()
  const [catView, setCatView] = useState<'gastos' | 'ingresos'>('gastos')
  // Tracked by key instead of index — auto-deselects when byCategory changes and the
  // category is no longer present, without needing a useEffect setState.
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  const typeFilter = catView === 'gastos' ? 'expense' : 'income'
  const accentColor = catView === 'gastos' ? '#6366f1' : '#22c55e'

  const rawItems = byCategory
    .filter(bc => {
      if (bc.amount === 0) return false
      if (bc.category === null) return false
      return CATEGORY_META[bc.category]?.type === typeFilter
    })
    .map(bc => ({ ...bc, amount: Math.abs(bc.amount) }))
    .sort((a, b) => b.amount - a.amount)

  const total = rawItems.reduce((s, i) => s + i.amount, 0)

  const withPct = rawItems.map(bc => ({
    ...bc,
    pct: total > 0 ? (bc.amount / total) * 100 : 0,
  }))

  const main = withPct.filter(bc => bc.pct >= MIN_PCT)
  const rest = withPct.filter(bc => bc.pct < MIN_PCT)

  const toItem = (bc: (typeof withPct)[0]): DonutItem => {
    // bc.category never null here (filtered out above)
    const catId = bc.category as NonNullable<typeof bc.category>
    const meta = CATEGORY_META[catId]
    return {
      key: catId,
      categoryId: catId,
      label: meta.label,
      color: meta.color,
      Icon: meta.Icon,
      amount: bc.amount,
      pct: bc.pct,
    }
  }

  const items: DonutItem[] = [
    ...main.map(toItem),
    ...(rest.length > 0 ? [{
      key: RESTO_KEY,
      categoryId: null,
      label: 'Resto',
      color: RESTO_COLOR,
      Icon: MoreHorizontal,
      amount: rest.reduce((s, i) => s + i.amount, 0),
      pct: rest.reduce((s, i) => s + i.pct, 0),
    } satisfies DonutItem] : []),
  ]

  // Derive index from tracked key — null if category not present in current items
  const selectedCatIdx = selectedKey === null ? null : items.findIndex(i => i.key === selectedKey)
  const effectiveIdx = selectedCatIdx !== null && selectedCatIdx >= 0 ? selectedCatIdx : null

  const handleSelect = (idx: number | null) => {
    setSelectedKey(idx === null ? null : items[idx].key)
  }

  return (
    <div style={{ background: 'var(--secondary)', borderRadius: 20, padding: 20 }}>
      {/* Header + toggle */}
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[15px] font-bold text-foreground">Desglose por categoría</span>
        <div style={{ display: 'flex', background: 'var(--muted)', borderRadius: 20, padding: 3 }}>
          {(['gastos', 'ingresos'] as const).map(v => (
            <button
              key={v}
              onClick={() => { setCatView(v); setSelectedKey(null) }}
              style={{
                padding: '4px 12px',
                borderRadius: 20,
                border: 'none',
                cursor: 'pointer',
                background: catView === v
                  ? (v === 'gastos' ? '#6366f1' : '#22c55e')
                  : 'transparent',
                color: catView === v ? 'white' : 'var(--muted-foreground)',
                fontSize: 11,
                fontWeight: 700,
                transition: 'all 0.2s',
                textTransform: 'capitalize',
              }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Sin datos para este período</p>
      ) : (
        <>
          {/* Donut */}
          <div className="mb-5 flex justify-center">
            <DonutChart
              items={items}
              selectedIdx={effectiveIdx}
              accentColor={accentColor}
              onSelect={handleSelect}
            />
          </div>

          {/* Category rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {items.map((item, i) => {
              const isSelected = effectiveIdx === i
              const isDimmed = effectiveIdx !== null && !isSelected
              const isNavigable = item.categoryId !== null && item.key !== RESTO_KEY
              const { Icon } = item
              return (
                <div
                  key={item.key}
                  onClick={() => {
                    if (isNavigable) {
                      router.push(`/analisis/categoria/${item.categoryId}`)
                    } else {
                      handleSelect(effectiveIdx === i ? null : i)
                    }
                  }}
                  style={{ cursor: 'pointer', opacity: isDimmed ? 0.35 : 1, transition: 'opacity 0.25s' }}
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div style={{
                        width: 24, height: 24, borderRadius: 7, flexShrink: 0,
                        background: isSelected ? item.color : `${item.color}22`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background 0.2s',
                      }}>
                        <Icon size={13} color={isSelected ? 'white' : item.color} />
                      </div>
                      <span style={{ fontSize: 13, color: 'var(--foreground)', fontWeight: isSelected ? 700 : 500 }}>
                        {item.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
                        {Math.round(item.pct)}%
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>
                        {fmt(item.amount)} €
                      </span>
                      {isNavigable && <span style={{ fontSize: 11, color: accentColor }}>›</span>}
                    </div>
                  </div>
                  <div style={{
                    height: 6, borderRadius: 3,
                    background: 'color-mix(in srgb, currentColor 6%, transparent)',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${item.pct}%`, height: '100%',
                      background: item.color, borderRadius: 3,
                      transition: 'width 0.6s ease',
                    }} />
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
