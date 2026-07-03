'use client'

import { TxRow, type TxRowPhase } from './TxRow'
import type { SwipeSide } from '@/hooks/useHorizontalSwipe'
import { Amount } from '@/components/ui/amount'
import { formatDayLabel, type TxDayGroup } from '@/lib/transactions'
import type { TransactionWithAccount } from '@/types'

interface TxDayGroupCardProps {
  group: TxDayGroup
  swiped: { id: string; side: SwipeSide } | null
  /** Fase de animación de reorganización por id (#220). Sin animación si se omite. */
  phaseOf?: (id: string) => TxRowPhase
  onOpenSwipe: (id: string, side: SwipeSide) => void
  onCloseSwipe: () => void
  onRecategorize: (tx: TransactionWithAccount) => void
  onToggleRead: (tx: TransactionWithAccount) => void
  onTap: (tx: TransactionWithAccount) => void
}

/**
 * Grupo de movimientos de un mismo día: cabecera (fecha + neto) y card a ancho
 * completo con las filas. Compartido por la lista de Movimientos y el detalle de
 * categoría. El `px-4` de la cabecera restaura el margen lateral: ambos
 * consumidores envuelven la lista en `-mx-4`.
 */
export function TxDayGroupCard({
  group,
  swiped,
  phaseOf = () => 'idle',
  onOpenSwipe,
  onCloseSwipe,
  onRecategorize,
  onToggleRead,
  onTap,
}: TxDayGroupCardProps) {
  const netColor = group.net >= 0 ? 'var(--positive)' : 'var(--foreground)'

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between px-4 pb-1">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
          {formatDayLabel(group.date)}
        </span>
        <span className="text-xs font-bold" style={{ color: netColor }}>
          <Amount value={group.net} decimals={2} signed />
        </span>
      </div>

      <div className="flex flex-col bg-card border-y border-border divide-y divide-border/40">
        {group.transactions.map(tx => (
          <TxRow
            key={tx.id}
            tx={tx}
            openSide={swiped?.id === tx.id ? swiped.side : null}
            phase={phaseOf(tx.id)}
            onOpenSwipe={onOpenSwipe}
            onCloseSwipe={onCloseSwipe}
            onRecategorize={onRecategorize}
            onToggleRead={onToggleRead}
            onTap={onTap}
          />
        ))}
      </div>
    </div>
  )
}
