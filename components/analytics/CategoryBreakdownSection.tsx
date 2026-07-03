'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { CategoryBreakdown } from '@/types'
import { Amount } from '@/components/ui/amount'
import DonutChart from './DonutChart'
import { buildDonutModel, REST_KEY } from './donutModel'

interface CategoryBreakdownSectionProps {
  byCategory: CategoryBreakdown[]
  /** Total neto de ingresos del período (= KPI). Fuente única del total del donut (#272). */
  income: number
  /** Total neto de gastos del período (= KPI). */
  expense: number
  /** Inicio (ISO) del período activo en Análisis; se propaga al detalle para abrirlo en el mismo período. */
  periodStart: string
}

export default function CategoryBreakdownSection({ byCategory, income, expense, periodStart }: CategoryBreakdownSectionProps) {
  const router = useRouter()
  const [catView, setCatView] = useState<'gastos' | 'ingresos'>('gastos')
  // Tracked by key instead of index — auto-deselects when byCategory changes and the
  // category is no longer present, without needing a useEffect setState.
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  const typeFilter = catView === 'gastos' ? 'expense' : 'income'
  const accentColor = catView === 'gastos' ? '#6366f1' : '#22c55e'
  const netTotal = catView === 'gastos' ? expense : income

  const { slices: items, credits, netTotal: centerTotal } = buildDonutModel(byCategory, typeFilter, netTotal)

  // Derive index from tracked key — null if category not present in current items
  const selectedCatIdx = selectedKey === null ? null : items.findIndex(i => i.key === selectedKey)
  const effectiveIdx = selectedCatIdx !== null && selectedCatIdx >= 0 ? selectedCatIdx : null

  const handleSelect = (idx: number | null) => {
    setSelectedKey(idx === null ? null : items[idx].key)
  }

  const isEmpty = items.length === 0 && credits.length === 0

  return (
    <div className="-mx-4 border-y border-border bg-secondary px-4 py-5">
      {/* Header + toggle */}
      <div className="mb-4 flex items-center justify-between">
        <span className="text-md font-bold text-foreground">Desglose por categoría</span>
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
                fontSize: 'var(--text-2xs)',
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

      {isEmpty ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Sin datos para este período</p>
      ) : (
        <>
          {/* Donut */}
          {items.length > 0 && (
            <div className="mb-5 flex justify-center">
              <DonutChart
                items={items}
                total={centerTotal}
                selectedIdx={effectiveIdx}
                accentColor={accentColor}
                onSelect={handleSelect}
              />
            </div>
          )}

          {/* Category rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {items.map((item, i) => {
              const isSelected = effectiveIdx === i
              const isDimmed = effectiveIdx !== null && !isSelected
              const isNavigable = item.categoryId !== null && item.key !== REST_KEY
              const { Icon } = item
              return (
                <div
                  key={item.key}
                  onClick={() => {
                    if (isNavigable) {
                      router.push(`/analytics/category/${item.categoryId}?period=${periodStart}`)
                    } else {
                      handleSelect(effectiveIdx === i ? null : i)
                    }
                  }}
                  style={{ cursor: 'pointer', opacity: isDimmed ? 0.35 : 1, transition: 'opacity 0.25s' }}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div style={{
                        width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                        background: isSelected ? item.color : `${item.color}22`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background 0.2s',
                      }}>
                        <Icon size={16} color={isSelected ? 'white' : item.color} />
                      </div>
                      <span style={{ fontSize: 'var(--text-md)', color: 'var(--foreground)', fontWeight: isSelected ? 700 : 500 }}>
                        {item.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--muted-foreground)' }}>
                        {Math.round(item.pct)}%
                      </span>
                      <span style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--foreground)' }}>
                        <Amount value={item.amount} />
                      </span>
                      {isNavigable && <span style={{ fontSize: 'var(--text-sm)', color: accentColor }}>›</span>}
                    </div>
                  </div>
                  <div style={{
                    height: 7, borderRadius: 3.5,
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

            {/* Credit rows — categorías con neto de signo contrario (reembolsos): reducen el total,
                no son gasto/ingreso, así que se muestran como crédito sin barra ni porción (#272). */}
            {credits.map(credit => {
              const isDimmed = effectiveIdx !== null
              const { Icon } = credit
              return (
                <div
                  key={credit.categoryId}
                  onClick={() => router.push(`/analytics/category/${credit.categoryId}?period=${periodStart}`)}
                  style={{ cursor: 'pointer', opacity: isDimmed ? 0.35 : 1, transition: 'opacity 0.25s' }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div style={{
                        width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                        background: 'var(--positive-subtle)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icon size={16} className="text-positive" />
                      </div>
                      <div className="flex flex-col">
                        <span style={{ fontSize: 'var(--text-md)', color: 'var(--foreground)', fontWeight: 500 }}>
                          {credit.label}
                        </span>
                        <span className="text-positive" style={{ fontSize: 'var(--text-2xs)', fontWeight: 600 }}>
                          Reembolso
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 'var(--text-md)', fontWeight: 700 }}>
                        <Amount value={credit.amount} signed className="text-positive" />
                      </span>
                      <span style={{ fontSize: 'var(--text-sm)', color: accentColor }}>›</span>
                    </div>
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
