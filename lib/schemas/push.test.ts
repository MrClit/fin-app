import { describe, expect, it } from 'vitest'
import { pushSubscribeSchema, pushUnsubscribeSchema } from './push'

const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/abc123'

const subscription = () => ({
  endpoint: ENDPOINT,
  keys: { p256dh: 'BNc...clave', auth: 'authSecret' },
})

describe('pushSubscribeSchema', () => {
  it('acepta la PushSubscription del navegador', () => {
    expect(pushSubscribeSchema.parse(subscription())).toEqual(subscription())
  })

  it.each([
    ['el endpoint no es una URL', { ...subscription(), endpoint: 'abc' }],
    ['faltan las claves', { endpoint: ENDPOINT }],
    ['falta la clave auth', { endpoint: ENDPOINT, keys: { p256dh: 'BNc...clave' } }],
    ['la clave p256dh está vacía', { endpoint: ENDPOINT, keys: { p256dh: '', auth: 'authSecret' } }],
  ])('rechaza la suscripción si %s', (_label, payload) => {
    expect(pushSubscribeSchema.safeParse(payload).success).toBe(false)
  })
})

describe('pushUnsubscribeSchema', () => {
  it('acepta el endpoint', () => {
    expect(pushUnsubscribeSchema.parse({ endpoint: ENDPOINT })).toEqual({ endpoint: ENDPOINT })
  })

  it('rechaza el body sin endpoint', () => {
    expect(pushUnsubscribeSchema.safeParse({}).success).toBe(false)
  })
})
