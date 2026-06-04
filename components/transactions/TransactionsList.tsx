'use client'

import { useEffect, useRef } from 'react'
import { TxRow } from './TxRow'
import { Skeleton } from '@/components/ui/skeleton'
import { fmt } from '@/lib/formatting'
import { formatDayLabel, type TxDayGroup } from '@/lib/transactions'
import type { TransactionWithAccount } from '@/types'

interface TransactionsListProps {
  groups: TxDayGroup[]
  swipedTxId: string | null
  onSwipe: (id: string | null) => void
  onRecategorize: (tx: TransactionWithAccount) => void
  onTap: (tx: TransactionWithAccount) => void
  onLoadMore: () => void
  hasMore: boolean
  loadingMore: boolean
  loadMoreError: string | null
}

export function TransactionsList({
  groups,
  swipedTxId,
  onSwipe,
  onRecategorize,
  onTap,
  onLoadMore,
  hasMore,
  loadingMore,
  loadMoreError,
}: TransactionsListProps) {
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  // El sentinel se monta siempre al final, incluso con lista filtrada vacía,
  // para que la auto-paginación dispare búsquedas que solo matcheen en
  // histórico antiguo. Si el observer detecta intersección y hay más datos,
  // pedimos la siguiente página.
  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore || loadingMore || loadMoreError) return
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) onLoadMore()
      },
      { rootMargin: '400px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, loadMoreError, onLoadMore])

  const isEmpty = groups.length === 0

  return (
    <div className="flex flex-col gap-4">
      {isEmpty ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-muted-foreground text-center">
            {hasMore ? 'Buscando en el histórico…' : 'No hay movimientos con estos filtros'}
          </p>
        </div>
      ) : (
        groups.map(group => {
          const netStr = (group.net >= 0 ? '+' : '') + fmt(group.net, 2) + ' €'
          const netColor = group.net >= 0 ? '#22c55e' : 'var(--foreground)'

          return (
            <div key={group.date} className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between px-3 pb-1">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                  {formatDayLabel(group.date)}
                </span>
                <span className="text-xs font-bold" style={{ color: netColor }}>
                  {netStr}
                </span>
              </div>

              <div className="flex flex-col bg-card rounded-2xl overflow-clip divide-y divide-border/40">
                {group.transactions.map(tx => (
                  <TxRow
                    key={tx.id}
                    tx={tx}
                    swipedId={swipedTxId}
                    onSwipe={onSwipe}
                    onRecategorize={onRecategorize}
                    onTap={onTap}
                  />
                ))}
              </div>
            </div>
          )
        })
      )}

      <div ref={sentinelRef} aria-hidden="true" />

      {loadingMore && (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map(i => (
            <Skeleton key={i} className="h-15.5 rounded-2xl" />
          ))}
        </div>
      )}

      {loadMoreError && (
        <div className="flex flex-col items-center gap-2 py-4">
          <p className="text-sm text-muted-foreground">{loadMoreError}</p>
          <button
            type="button"
            onClick={onLoadMore}
            className="text-sm font-semibold text-primary"
          >
            Reintentar
          </button>
        </div>
      )}

      {!hasMore && !isEmpty && !loadingMore && !loadMoreError && (
        <p className="text-xs text-muted-foreground text-center py-4">
          No hay más movimientos
        </p>
      )}
    </div>
  )
}
