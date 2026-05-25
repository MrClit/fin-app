'use client'

import { Edit3 } from 'lucide-react'
import { useHorizontalSwipe } from '@/hooks/useHorizontalSwipe'
import { CATEGORY_META, SIN_CATEGORIA } from '@/lib/theme'
import { fmt } from '@/lib/formatting'
import { cn } from '@/lib/utils'
import type { CategoryId, TransactionWithAccount } from '@/types'

interface TxRowProps {
  tx: TransactionWithAccount
  swipedId: string | null
  onSwipe: (id: string | null) => void
  onRecategorize: (tx: TransactionWithAccount) => void
  onTap: (tx: TransactionWithAccount) => void
}

const ACTION_WIDTH = 120

export function TxRow({ tx, swipedId, onSwipe, onRecategorize, onTap }: TxRowProps) {
  const effectiveCategory = (tx.category_manual ?? tx.category) as CategoryId | null
  const meta = effectiveCategory ? (CATEGORY_META[effectiveCategory] ?? CATEGORY_META.other) : SIN_CATEGORIA
  const Icon = meta.Icon

  const isOpen = swipedId === tx.id
  const { bind, currentX, isAnimating, didMoveRef } = useHorizontalSwipe({
    actionWidth: ACTION_WIDTH,
    isOpen,
    onOpen: () => onSwipe(tx.id),
    onClose: () => onSwipe(null),
  })

  const absAmount = fmt(Math.abs(tx.amount), 2)
  const amountStr = (tx.amount > 0 ? '+' : '-') + absAmount + ' €'

  return (
    // overflow-hidden recorta el panel de acción cuando está fuera de la fila
    <div className="overflow-hidden">
      {/*
       * Slider flex único: [panel acción][contenido]
       * En reposo: translateX(-ACTION_WIDTH) → panel fuera por la izquierda, contenido visible
       * Abierto:   translateX(0)             → panel visible, contenido desplazado a la derecha
       */}
      <div
        className="flex items-stretch w-[calc(100%+120px)]"
        style={{
          transform: `translateX(${currentX - ACTION_WIDTH}px)`,
          transition: isAnimating ? 'transform 0.25s' : 'none',
        }}
        {...bind}
      >
        {/* Panel de acción — oculto a la izquierda hasta que se hace swipe */}
        <div className="flex w-30 shrink-0 items-center justify-center bg-primary">
          <button
            className={cn(
              'flex items-center gap-1.5 rounded-[10px] bg-white/20 px-3 py-1.5 text-xs font-bold text-white',
              !isOpen && 'pointer-events-none'
            )}
            onClick={() => onRecategorize(tx)}
          >
            <Edit3 size={13} strokeWidth={2.5} color="white" />
            Categoría
          </button>
        </div>

        {/* Contenido principal de la fila */}
        <div
          className="flex flex-1 min-w-0 items-center gap-3 px-3 py-2.5 bg-card"
          onClick={() => {
            if (didMoveRef.current) { didMoveRef.current = false; return }
            if (isOpen) onSwipe(null)
            else onTap(tx)
          }}
        >
          <div
            className="flex items-center justify-center rounded-[14px] shrink-0 h-10.5 w-10.5"
            style={{ background: meta.color + '18' }}
          >
            <Icon size={18} style={{ color: meta.color }} strokeWidth={2} />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{tx.description}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="rounded-full shrink-0 h-1.75 w-1.75" style={{ background: meta.color }} />
              <span className="text-[11px] text-muted-foreground truncate">{meta.label}</span>
            </div>
          </div>

          <span
            className={cn(
              'text-[15px] font-bold shrink-0',
              tx.amount > 0 ? 'text-[#22c55e]' : 'text-destructive'
            )}
          >
            {amountStr}
          </span>
        </div>
      </div>
    </div>
  )
}
