'use client'

import { TxRow } from './TxRow'
import { fmt } from '@/lib/formatting'
import { formatDayLabel, type TxDayGroup } from '@/lib/transactions'
import type { TransactionWithAccount } from '@/types'

interface MovimientosListProps {
  groups: TxDayGroup[]
  swipedTxId: string | null
  onSwipe: (id: string | null) => void
  onRecategorize: (tx: TransactionWithAccount) => void
  onTap: (tx: TransactionWithAccount) => void
}

export function MovimientosList({ groups, swipedTxId, onSwipe, onRecategorize, onTap }: MovimientosListProps) {
  if (groups.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-muted-foreground text-center">No hay movimientos con estos filtros</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map(group => {
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
      })}
    </div>
  )
}
