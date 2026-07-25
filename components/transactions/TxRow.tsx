'use client'

import { Edit3, Check, X } from 'lucide-react'
import { useHorizontalSwipe, type SwipeSide } from '@/hooks/useHorizontalSwipe'
import { CATEGORY_META, UNCATEGORIZED } from '@/lib/theme'
import { getEffectiveCategory } from '@/lib/categories'
import { Amount, amountColorClass } from '@/components/ui/amount'
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
      {/* overflow-clip recorta los paneles de acción cuando están fuera de la fila
          y el contenido de la fila mientras el grid colapsa. `min-w-0` es imprescindible:
          este div es un grid item (min-width:auto por defecto) y, al no ser overflow-clip
          un scroll container, sin él la anchura mínima se resuelve al min-content del
          slider (100%+240px) y la fila se desborda 240px por la derecha. */}
      <div className="overflow-clip min-w-0">
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
        <div className="flex w-30 shrink-0 items-center justify-center bg-primary" aria-hidden={openSide !== 'left'}>
          <button
            className={cn(
              'flex items-center gap-1.5 rounded-[10px] bg-white/20 px-3 py-1.5 text-xs font-bold text-white',
              openSide !== 'left' && 'pointer-events-none'
            )}
            // Los paneles están siempre en el DOM, fuera de la fila por `translateX`.
            // `pointer-events-none` los desactiva para el ratón pero NO los saca del
            // orden de tabulación: sin esto, recorrer la lista con Tab pararía en dos
            // botones invisibles por fila (#369).
            tabIndex={openSide === 'left' ? 0 : -1}
            onClick={() => onRecategorize(tx)}
          >
            <Edit3 size={13} strokeWidth={2.5} color="white" />
            Categoría
          </button>
        </div>

        {/* Contenido principal de la fila */}
        <div className="group/row relative flex flex-1 min-w-0 bg-card transition-colors hover:bg-muted/40">
          <button
            type="button"
            // `<button>` nativo, no `<div onClick>`: da Enter/Espacio, foco y semántica
            // de lector de pantalla sin escribir un `onKeyDown` (#369).
            className="relative flex flex-1 min-w-0 items-center gap-3 px-4 py-2.5 text-left pointer-fine:pr-20"
            onClick={() => {
              if (didMoveRef.current) { didMoveRef.current = false; return }
              if (openSide) onCloseSwipe()
              else onTap(tx)
            }}
          >
            {/* Dot de no leído: posición absoluta dentro del padding izquierdo, así
                no desplaza el contenido (las filas no se descuadran haya dot o no) y
                el icono queda alineado al borde como en el resto de la app. El estado
                va al nombre accesible del botón por texto, no por `aria-label` en el
                span decorativo. */}
            {!tx.is_read && (
              <>
                <span
                  className="absolute left-1.5 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-primary"
                  aria-hidden
                />
                <span className="sr-only">No leído. </span>
              </>
            )}

            {/* Todo el contenido del botón son `<span>`: el contenido permitido dentro
                de un `<button>` es phrasing content, así que un `<div>`/`<p>` aquí sería
                HTML inválido. El display lo ponen las clases. */}
            <span
              className="flex items-center justify-center rounded-[14px] shrink-0 h-10.5 w-10.5"
              style={{ background: meta.color + '18' }}
            >
              <Icon size={18} style={{ color: meta.color }} strokeWidth={2} />
            </span>

            <span className="block flex-1 min-w-0">
              <span className="block text-sm font-semibold text-foreground truncate">{tx.description}</span>
              <span className="flex items-center gap-1 mt-0.5">
                <span className="rounded-full shrink-0 h-1.75 w-1.75" style={{ background: meta.color }} />
                <span className="text-2xs text-muted-foreground truncate">{meta.label}</span>
              </span>
            </span>

            <span className={cn('text-md font-bold shrink-0', amountColorClass(tx))}>
              <Amount value={tx.amount} decimals={2} signed />
            </span>
          </button>

          {/*
           * Alternativa de puntero al swipe (#369). Las dos acciones del swipe táctil
           * —recategorizar y marcar leído— no eran alcanzables con ratón ni teclado.
           *
           * - `pointer-coarse:hidden`: con dedo el gutter no existe (`display:none`),
           *   ni para el puntero ni para el Tab. Táctil queda idéntico. Se gatea por
           *   capacidad de entrada (`pointer-*`) y no por `md:`, que es ancho: un
           *   portátil estrecho tiene ratón y una tablet ancha no.
           * - El hueco se reserva siempre con `pointer-fine:pr-20` en el botón de al
           *   lado, así el importe nunca se tapa y la fila no salta al pasar el ratón:
           *   lo único que cambia es la opacidad.
           * - `group-focus-within`: también aparece al llegar con Tab; si no, los
           *   botones serían focusables pero invisibles.
           * - Con opacidad y no con `hidden`, para que sigan en el orden de tabulación.
           */}
          <div
            className="pointer-coarse:hidden absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1
                       opacity-0 transition-opacity
                       group-hover/row:opacity-100 group-focus-within/row:opacity-100"
          >
            <button
              type="button"
              aria-label="Cambiar categoría"
              onClick={() => onRecategorize(tx)}
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Edit3 size={15} strokeWidth={2} />
            </button>
            <button
              type="button"
              aria-label={tx.is_read ? 'Marcar como no leído' : 'Marcar como leído'}
              onClick={() => onToggleRead(tx)}
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {tx.is_read ? <X size={15} strokeWidth={2} /> : <Check size={15} strokeWidth={2} />}
            </button>
          </div>
        </div>

        {/* Panel derecho — toggle «Leído» / «No leído» (swipe ←) */}
        <div className="flex w-30 shrink-0 items-center justify-center bg-primary" aria-hidden={openSide !== 'right'}>
          <button
            className={cn(
              'flex items-center gap-1.5 rounded-[10px] bg-white/20 px-3 py-1.5 text-xs font-bold text-white',
              openSide !== 'right' && 'pointer-events-none'
            )}
            tabIndex={openSide === 'right' ? 0 : -1}
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
