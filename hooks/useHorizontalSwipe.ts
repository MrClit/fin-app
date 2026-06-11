'use client'

import { useRef, useState, type MutableRefObject, type TouchEvent } from 'react'

export const MOVE_THRESHOLD = 8
export const COMMIT_THRESHOLD = 60

/**
 * Lado del panel de acción abierto.
 * - `left`  → panel a la izquierda, se revela arrastrando hacia la derecha (swipe →).
 * - `right` → panel a la derecha, se revela arrastrando hacia la izquierda (swipe ←).
 */
export type SwipeSide = 'left' | 'right'

export function isTap(dx: number): boolean {
  return Math.abs(dx) <= MOVE_THRESHOLD
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

/**
 * Desplazamiento (con signo) del contenido respecto al reposo, en px.
 * `+actionWidth` = panel izquierdo totalmente abierto; `-actionWidth` = panel
 * derecho totalmente abierto; `0` = cerrado. El render aplica
 * `translateX(currentX - actionWidth)` sobre el slider `[left][contenido][right]`.
 */
export function computeDragX(dx: number, openSide: SwipeSide | null, actionWidth: number): number {
  // Abierto a la izquierda: solo se permite cerrar (arrastrar hacia la izquierda).
  if (openSide === 'left') return clamp(actionWidth + Math.min(0, dx), 0, actionWidth)
  // Abierto a la derecha: solo se permite cerrar (arrastrar hacia la derecha).
  if (openSide === 'right') return clamp(-actionWidth + Math.max(0, dx), -actionWidth, 0)
  // Cerrado: el contenido sigue al dedo en ambos sentidos hasta el ancho del panel.
  return clamp(dx, -actionWidth, actionWidth)
}

export type CommitDecision = SwipeSide | 'close' | 'noop'

/**
 * Decide la transición al soltar, en función del desplazamiento y del lado ya
 * abierto. Cerrado: superar el umbral abre el panel del lado correspondiente.
 * Abierto: superar el umbral en sentido contrario lo cierra.
 */
export function decideCommit(dx: number, openSide: SwipeSide | null): CommitDecision {
  if (openSide === 'left') return dx < -COMMIT_THRESHOLD ? 'close' : 'noop'
  if (openSide === 'right') return dx > COMMIT_THRESHOLD ? 'close' : 'noop'
  if (dx > COMMIT_THRESHOLD) return 'left'
  if (dx < -COMMIT_THRESHOLD) return 'right'
  return 'noop'
}

interface Options {
  actionWidth: number
  openSide: SwipeSide | null
  onOpen: (side: SwipeSide) => void
  onClose: () => void
}

interface TouchHandlers {
  onTouchStart: (e: TouchEvent) => void
  onTouchMove: (e: TouchEvent) => void
  onTouchEnd: (e: TouchEvent) => void
  onTouchCancel: (e: TouchEvent) => void
}

interface Result {
  bind: TouchHandlers
  currentX: number
  isAnimating: boolean
  didMoveRef: MutableRefObject<boolean>
}

export function useHorizontalSwipe({ actionWidth, openSide, onOpen, onClose }: Options): Result {
  const startX = useRef<number | null>(null)
  const didMoveRef = useRef(false)
  // `dragX === 0` significa "no se está arrastrando" (reposo): en ese caso el
  // contenido se posiciona según `openSide` y se anima la transición.
  const [dragX, setDragX] = useState(0)

  const onTouchStart = (e: TouchEvent) => {
    startX.current = e.touches[0].clientX
    didMoveRef.current = false
  }

  const onTouchMove = (e: TouchEvent) => {
    if (startX.current === null) return
    const dx = e.touches[0].clientX - startX.current
    if (!isTap(dx)) didMoveRef.current = true
    setDragX(computeDragX(dx, openSide, actionWidth))
  }

  const onTouchEnd = (e: TouchEvent) => {
    if (startX.current === null) return
    const dx = e.changedTouches[0].clientX - startX.current
    const decision = decideCommit(dx, openSide)
    if (decision === 'left' || decision === 'right') onOpen(decision)
    else if (decision === 'close') onClose()
    setDragX(0)
    startX.current = null
  }

  const onTouchCancel = () => {
    startX.current = null
    didMoveRef.current = false
    setDragX(0)
  }

  const settledX = openSide === 'left' ? actionWidth : openSide === 'right' ? -actionWidth : 0

  return {
    bind: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel },
    currentX: dragX !== 0 ? dragX : settledX,
    isAnimating: dragX === 0,
    didMoveRef,
  }
}
