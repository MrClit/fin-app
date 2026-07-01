'use client'

import { Edit3, Check, X } from 'lucide-react'
import { useHorizontalSwipe, type SwipeSide } from '@/hooks/useHorizontalSwipe'
import { CATEGORY_META, UNCATEGORIZED } from '@/lib/theme'
import { getEffectiveCategory } from '@/lib/categories'
import { Amount } from '@/components/ui/amount'
import { cn } from '@/lib/utils'
import type { TransactionWithAccount } from '@/types'

/**
 * Fase de animación de reorganización entre «No leídos» y el grupo de día (#220):
 * `leaving` colapsa la fila en su sitio antes de recolocarse; `entering` la expande
 * al aparecer en su nueva posición; `idle` no anima.
 */
export type TxRowPhase = 'leaving' | 'entering' | 'idle'

interface TxRowProps {
  tx: TransactionWithAccount
  /** Lado del panel de acción abierto para ESTA fila (`null` si está cerrada). */
  openSide: SwipeSide | null
  phase?: TxRowPhase
  onOpenSwipe: (id: string, side: SwipeSide) => void
  onCloseSwipe: () => void
  onRecategorize: (tx: TransactionWithAccount) => void
  onToggleRead: (tx: TransactionWithAccount) => void
  onTap: (tx: TransactionWithAccount) => void
}

const ACTION_WIDTH = 120

export function TxRow({ tx, openSide, phase = 'idle', onOpenSwipe, onCloseSwipe, onRecategorize, onToggleRead, onTap }: TxRowProps) {
  const effectiveCategory = getEffectiveCategory(tx)
  const meta = effectiveCategory ? CATEGORY_META[effectiveCategory] : UNCATEGORIZED
  const Icon = meta.Icon

  const { bind, currentX, isAnimating, didMoveRef } = useHorizontalSwipe({
    actionWidth: ACTION_WIDTH,
    openSide,
    onOpen: side => onOpenSwipe(tx.id, side),
    onClose: onCloseSwipe,
  })

  const leaving = phase === 'leaving'

  return (
    // Wrapper de colapso (#220): grid-template-rows 1fr→0fr + opacity recoloca la
    // fila sin saltos. `leaving` transiciona a colapsado; `entering` arranca
    // colapsado y se expande vía keyframe `animate-row-in`.
    <div
      className={cn(
        'grid transition-[grid-template-rows,opacity] duration-200 ease-out',
        phase === 'entering' && 'animate-row-in'
      )}
      style={{
        gridTemplateRows: leaving ? '0fr' : '1fr',
        opacity: leaving ? 0 : 1,
      }}
    >
      {/* overflow-hidden recorta los paneles de acción cuando están fuera de la fila
          y el contenido de la fila mientras el grid colapsa */}
      <div className="overflow-hidden">
      {/*
       * Slider flex único: [panel izq][contenido][panel der]
       * En reposo: translateX(-ACTION_WIDTH) → ambos paneles fuera, contenido visible
       * Abierto izq: translateX(0)              → panel izquierdo visible (swipe →)
       * Abierto der: translateX(-2·ACTION_WIDTH) → panel derecho visible (swipe ←)
       */}
      <div
        className="flex items-stretch w-[calc(100%+240px)]"
        style={{
          transform: `translateX(${currentX - ACTION_WIDTH}px)`,
          transition: isAnimating ? 'transform 0.25s' : 'none',
        }}
        {...bind}
      >
        {/* Panel izquierdo — «Categoría» (swipe →) */}
        <div className="flex w-30 shrink-0 items-center justify-center bg-primary">
          <button
            className={cn(
              'flex items-center gap-1.5 rounded-[10px] bg-white/20 px-3 py-1.5 text-xs font-bold text-white',
              openSide !== 'left' && 'pointer-events-none'
            )}
            onClick={() => onRecategorize(tx)}
          >
            <Edit3 size={13} strokeWidth={2.5} color="white" />
            Categoría
          </button>
        </div>

        {/* Contenido principal de la fila */}
        <div
          className="relative flex flex-1 min-w-0 items-center gap-3 px-4 py-2.5 bg-card"
          onClick={() => {
            if (didMoveRef.current) { didMoveRef.current = false; return }
            if (openSide) onCloseSwipe()
            else onTap(tx)
          }}
        >
          {/* Dot de no leído: posición absoluta dentro del padding izquierdo, así
              no desplaza el contenido (las filas no se descuadran haya dot o no) y
              el icono queda alineado al borde como en el resto de la app. */}
          {!tx.is_read && (
            <span
              className="absolute left-1.5 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-primary"
              aria-label="No leído"
            />
          )}

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
            <Amount value={tx.amount} decimals={2} signed />
          </span>
        </div>

        {/* Panel derecho — toggle «Leído» / «No leído» (swipe ←) */}
        <div className="flex w-30 shrink-0 items-center justify-center bg-primary">
          <button
            className={cn(
              'flex items-center gap-1.5 rounded-[10px] bg-white/20 px-3 py-1.5 text-xs font-bold text-white',
              openSide !== 'right' && 'pointer-events-none'
            )}
            onClick={() => onToggleRead(tx)}
          >
            {tx.is_read ? (
              <>
                <X size={13} strokeWidth={2.5} color="white" />
                No leído
              </>
            ) : (
              <>
                <Check size={13} strokeWidth={2.5} color="white" />
                Leído
              </>
            )}
          </button>
        </div>
      </div>
      </div>
    </div>
  )
}
