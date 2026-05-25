'use client'

import { useRef, useState, type MutableRefObject, type TouchEvent } from 'react'

export const MOVE_THRESHOLD = 8
export const COMMIT_THRESHOLD = 60

export function isTap(dx: number): boolean {
  return Math.abs(dx) <= MOVE_THRESHOLD
}

export function computeDragX(dx: number, isOpen: boolean, actionWidth: number): number {
  if (!isOpen && dx > 0) return Math.min(dx, actionWidth)
  if (isOpen && dx < 0) return actionWidth + Math.max(dx, -actionWidth)
  return 0
}

export type CommitDecision = 'open' | 'close' | 'noop'

export function decideCommit(dx: number): CommitDecision {
  if (dx > COMMIT_THRESHOLD) return 'open'
  if (dx < -COMMIT_THRESHOLD) return 'close'
  return 'noop'
}

interface Options {
  actionWidth: number
  isOpen: boolean
  onOpen: () => void
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

export function useHorizontalSwipe({ actionWidth, isOpen, onOpen, onClose }: Options): Result {
  const startX = useRef<number | null>(null)
  const didMoveRef = useRef(false)
  const [dragX, setDragX] = useState(0)

  const onTouchStart = (e: TouchEvent) => {
    startX.current = e.touches[0].clientX
    didMoveRef.current = false
  }

  const onTouchMove = (e: TouchEvent) => {
    if (startX.current === null) return
    const dx = e.touches[0].clientX - startX.current
    if (!isTap(dx)) didMoveRef.current = true
    setDragX(computeDragX(dx, isOpen, actionWidth))
  }

  const onTouchEnd = (e: TouchEvent) => {
    if (startX.current === null) return
    const dx = e.changedTouches[0].clientX - startX.current
    const decision = decideCommit(dx)
    if (decision === 'open') onOpen()
    else if (decision === 'close') onClose()
    setDragX(0)
    startX.current = null
  }

  const onTouchCancel = () => {
    startX.current = null
    didMoveRef.current = false
    setDragX(0)
  }

  return {
    bind: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel },
    currentX: isOpen ? actionWidth : dragX,
    isAnimating: dragX === 0,
    didMoveRef,
  }
}
