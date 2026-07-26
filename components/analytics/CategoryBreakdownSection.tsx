'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import type { CategoryBreakdown, Granularity } from '@/types'
import { Amount } from '@/components/ui/amount'
import { cn } from '@/lib/utils'
import DonutChart from './DonutChart'
import { buildDonutModel, REST_KEY } from './donutModel'

/** Evita que una categoría marginal del bucket se muestre como "0%" (#345). */
const fmtPct = (pct: number) => (pct > 0 && pct < 1 ? '<1%' : `${Math.round(pct)}%`)

interface CategoryBreakdownSectionProps {
  byCategory: CategoryBreakdown[]
  /** Total neto de ingresos del período (= KPI). Fuente única del total del donut (#272). */
  income: number
  /** Total neto de gastos del período (= KPI). */
  expense: number
  /** Inicio (ISO) del período activo en Análisis; se propaga al detalle para abrirlo en el mismo período. */
  periodStart: string
  /** Granularidad activa; se propaga al detalle (?g=) para que sobreviva a un F5 estando en él. */
  granularity: Granularity
}

/**
 * Ir al detalle de una categoría es navegación, así que la fila es un `<Link>` y no un
 * `<div onClick>` con `router.push` (#369): así es alcanzable con Tab, se abre con Enter
 * y admite clic central / «abrir en pestaña nueva». El hover solo se ensancha en
 * horizontal (`-mx-2 px-2`): cualquier padding vertical cambiaría la altura de la lista
 * en móvil, que es invariante de la serie.
 */
const ROW_INTERACTIVE = 'block -mx-2 rounded-lg px-2 transition-colors hover:bg-foreground/5'

