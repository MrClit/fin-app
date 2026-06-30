import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { rateLimit, clientIp, __resetRateLimit } from './rate-limit'

beforeEach(() => {
  __resetRateLimit()
})

describe('rateLimit', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('permite hasta el límite y bloquea la siguiente petición', () => {
    for (let i = 0; i < 3; i++) {
      expect(rateLimit('k', { limit: 3, windowMs: 1_000 }).ok).toBe(true)
    }
    const blocked = rateLimit('k', { limit: 3, windowMs: 1_000 })
    expect(blocked.ok).toBe(false)
    expect(blocked.retryAfter).toBeGreaterThan(0)
  })

  it('cuenta por clave de forma independiente', () => {
    expect(rateLimit('a', { limit: 1, windowMs: 1_000 }).ok).toBe(true)
    expect(rateLimit('a', { limit: 1, windowMs: 1_000 }).ok).toBe(false)
    // Otra clave arranca con su propio cubo.
    expect(rateLimit('b', { limit: 1, windowMs: 1_000 }).ok).toBe(true)
  })

  it('vuelve a permitir cuando pasa la ventana', () => {
    vi.useFakeTimers()
    expect(rateLimit('k', { limit: 1, windowMs: 1_000 }).ok).toBe(true)
    expect(rateLimit('k', { limit: 1, windowMs: 1_000 }).ok).toBe(false)

    vi.advanceTimersByTime(1_001)
    expect(rateLimit('k', { limit: 1, windowMs: 1_000 }).ok).toBe(true)
  })
})

describe('clientIp', () => {
  const req = (headers: Record<string, string>) =>
    new Request('http://test/', { headers })

  it('usa x-real-ip cuando está presente', () => {
    expect(clientIp(req({ 'x-real-ip': '1.2.3.4' }))).toBe('1.2.3.4')
  })

  it('cae al primer valor de x-forwarded-for', () => {
    expect(
      clientIp(req({ 'x-forwarded-for': '5.6.7.8, 9.9.9.9' }))
    ).toBe('5.6.7.8')
  })

  it('devuelve "unknown" sin cabeceras de IP', () => {
    expect(clientIp(req({}))).toBe('unknown')
  })
})
