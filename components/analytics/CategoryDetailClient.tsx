'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAnalytics } from './AnalyticsContext'
import { getCategoryMeta } from '@/lib/categories'
import { Amount } from '@/components/ui/amount'
import { PERIOD_LABELS } from '@/lib/analytics'
import type { CategoryId, TransactionWithAccount } from '@/types'
import type { SwipeSide } from '@/hooks/useHorizontalSwipe'
import { TxModal } from '@/components/transactions/TxModal'
import { CategoryPicker } from '@/components/transactions/CategoryPicker'
import { TxDayGroupCard } from '@/components/transactions/TxDayGroupCard'
import { groupTxByDate } from '@/lib/transactions'
import GranularityPicker from './GranularityPicker'
import CategoryBarChart from './CategoryBarChart'
import CategoryDetailHeader from './CategoryDetailHeader'
import { useCategoryDetailData } from './useCategoryDetailData'
import { Skeleton } from '@/components/ui/skeleton'

interface Props {
  categoryId: CategoryId
}

// Debe coincidir con la duración de .animate-slide-out-right (globals.css).
const SLIDE_OUT_MS = 250

// Fetch caído (#387): mensaje explícito con reintento, en vez de un skeleton
// indefinido o un «sin datos» que haría pensar que el período está vacío.
function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <p className="text-center text-sm text-muted-foreground">{message}</p>
      <button
        onClick={onRetry}
        className="cursor-pointer rounded-full border border-border bg-muted px-3 py-1.5 text-xs font-bold text-foreground transition-colors hover:bg-muted-foreground/15"
      >
        Reintentar
      </button>
    </div>
  )
}

export default function CategoryDetailClient({ categoryId }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Período de origen (inicio ISO) al llegar desde Análisis; abrimos el detalle en él.
  const periodParam = searchParams.get('period')
  const { granularity } = useAnalytics()
  const [showPicker, setShowPicker] = useState(false)
  const meta = getCategoryMeta(categoryId)
  const { color } = meta

  const {
    periods,
    selectedBarIdx,
    setSelectedBarIdx,
    loadingPeriods,
    loadingTxs,
    periodsError,
    txsError,
    reload,
    transactions,
    deleteTx,
    recategorize,
    markRead,
    markUnread,
  } = useCategoryDetailData(categoryId, granularity, periodParam)

  const [selectedTxId, setSelectedTxId] = useState<string | null>(null)
  const [catPickerTx, setCatPickerTx] = useState<TransactionWithAccount | null>(null)
  const [swiped, setSwiped] = useState<{ id: string; side: SwipeSide } | null>(null)
  const [isLeaving, setIsLeaving] = useState(false)

  // Pop del detalle (#315): el slide de salida tiene que correr ANTES de
  // navegar (Next desmonta la página al hacerlo). Con «reducir movimiento»
  // activo se navega directo — la clase de salida está anulada en CSS y
  // esperar dejaría la pantalla congelada 250 ms.
  function handleBack() {
    if (isLeaving) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      router.back()
      return
    }
    setIsLeaving(true)
    setTimeout(() => router.back(), SLIDE_OUT_MS)
  }

  const selectedTx = selectedTxId ? transactions.find(t => t.id === selectedTxId) ?? null : null

  function handleDelete(txId: string) {
    setSelectedTxId(null)
    void deleteTx(txId)
  }

  // Group transactions by date (helper compartido con la lista de Movimientos)
  const groups = groupTxByDate(transactions)

  const selectedPeriod = periods[selectedBarIdx]
  const periodTotal = selectedPeriod?.amount ?? 0

  return (
    <div className={isLeaving ? 'animate-slide-out-right' : undefined}>
      <CategoryDetailHeader
        meta={meta}
        granularity={granularity}
        onBack={handleBack}
        onOpenPicker={() => setShowPicker(true)}
        showSummary={!loadingTxs && !!selectedPeriod}
        txCount={transactions.length}
        periodTotal={periodTotal}
      />

      {/* Content */}
      <div className="flex flex-col gap-4 px-4 py-4">
        {/* Evolution card */}
        <div className="-mx-4 border-y border-border bg-secondary px-4 py-5 md:mx-0 md:rounded-2xl md:border">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-md font-bold text-foreground">Evolución</span>
            <span className="text-xs text-muted-foreground capitalize">{PERIOD_LABELS[granularity]}</span>
          </div>

          {/* KPI */}
          <div className="mb-4">
            {loadingPeriods ? (
              <Skeleton className="h-9 w-32 rounded-lg" />
            ) : periodsError ? null : (
              <>
                <span style={{ fontSize: 'var(--text-amount-md)', fontWeight: 800, color, letterSpacing: -1 }}>
                  <Amount value={periodTotal} decimals={2} />
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
          ) : periodsError ? (
            <LoadError message="No se pudo cargar la evolución" onRetry={reload} />
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
        <span className="text-md font-bold text-foreground">Movimientos</span>

        {loadingTxs ? (
          <div className="-mx-4 flex flex-col gap-2 md:mx-0">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-15.5 rounded-none border-y border-border md:rounded-2xl md:border" />
            ))}
          </div>
        ) : txsError || periodsError ? (
          <LoadError message="No se pudieron cargar los movimientos" onRetry={reload} />
        ) : groups.length === 0 ? (
          <div className="flex items-center justify-center py-10">
            <p className="text-sm text-muted-foreground">No hay movimientos en este período</p>
          </div>
        ) : (
          <div className="-mx-4 flex flex-col gap-4 md:mx-0">
            {groups.map(group => (
              <TxDayGroupCard
                key={group.date}
                group={group}
                swiped={swiped}
                onOpenSwipe={(id, side) => setSwiped({ id, side })}
                onCloseSwipe={() => setSwiped(null)}
                onRecategorize={tx => { setCatPickerTx(tx); setSwiped(null) }}
                onToggleRead={tx => { setSwiped(null); void (tx.is_read ? markUnread(tx.id) : markRead(tx.id)) }}
                onTap={tx => { setSelectedTxId(tx.id); setSwiped(null); if (!tx.is_read) void markRead(tx.id) }}
              />
            ))}
          </div>
        )}
      </div>

      <TxModal
        tx={selectedTx}
        open={!!selectedTx}
        onOpenChange={o => { if (!o) setSelectedTxId(null) }}
        onRecategorize={tx => { setCatPickerTx(tx); setSelectedTxId(null) }}
        onDelete={handleDelete}
      />

      <CategoryPicker
        tx={catPickerTx}
        open={!!catPickerTx}
        onOpenChange={o => { if (!o) setCatPickerTx(null) }}
        onSelect={recategorize}
      />

      <GranularityPicker open={showPicker} onOpenChange={setShowPicker} />
    </div>
  )
}