export default function CategoryBreakdownSection({ byCategory, income, expense, periodStart, granularity }: CategoryBreakdownSectionProps) {
  const [catView, setCatView] = useState<'gastos' | 'ingresos'>('gastos')
  // Tracked by slice key instead of index — auto-deselects when byCategory changes and the
  // slice is no longer present, without needing a useEffect setState.
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  // El bucket "Resto" se despliega en la lista para llegar a sus categorías (#345).
  const [restExpanded, setRestExpanded] = useState(false)

  const typeFilter = catView === 'gastos' ? 'expense' : 'income'
  const accentColor = catView === 'gastos' ? '#6366f1' : '#22c55e'
  const netTotal = catView === 'gastos' ? expense : income

  const { slices: items, restRows, credits, netTotal: centerTotal } = buildDonutModel(byCategory, typeFilter, netTotal)

  // Derive index from tracked key — null if category not present in current items
  const selectedCatIdx = selectedKey === null ? null : items.findIndex(i => i.key === selectedKey)
  const effectiveIdx = selectedCatIdx !== null && selectedCatIdx >= 0 ? selectedCatIdx : null

  const handleSelect = (idx: number | null) => {
    const key = idx === null ? null : items[idx]?.key ?? null
    setSelectedKey(key)
    // Seleccionar el arco "Resto" abre su detalle; deseleccionarlo lo cierra.
    if (key === REST_KEY) setRestExpanded(true)
    else if (key === null) setRestExpanded(false)
  }

  const isEmpty = items.length === 0 && credits.length === 0

  return (
    <div className="-mx-4 border-y border-border bg-secondary px-4 py-5 md:mx-0 md:rounded-2xl md:border">
      {/* Header + toggle */}
      <div className="mb-4 flex items-center justify-between">
        <span className="text-md font-bold text-foreground">Desglose por categoría</span>
        <div style={{ display: 'flex', background: 'var(--muted)', borderRadius: 20, padding: 3 }}>
          {(['gastos', 'ingresos'] as const).map(v => (
            <button
              key={v}
              onClick={() => { setCatView(v); setSelectedKey(null); setRestExpanded(false) }}
              style={{
                padding: '4px 12px',
                borderRadius: 20,
                border: 'none',
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
              const isRest = item.key === REST_KEY
              const { Icon } = item
              const rowBody = (
                <>
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
                        {isRest ? `${item.label} (${restRows.length})` : item.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--muted-foreground)' }}>
                        {fmtPct(item.pct)}
                      </span>
                      <span style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--foreground)' }}>
                        <Amount value={item.amount} />
                      </span>
                      {isRest ? (
                        <ChevronDown
                          size={16}
                          color={accentColor}
                          style={{
                            transform: restExpanded ? 'rotate(180deg)' : 'none',
                            transition: 'transform 0.2s',
                          }}
                        />
                      ) : (
                        <span style={{ fontSize: 'var(--text-sm)', color: accentColor }}>›</span>
                      )}
                    </div>
                  </div>
                  <div style={{
                    height: 7, borderRadius: 3.5,
                    background: 'color-mix(in srgb, currentColor 6%, transparent)',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${Math.round(item.pct * 100) / 100}%`, height: '100%',
                      minWidth: 3, // que el color siga siendo legible con porcentajes marginales
                      background: item.color, borderRadius: 3,
                      transition: 'width 0.6s ease',
                    }} />
                  </div>
                </>
              )
              return (
                <div
                  key={item.key}
                  style={{ opacity: isDimmed ? 0.35 : 1, transition: 'opacity 0.25s' }}
                >
                  {/* «Resto» no navega: despliega sus categorías en el sitio, así que es un
                      botón con `aria-expanded`. El resto de filas navegan → `<Link>`. */}
                  {isRest || item.categoryId === null ? (
                    <button
                      type="button"
                      aria-expanded={restExpanded}
                      className={cn(ROW_INTERACTIVE, 'w-full text-left')}
                      onClick={() => {
                        // La fila "Resto" y su arco son lo mismo: se abren y se resaltan juntos.
                        setRestExpanded(!restExpanded)
                        setSelectedKey(restExpanded ? null : REST_KEY)
                      }}
                    >
                      {rowBody}
                    </button>
                  ) : (
                    <Link
                      href={`/analytics/category/${item.categoryId}?period=${periodStart}&g=${granularity}`}
                      className={ROW_INTERACTIVE}
                    >
                      {rowBody}
                    </Link>
                  )}

                  {/* Categorías dentro de "Resto": compactas y sin barra, para que desplegarlas
                      no reproduzca el problema de longitud que motivó agruparlas (#345). */}
                  {isRest && restExpanded && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14, paddingLeft: 14 }}>
                      {restRows.map(sub => {
                        const SubIcon = sub.Icon
                        return (
                          <Link
                            key={sub.key}
                            href={`/analytics/category/${sub.categoryId}?period=${periodStart}&g=${granularity}`}
                            className={cn(ROW_INTERACTIVE, 'flex items-center justify-between')}
                          >
                            <div className="flex items-center gap-2.5">
                              <div style={{
                                width: 24, height: 24, borderRadius: 7, flexShrink: 0,
                                background: `${sub.color}22`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>
                                <SubIcon size={13} color={sub.color} />
                              </div>
                              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--foreground)', fontWeight: 500 }}>
                                {sub.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--muted-foreground)' }}>
                                {fmtPct(sub.pct)}
                              </span>
                              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--foreground)' }}>
                                <Amount value={sub.amount} />
                              </span>
                              <span style={{ fontSize: 'var(--text-sm)', color: accentColor }}>›</span>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Credit rows — categorías con neto de signo contrario (reembolsos): reducen el total,
                no son gasto/ingreso, así que se muestran como crédito sin barra ni porción (#272). */}
            {credits.map(credit => {
              const isDimmed = effectiveIdx !== null
              const { Icon } = credit
              return (
                <Link
                  key={credit.categoryId}
                  href={`/analytics/category/${credit.categoryId}?period=${periodStart}&g=${granularity}`}
                  className={ROW_INTERACTIVE}
                  style={{ opacity: isDimmed ? 0.35 : 1, transition: 'opacity 0.25s' }}
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
                </Link>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
