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

describe('decideCommit (cerrado)', () => {
  it('abre el panel izquierdo al arrastrar a la derecha', () => {
    expect(decideCommit(COMMIT_THRESHOLD + 1, null)).toBe('left')
  })

  it('abre el panel derecho al arrastrar a la izquierda', () => {
    expect(decideCommit(-(COMMIT_THRESHOLD + 1), null)).toBe('right')
  })

  it('no hace nada dentro del umbral', () => {
    expect(decideCommit(0, null)).toBe('noop')
    expect(decideCommit(COMMIT_THRESHOLD, null)).toBe('noop')
    expect(decideCommit(-COMMIT_THRESHOLD, null)).toBe('noop')
  })
})

describe('decideCommit (abierto)', () => {
  it('cierra el panel izquierdo al arrastrar a la izquierda', () => {
    expect(decideCommit(-(COMMIT_THRESHOLD + 1), 'left')).toBe('close')
  })

  it('mantiene el panel izquierdo si no se supera el umbral o se arrastra a la derecha', () => {
    expect(decideCommit(-COMMIT_THRESHOLD, 'left')).toBe('noop')
    expect(decideCommit(COMMIT_THRESHOLD + 1, 'left')).toBe('noop')
  })

  it('cierra el panel derecho al arrastrar a la derecha', () => {
    expect(decideCommit(COMMIT_THRESHOLD + 1, 'right')).toBe('close')
  })

  it('mantiene el panel derecho si no se supera el umbral o se arrastra a la izquierda', () => {
    expect(decideCommit(COMMIT_THRESHOLD, 'right')).toBe('noop')
    expect(decideCommit(-(COMMIT_THRESHOLD + 1), 'right')).toBe('noop')
  })
})

describe('computeDragX (cerrado)', () => {
  const W = 120

  it('sigue el dedo hacia la derecha (revela panel izquierdo)', () => {
    expect(computeDragX(50, null, W)).toBe(50)
  })

  it('sigue el dedo hacia la izquierda (revela panel derecho)', () => {
    expect(computeDragX(-50, null, W)).toBe(-50)
  })

  it('clampa a ±ancho del panel', () => {
    expect(computeDragX(200, null, W)).toBe(W)
    expect(computeDragX(-200, null, W)).toBe(-W)
  })
})

describe('computeDragX (panel izquierdo abierto)', () => {
  const W = 120

  it('ignora movimientos hacia la derecha (ya abierto)', () => {
    expect(computeDragX(50, 'left', W)).toBe(W)
  })

  it('cierra parcialmente al mover a la izquierda', () => {
    expect(computeDragX(-50, 'left', W)).toBe(70)
  })

  it('clampa a cerrado al exceder el ancho', () => {
    expect(computeDragX(-200, 'left', W)).toBe(0)
  })
})

describe('computeDragX (panel derecho abierto)', () => {
  const W = 120

  it('ignora movimientos hacia la izquierda (ya abierto)', () => {
    expect(computeDragX(-50, 'right', W)).toBe(-W)
  })

  it('cierra parcialmente al mover a la derecha', () => {
    expect(computeDragX(50, 'right', W)).toBe(-70)
  })

  it('clampa a cerrado al exceder el ancho', () => {
    expect(computeDragX(200, 'right', W)).toBe(0)
  })
})
