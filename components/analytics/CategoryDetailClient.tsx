'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAnalytics } from '@/contexts/AnalyticsContext'
import { CATEGORY_META } from '@/lib/theme'
import { fmt } from '@/lib/formatting'
import { PERIOD_LABELS } from '@/lib/analytics'
import type { CategoryId, CategoryPeriodData, TransactionWithAccount } from '@/types'
import type { SwipeSide } from '@/hooks/useHorizontalSwipe'
import { TxModal } from '@/components/transactions/TxModal'
import { CategoryPicker } from '@/components/transactions/CategoryPicker'
import { TxDayGroupCard } from '@/components/transactions/TxDayGroupCard'
import { useUnread } from '@/components/transactions/UnreadProvider'
import { groupTxByDate } from '@/lib/transactions'
import GranularityPicker from './GranularityPicker'
import CategoryBarChart from './CategoryBarChart'
import { Skeleton } from '@/components/ui/skeleton'

function CalendarIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

interface Props {
  categoryId: CategoryId
}

export default function CategoryDetailClient({ categoryId }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Período de origen (inicio ISO) al llegar desde Análisis; abrimos el detalle en él.
  const periodParam = searchParams.get('period')
  const { granularity, setShowPicker } = useAnalytics()
  const meta = CATEGORY_META[categoryId]
  const { Icon, label, color } = meta

  const [periods, setPeriods] = useState<CategoryPeriodData[]>([])
  const [selectedBarIdx, setSelectedBarIdx] = useState(5)
  const [transactions, setTransactions] = useState<TransactionWithAccount[]>([])
  const [loadingPeriods, setLoadingPeriods] = useState(true)
  const [loadingTxs, setLoadingTxs] = useState(true)
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null)
  const [catPickerTx, setCatPickerTx] = useState<TransactionWithAccount | null>(null)
  const [swiped, setSwiped] = useState<{ id: string; side: SwipeSide } | null>(null)
  const { increment, decrement } = useUnread()

  const selectedTx = selectedTxId ? transactions.find(t => t.id === selectedTxId) ?? null : null

  // Marca leído/no leído optimista, ajustando el badge (UnreadProvider). Estilo
  // best-effort coherente con handleDelete de este fichero: rollback + log si falla.
  function setRead(tx: TransactionWithAccount, isRead: boolean) {
    if (tx.is_read === isRead) return
    setTransactions(prev => prev.map(t => (t.id === tx.id ? { ...t, is_read: isRead } : t)))
    if (isRead) decrement()
    else increment()
    fetch(`/api/transactions/${tx.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_read: isRead }),
    })
      .then(res => { if (!res.ok) throw new Error('PATCH is_read failed') })
      .catch(err => {
        setTransactions(prev => prev.map(t => (t.id === tx.id ? { ...t, is_read: tx.is_read } : t)))
        if (isRead) increment()
        else decrement()
        console.error('[CategoryDetailClient.setRead]', err)
      })
  }

  // Mark loading during render when inputs change (React 19: setState in effect body is disallowed)
  const periodsKey = `${granularity}|${categoryId}`
  const [lastPeriodsKey, setLastPeriodsKey] = useState(periodsKey)
  if (periodsKey !== lastPeriodsKey) {
    setLastPeriodsKey(periodsKey)
    setLoadingPeriods(true)
  }

  // Fetch 6-period chart data when granularity changes
  useEffect(() => {
    let cancelled = false
    fetch(`/api/analytics/category?id=${categoryId}&granularity=${granularity}`)
      .then(r => r.json())
      .then(d => {
        if (!cancelled) {
          const ps: CategoryPeriodData[] = d.periods ?? []
          // Selecciona el período de origen si está en la ventana; si no (más
          // antiguo que los últimos mostrados) o sin param, el más reciente.
          const fromParam = periodParam ? ps.findIndex(p => p.start === periodParam) : -1
          setPeriods(ps)
          setSelectedBarIdx(fromParam >= 0 ? fromParam : ps.length - 1)
          setLoadingPeriods(false)
        }
      })
    return () => { cancelled = true }
  }, [granularity, categoryId, periodParam])

  const selectedPeriodForKey = periods[selectedBarIdx]
  const txsKey = selectedPeriodForKey
    ? `${categoryId}|${selectedPeriodForKey.start}|${selectedPeriodForKey.end}`
    : null
  const [lastTxsKey, setLastTxsKey] = useState<string | null>(txsKey)
  if (txsKey && txsKey !== lastTxsKey) {
    setLastTxsKey(txsKey)
    setLoadingTxs(true)
  }

  // Fetch transactions when selected bar or periods change
  useEffect(() => {
    if (periods.length === 0) return
    const period = periods[selectedBarIdx]
    if (!period) return
    let cancelled = false
    fetch(
      `/api/transactions?category=${categoryId}&dateFrom=${period.start}&dateTo=${period.end}&limit=500`
    )
      .then(r => r.json())
      .then(d => {
        if (!cancelled) {
          setTransactions(d.data ?? [])
          setLoadingTxs(false)
        }
      })
    return () => { cancelled = true }
  }, [selectedBarIdx, periods, categoryId])

  async function handleDelete(txId: string) {
    setSelectedTxId(null)
    setTransactions(prev => prev.filter(t => t.id !== txId))
    const res = await fetch(`/api/transactions/${txId}`, { method: 'DELETE' })
    if (!res.ok) console.error('[handleDelete]', await res.text())
  }

  async function handleSelect(txId: string, category: CategoryId) {
    setTransactions(prev => prev.map(t =>
      t.id === txId ? { ...t, category_manual: category } : t
    ))
    const res = await fetch(`/api/transactions/${txId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category_manual: category }),
    })
    if (!res.ok) console.error('[handleSelect]', await res.text())
  }

  // Group transactions by date (helper compartido con la lista de Movimientos)
  const groups = groupTxByDate(transactions)

  const selectedPeriod = periods[selectedBarIdx]
  const periodTotal = selectedPeriod?.amount ?? 0

  return (
    <div>
      {/* Sticky header */}
      <div
        className="sticky top-0 z-50 border-b border-border px-4 pb-3"
        style={{
          background: 'color-mix(in srgb, var(--background) 92%, transparent)',
          backdropFilter: 'blur(16px)',
          paddingTop: 'calc(env(safe-area-inset-top) + 52px)',
        }}
      >
        <div className="flex items-center justify-between">
          {/* Left: back + icon + name */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <button
              onClick={() => router.back()}
              style={{
                width: 34, height: 34, borderRadius: 10, border: 'none',
                background: 'var(--secondary)', cursor: 'pointer', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--foreground)',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <div
              className="flex items-center justify-center shrink-0"
              style={{ width: 30, height: 30, borderRadius: 8, background: color + '20' }}
            >
              <Icon size={15} color={color} strokeWidth={2} />
            </div>
            <span
              className="text-base font-bold text-foreground truncate"
            >
              {label}
            </span>
          </div>
          {/* Right: period selector */}
          <button
            onClick={() => setShowPicker(true)}
            className="flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 shrink-0 ml-2"
            style={{
              background: 'color-mix(in srgb, #6366f1 12%, transparent)',
              border: '1px solid color-mix(in srgb, #6366f1 27%, transparent)',
              color: '#6366f1',
            }}
          >
            <CalendarIcon />
            <span className="text-xs font-bold">{PERIOD_LABELS[granularity]}</span>
            <span className="text-[10px] opacity-70">▾</span>
          </button>
        </div>
        {!loadingTxs && selectedPeriod && (
          <p className="mt-1 text-xs text-muted-foreground" style={{ paddingLeft: 44 }}>
            {transactions.length} movimiento{transactions.length !== 1 ? 's' : ''}{' '}
            ·{' '}
            <span style={{ fontWeight: 700, color }}>{fmt(periodTotal, 2)} €</span>
          </p>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-4 px-4 py-4">
        {/* Evolution card */}
        <div className="-mx-4 border-y border-border bg-secondary px-4 py-5">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[15px] font-bold text-foreground">Evolución</span>
            <span className="text-xs text-muted-foreground capitalize">{PERIOD_LABELS[granularity]}</span>
          </div>

          {/* KPI */}
          <div className="mb-4">
            {loadingPeriods ? (
              <Skeleton className="h-9 w-32 rounded-lg" />
            ) : (
              <>
                <span style={{ fontSize: 32, fontWeight: 800, color, letterSpacing: -1 }}>
                  {fmt(periodTotal, 2)} €
                </span>
                {selectedPeriod && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    en {selectedPeriod.label}
                  </span>
                )}
              </>
            )}
          </div>

          {/* Bar chart */}
          {loadingPeriods ? (
            <Skeleton className="h-27.5 rounded-lg" />
          ) : periods.length > 0 ? (
            <CategoryBarChart
              periods={periods}
              selectedIdx={selectedBarIdx}
              onSelect={setSelectedBarIdx}
              color={color}
            />
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">Sin datos</p>
          )}
        </div>

        {/* Transaction list */}
        <span className="text-[15px] font-bold text-foreground">Movimientos</span>

        {loadingTxs ? (
          <div className="-mx-4 flex flex-col gap-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-15.5 rounded-none border-y border-border" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="flex items-center justify-center py-10">
            <p className="text-sm text-muted-foreground">No hay movimientos en este período</p>
          </div>
        ) : (
          <div className="-mx-4 flex flex-col gap-4">
            {groups.map(group => (
              <TxDayGroupCard
                key={group.date}
                group={group}
                swiped={swiped}
                onOpenSwipe={(id, side) => setSwiped({ id, side })}
                onCloseSwipe={() => setSwiped(null)}
                onRecategorize={tx => { setCatPickerTx(tx); setSwiped(null) }}
                onToggleRead={tx => { setSwiped(null); setRead(tx, !tx.is_read) }}
                onTap={tx => { setSelectedTxId(tx.id); setSwiped(null); if (!tx.is_read) setRead(tx, true) }}
              />
            ))}
          </div>
        )}
      </div>

      {selectedTx && (
        <TxModal
          tx={selectedTx}
          open
          onOpenChange={o => { if (!o) setSelectedTxId(null) }}
          onRecategorize={tx => { setCatPickerTx(tx); setSelectedTxId(null) }}
          onDelete={handleDelete}
        />
      )}

      {catPickerTx && (
        <CategoryPicker
          tx={catPickerTx}
          open
          onOpenChange={o => { if (!o) setCatPickerTx(null) }}
          onSelect={handleSelect}
        />
      )}

      <GranularityPicker />
    </div>
  )
}
