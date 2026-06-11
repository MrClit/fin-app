import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock de web-push: capturamos los envíos y controlamos los fallos por endpoint.
const sendNotification = vi.fn()
vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: (...args: unknown[]) => sendNotification(...args),
  },
}))

import { selectAccountsToNotify, urlBase64ToUint8Array, sendPushToUser, type NotifiableAccount } from './push'

const DAY_MS = 86_400_000
const NOW = new Date('2026-05-21T12:00:00.000Z')

function isoInDays(days: number): string {
  return new Date(NOW.getTime() + days * DAY_MS).toISOString()
}

function account(over: Partial<NotifiableAccount> = {}): NotifiableAccount {
  return {
    id: 'acc-1',
    user_id: 'user-1',
    name: 'Cuenta Corriente',
    consent_expires_at: isoInDays(3),
    consent_reminder_sent_for: null,
    ...over,
  }
}

describe('selectAccountsToNotify', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('incluye cuentas en ventana crítica (≤7 días) no notificadas', () => {
    const result = selectAccountsToNotify([account({ consent_expires_at: isoInDays(3) })])
    expect(result).toHaveLength(1)
  })

  it('ignora cuentas en warning (>=7 días) y ok', () => {
    const result = selectAccountsToNotify([
      account({ id: 'a', consent_expires_at: isoInDays(10) }),
      account({ id: 'b', consent_expires_at: isoInDays(30) }),
    ])
    expect(result).toHaveLength(0)
  })

  it('ignora cuentas ya caducadas', () => {
    const result = selectAccountsToNotify([account({ consent_expires_at: isoInDays(-1) })])
    expect(result).toHaveLength(0)
  })

  it('respeta el dedupe: no reenvía si ya se notificó este consent_expires_at', () => {
    const expiry = isoInDays(3)
    const result = selectAccountsToNotify([
      account({ consent_expires_at: expiry, consent_reminder_sent_for: expiry }),
    ])
    expect(result).toHaveLength(0)
  })

  it('vuelve a notificar si la caducidad cambió respecto a la ya notificada', () => {
    const result = selectAccountsToNotify([
      account({ consent_expires_at: isoInDays(3), consent_reminder_sent_for: isoInDays(-90) }),
    ])
    expect(result).toHaveLength(1)
  })
})

describe('urlBase64ToUint8Array', () => {
  it('decodifica base64url a los bytes correctos', () => {
    // "Man" en base64 estándar es "TWFu"; en base64url es igual aquí.
    const bytes = urlBase64ToUint8Array('TWFu')
    expect(Array.from(bytes)).toEqual([77, 97, 110])
  })

  it('maneja el alfabeto url-safe (- y _) y el padding ausente', () => {
    // 0xFB 0xFF 0xBF → base64 "+/+/", base64url "-_-_"
    const bytes = urlBase64ToUint8Array('-_-_')
    expect(Array.from(bytes)).toEqual([251, 255, 191])
  })
})

describe('sendPushToUser', () => {
  beforeEach(() => {
    sendNotification.mockReset()
    process.env.VAPID_SUBJECT = 'mailto:test@example.com'
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'pub'
    process.env.VAPID_PRIVATE_KEY = 'priv'
  })

  function makeDb(subs: { endpoint: string; p256dh: string; auth: string }[]) {
    const deleted: string[][] = []
    const db = {
      from() {
        return {
          select() {
            return { eq: () => Promise.resolve({ data: subs, error: null }) }
          },
          delete() {
            return {
              in(_col: string, endpoints: string[]) {
                deleted.push(endpoints)
                return Promise.resolve({ error: null })
              },
            }
          },
        }
      },
    }
    return { db, deleted }
  }

  it('poda las suscripciones que devuelven 410 Gone', async () => {
    const { db, deleted } = makeDb([
      { endpoint: 'https://push/ok', p256dh: 'k1', auth: 'a1' },
      { endpoint: 'https://push/gone', p256dh: 'k2', auth: 'a2' },
    ])
    sendNotification.mockImplementation((sub: { endpoint: string }) => {
      if (sub.endpoint === 'https://push/gone') {
        return Promise.reject({ statusCode: 410 })
      }
      return Promise.resolve()
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sent = await sendPushToUser(db as any, 'user-1', { title: 't', body: 'b', url: '/' })

    expect(sent).toBe(1)
    expect(deleted).toEqual([['https://push/gone']])
  })

  it('no borra nada si todos los envíos van bien', async () => {
    const { db, deleted } = makeDb([{ endpoint: 'https://push/ok', p256dh: 'k', auth: 'a' }])
    sendNotification.mockResolvedValue(undefined)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sent = await sendPushToUser(db as any, 'user-1', { title: 't', body: 'b', url: '/' })

    expect(sent).toBe(1)
    expect(deleted).toEqual([])
  })

  it('envía con TTL acotado y urgency normal (issue #124)', async () => {
    const { db } = makeDb([{ endpoint: 'https://push/ok', p256dh: 'k', auth: 'a' }])
    sendNotification.mockResolvedValue(undefined)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await sendPushToUser(db as any, 'user-1', { title: 't', body: 'b', url: '/' })

    expect(sendNotification).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(String),
      { TTL: 86400, urgency: 'normal' },
    )
  })
})
