'use client'

import { useState, useRef } from 'react'
import { Edit3 } from 'lucide-react'
import { CATEGORY_META } from '@/lib/theme'
import { fmt } from '@/lib/formatting'
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
  const effectiveCategory = (tx.category_manual ?? tx.category ?? 'other') as CategoryId
  const meta = CATEGORY_META[effectiveCategory] ?? CATEGORY_META.other
  const Icon = meta.Icon

  const isOpen = swipedId === tx.id
  const startX = useRef<number | null>(null)
  const didMove = useRef(false)
  const [dragX, setDragX] = useState(0)

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX
    didMove.current = false
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startX.current === null) return
    const dx = e.touches[0].clientX - startX.current
    if (Math.abs(dx) > 8) didMove.current = true
    if (!isOpen && dx > 0) setDragX(Math.min(dx, ACTION_WIDTH))
    if (isOpen && dx < 0) setDragX(ACTION_WIDTH + Math.max(dx, -ACTION_WIDTH))
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (startX.current === null) return
    const dx = e.changedTouches[0].clientX - startX.current
    if (dx > 60) onSwipe(tx.id)
    if (dx < -60) onSwipe(null)
    setDragX(0)
    startX.current = null
  }

  const handleTouchCancel = () => {
    startX.current = null
    didMove.current = false
    setDragX(0)
  }

  // currentX: how much the slider has moved right (0 = closed, ACTION_WIDTH = fully open)
  const currentX = isOpen ? ACTION_WIDTH : dragX
  const isAnimating = dragX === 0

  const absAmount = fmt(Math.abs(tx.amount), 2)
  const amountStr = (tx.amount > 0 ? '+' : '-') + absAmount + ' €'
  const amountColor = tx.amount > 0 ? '#22c55e' : '#ef4444'

  return (
    // overflow: hidden clips the action panel when hidden to the left
    <div style={{ overflow: 'hidden' }}>
      {/*
       * Single flex slider: [action panel][content]
       * At rest:  translateX(-ACTION_WIDTH) → action panel off-screen left, content visible
       * Swiped:   translateX(0)             → action panel visible, content shifted right
       */}
      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          width: `calc(100% + ${ACTION_WIDTH}px)`,
          transform: `translateX(${currentX - ACTION_WIDTH}px)`,
          transition: isAnimating ? 'transform 0.25s' : 'none',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
      >
        {/* Action panel — hidden to the left until swiped */}
        <div
          style={{
            width: ACTION_WIDTH,
            flexShrink: 0,
            background: '#6366f1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <button
            style={{
              pointerEvents: isOpen ? 'auto' : 'none',
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: 10,
              padding: '6px 12px',
              color: 'white',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            onClick={() => onRecategorize(tx)}
          >
            <Edit3 size={13} strokeWidth={2.5} color="white" />
            Categoría
          </button>
        </div>

        {/* Main row content */}
        <div
          className="flex items-center gap-3 px-3 py-2.5 bg-card"
          style={{ flex: 1, minWidth: 0 }}
          onClick={() => {
            if (didMove.current) { didMove.current = false; return }
            if (isOpen) onSwipe(null)
            else onTap(tx)
          }}
        >
          <div
            className="flex items-center justify-center rounded-[14px] shrink-0"
            style={{ width: 42, height: 42, background: meta.color + '18' }}
          >
            <Icon size={18} style={{ color: meta.color }} strokeWidth={2} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{tx.description}</p>
              {tx.category_manual && (
                <span
                  className="rounded-full text-[9px] font-bold px-1.5 py-0.5 leading-none shrink-0"
                  style={{ background: '#6366f1', color: 'white' }}
                >
                  EDITADA
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="rounded-full shrink-0" style={{ width: 7, height: 7, background: meta.color }} />
              <span className="text-[11px] text-muted-foreground truncate">{meta.label}</span>
            </div>
          </div>

          <span className="text-[15px] font-bold shrink-0" style={{ color: amountColor }}>
            {amountStr}
          </span>
        </div>
      </div>
    </div>
  )
}
