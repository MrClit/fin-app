import { describe, expect, it } from 'vitest'
import { buildPaginationParams } from './pagination'

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
