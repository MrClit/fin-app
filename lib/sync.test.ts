import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SYNC_COOLDOWN_MS, syncAvailableAt } from './sync'

const HOUR_MS = 60 * 60 * 1000
const MINUTE_MS = 60 * 1000
const NOW = new Date('2026-05-21T12:00:00.000Z')

function isoMsAgo(ms: number): string {
  return new Date(NOW.getTime() - ms).toISOString()
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('SYNC_COOLDOWN_MS', () => {
  it('vale exactamente 6 horas en ms', () => {
    expect(SYNC_COOLDOWN_MS).toBe(6 * HOUR_MS)
  })
})

describe('syncAvailableAt', () => {
  describe('sin sync previo', () => {
    it('null → null (disponible ahora mismo)', () => {
      expect(syncAvailableAt(null)).toBeNull()
    })

    it('string vacío → null (disponible ahora mismo)', () => {
      expect(syncAvailableAt('')).toBeNull()
    })
  })

  describe('entrada inválida', () => {
    it('string no parseable como fecha → null', () => {
      expect(syncAvailableAt('no-es-una-fecha')).toBeNull()
    })
  })

  describe('fuera del cooldown', () => {
    it('exactamente 6 h atrás → null', () => {
      expect(syncAvailableAt(isoMsAgo(6 * HOUR_MS))).toBeNull()
    })

    it('hace 7 h → null', () => {
      expect(syncAvailableAt(isoMsAgo(7 * HOUR_MS))).toBeNull()
    })
  })

  describe('dentro del cooldown', () => {
    it('hace 1 h → disponible en 5 h', () => {
      const result = syncAvailableAt(isoMsAgo(1 * HOUR_MS))
      expect(result).not.toBeNull()
      expect(result! - Date.now()).toBe(5 * HOUR_MS)
    })

    it('hace 5 h 59 min → disponible en ~1 min', () => {
      const result = syncAvailableAt(isoMsAgo(5 * HOUR_MS + 59 * MINUTE_MS))
      expect(result).not.toBeNull()
      expect(result! - Date.now()).toBe(MINUTE_MS)
    })
  })

  describe('acepta número (epoch ms) además de string', () => {
    it('hace 2 h en ms → disponible en 4 h', () => {
      const result = syncAvailableAt(NOW.getTime() - 2 * HOUR_MS)
      expect(result).not.toBeNull()
      expect(result! - Date.now()).toBe(4 * HOUR_MS)
    })
  })
})
