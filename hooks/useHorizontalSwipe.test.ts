import { describe, it, expect } from 'vitest'
import {
  isTap,
  computeDragX,
  decideCommit,
  MOVE_THRESHOLD,
  COMMIT_THRESHOLD,
} from './useHorizontalSwipe'

describe('isTap', () => {
  it('considera tap los movimientos pequeños', () => {
    expect(isTap(0)).toBe(true)
    expect(isTap(MOVE_THRESHOLD)).toBe(true)
    expect(isTap(-MOVE_THRESHOLD)).toBe(true)
  })

  it('considera swipe cuando |dx| supera el umbral', () => {
    expect(isTap(MOVE_THRESHOLD + 1)).toBe(false)
    expect(isTap(-(MOVE_THRESHOLD + 1))).toBe(false)
  })
})

describe('decideCommit', () => {
  it('abre cuando dx supera el umbral positivo', () => {
    expect(decideCommit(COMMIT_THRESHOLD + 1)).toBe('open')
  })

  it('cierra cuando dx supera el umbral negativo', () => {
    expect(decideCommit(-(COMMIT_THRESHOLD + 1))).toBe('close')
  })

  it('no hace nada dentro del umbral', () => {
    expect(decideCommit(0)).toBe('noop')
    expect(decideCommit(COMMIT_THRESHOLD)).toBe('noop')
    expect(decideCommit(-COMMIT_THRESHOLD)).toBe('noop')
  })
})

describe('computeDragX (cerrado)', () => {
  const actionWidth = 120

  it('ignora movimientos hacia la izquierda', () => {
    expect(computeDragX(-50, false, actionWidth)).toBe(0)
  })

  it('sigue el dedo hacia la derecha', () => {
    expect(computeDragX(50, false, actionWidth)).toBe(50)
  })

  it('clampa al ancho del panel', () => {
    expect(computeDragX(200, false, actionWidth)).toBe(actionWidth)
  })
})

describe('computeDragX (abierto)', () => {
  const actionWidth = 120

  it('ignora movimientos hacia la derecha', () => {
    expect(computeDragX(50, true, actionWidth)).toBe(0)
  })

  it('cierra parcialmente al mover a la izquierda', () => {
    expect(computeDragX(-50, true, actionWidth)).toBe(70)
  })

  it('clampa cuando se excede el ancho del panel', () => {
    expect(computeDragX(-200, true, actionWidth)).toBe(0)
  })
})
