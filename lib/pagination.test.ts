import { describe, expect, it } from 'vitest'
import { buildNextCursor, buildPaginationParams } from './pagination'

describe('buildNextCursor', () => {
  it('devuelve null cuando la lista está vacía', () => {
    expect(buildNextCursor([], 200)).toBeNull()
  })

  it('devuelve null cuando vienen menos items que el límite', () => {
    const items = [
      { date: '2026-05-21', id: 'a' },
      { date: '2026-05-20', id: 'b' },
    ]
    expect(buildNextCursor(items, 200)).toBeNull()
  })

  it('devuelve el cursor del último item cuando se alcanza el límite', () => {
    const items = [
      { date: '2026-05-21', id: 'a' },
      { date: '2026-05-20', id: 'b' },
      { date: '2026-05-19', id: 'c' },
    ]
    expect(buildNextCursor(items, 3)).toEqual({ date: '2026-05-19', id: 'c' })
  })

  it('ignora campos extra del item al construir el cursor', () => {
    const items = [
      { date: '2026-05-21', id: 'a', amount: 100, description: 'foo' },
      { date: '2026-05-20', id: 'b', amount: -50, description: 'bar' },
    ]
    expect(buildNextCursor(items, 2)).toEqual({ date: '2026-05-20', id: 'b' })
  })
})

describe('buildPaginationParams', () => {
  it('devuelve params vacíos cuando el cursor es null y no hay extras', () => {
    const params = buildPaginationParams(null)
    expect(params.toString()).toBe('')
  })

  it('incluye before_date + before_id cuando hay cursor', () => {
    const params = buildPaginationParams({ date: '2026-05-19', id: 'c' })
    expect(params.get('before_date')).toBe('2026-05-19')
    expect(params.get('before_id')).toBe('c')
  })

  it('mergea extras con el cursor', () => {
    const params = buildPaginationParams({ date: '2026-05-19', id: 'c' }, {
      limit: 200,
      accounts: 'acc-1,acc-2',
    })
    expect(params.get('before_date')).toBe('2026-05-19')
    expect(params.get('before_id')).toBe('c')
    expect(params.get('limit')).toBe('200')
    expect(params.get('accounts')).toBe('acc-1,acc-2')
  })

  it('omite extras con valor undefined o cadena vacía', () => {
    const params = buildPaginationParams(null, {
      limit: 200,
      accounts: undefined,
      category: '',
    })
    expect(params.get('limit')).toBe('200')
    expect(params.has('accounts')).toBe(false)
    expect(params.has('category')).toBe(false)
  })
})
