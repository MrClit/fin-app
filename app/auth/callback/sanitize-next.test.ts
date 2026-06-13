import { describe, expect, it } from 'vitest'
import { sanitizeNext } from './sanitize-next'

describe('sanitizeNext', () => {
  it('cae al fallback "/" con destinos externos', () => {
    expect(sanitizeNext('@evil.com')).toBe('/')
    expect(sanitizeNext('//evil.com')).toBe('/')
    expect(sanitizeNext('/\\evil.com')).toBe('/')
    expect(sanitizeNext('https://evil.com')).toBe('/')
    expect(sanitizeNext('http://evil.com')).toBe('/')
  })

  it('conserva rutas internas relativas legítimas', () => {
    expect(sanitizeNext('/')).toBe('/')
    expect(sanitizeNext('/dashboard')).toBe('/dashboard')
    expect(sanitizeNext('/transactions?month=2026-06')).toBe(
      '/transactions?month=2026-06'
    )
  })
})
