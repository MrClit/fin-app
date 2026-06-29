import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createServiceClient } from '@/lib/supabase/service'
import { sendPushToUser } from '@/lib/push'
import { insertNotification } from '@/lib/notifications'

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(),
}))
vi.mock('@/lib/push', () => ({
  sendPushToUser: vi.fn(),
}))
// Mantiene resolveScraperNotification real (puro) y espía insertNotification.
vi.mock('@/lib/notifications', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/notifications')>()
  return { ...actual, insertNotification: vi.fn() }
})

const { POST } = await import('./route')

const EDENRED_SECRET = 'edenred-secret'
const SABADELL_SECRET = 'sabadell-secret'
const USER_ID = '00000000-0000-0000-0000-000000000001'

function buildMockDb(userConfig: { data: { user_id: string } | null; error?: unknown }) {
  const userConfigBuilder: Record<string, unknown> = {}
  Object.assign(userConfigBuilder, {
    select: vi.fn(() => userConfigBuilder),
    limit: vi.fn(() => userConfigBuilder),
    maybeSingle: vi.fn(() => Promise.resolve(userConfig)),
  })
  const db = {
    from: vi.fn((table: string) => {
      if (table === 'user_config') return userConfigBuilder
      throw new Error(`Unmocked table: ${table}`)
    }),
  }
  return db
}

function callRoute(opts: { auth?: string | null; body?: string } = {}) {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (opts.auth !== null) {
    headers.authorization = opts.auth ?? `Bearer ${EDENRED_SECRET}`
  }
  const body =
    opts.body === undefined ? JSON.stringify({ source: 'edenred', kind: '2fa' }) : opts.body
  return POST(new Request('http://test/api/scrapers/notify', { method: 'POST', headers, body }))
}

beforeEach(() => {
  vi.stubEnv('EDENRED_WEBHOOK_SECRET', EDENRED_SECRET)
  vi.stubEnv('SABADELL_VISA_WEBHOOK_SECRET', SABADELL_SECRET)
  vi.mocked(sendPushToUser).mockReset()
  vi.mocked(insertNotification).mockReset()
  vi.mocked(createServiceClient).mockReset()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('POST /api/scrapers/notify — validación de entrada', () => {
  it('400 si el body no es JSON', async () => {
    const res = await callRoute({ body: 'not-json' })
    expect(res.status).toBe(400)
    expect(createServiceClient).not.toHaveBeenCalled()
  })

  it('400 si faltan source/kind', async () => {
    const res = await callRoute({ body: JSON.stringify({ source: 'edenred' }) })
    expect(res.status).toBe(400)
  })

  it('400 si el source es desconocido', async () => {
    const res = await callRoute({ body: JSON.stringify({ source: 'nope', kind: '2fa' }) })
    expect(res.status).toBe(400)
  })

  it('400 si la combinación source/kind no está en el catálogo', async () => {
    const res = await callRoute({
      auth: `Bearer ${SABADELL_SECRET}`,
      body: JSON.stringify({ source: 'sabadell_visa', kind: '2fa' }),
    })
    expect(res.status).toBe(400)
    expect(createServiceClient).not.toHaveBeenCalled()
  })
})

describe('POST /api/scrapers/notify — auth', () => {
  it('401 sin header Authorization', async () => {
    const res = await callRoute({ auth: null })
    expect(res.status).toBe(401)
    expect(createServiceClient).not.toHaveBeenCalled()
  })

  it('401 con Bearer incorrecto', async () => {
    const res = await callRoute({ auth: 'Bearer wrong' })
    expect(res.status).toBe(401)
  })

  it('401 si se usa el secreto de otro scraper para el source', async () => {
    // body source=edenred pero firmado con el secreto de Sabadell.
    const res = await callRoute({ auth: `Bearer ${SABADELL_SECRET}` })
    expect(res.status).toBe(401)
  })

  it('500 si falta el secreto del source', async () => {
    vi.unstubAllEnvs()
    delete process.env.EDENRED_WEBHOOK_SECRET
    const res = await callRoute()
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Server misconfigured' })
  })
})

describe('POST /api/scrapers/notify — envío', () => {
  it('500 si no hay user_config', async () => {
    const db = buildMockDb({ data: null, error: null })
    vi.mocked(createServiceClient).mockReturnValue(
      db as unknown as ReturnType<typeof createServiceClient>
    )
    const res = await callRoute()
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'No user configured' })
    expect(insertNotification).not.toHaveBeenCalled()
    expect(sendPushToUser).not.toHaveBeenCalled()
  })

  it('persiste la notificación y envía el push, devolviendo el conteo', async () => {
    const db = buildMockDb({ data: { user_id: USER_ID }, error: null })
    vi.mocked(createServiceClient).mockReturnValue(
      db as unknown as ReturnType<typeof createServiceClient>
    )
    vi.mocked(insertNotification).mockResolvedValue(true)
    vi.mocked(sendPushToUser).mockResolvedValue(2)

    const res = await callRoute()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ persisted: true, sent: 2 })

    const [, userId, payload] = vi.mocked(sendPushToUser).mock.calls[0]
    expect(userId).toBe(USER_ID)
    expect(payload).toEqual({
      title: 'Edenred requiere 2FA',
      body: 'Ejecuta «pnpm scrape:edenred:login» para regenerar la sesión.',
      url: '/accounts',
    })

    const [, insUser, insInput] = vi.mocked(insertNotification).mock.calls[0]
    expect(insUser).toBe(USER_ID)
    expect(insInput).toMatchObject({ source: 'edenred', kind: '2fa' })
  })

  it('sigue devolviendo 200 (persisted true, sent 0) si el push lanza', async () => {
    const db = buildMockDb({ data: { user_id: USER_ID }, error: null })
    vi.mocked(createServiceClient).mockReturnValue(
      db as unknown as ReturnType<typeof createServiceClient>
    )
    vi.mocked(insertNotification).mockResolvedValue(true)
    vi.mocked(sendPushToUser).mockRejectedValue(new Error('VAPID env vars no configuradas'))

    const res = await callRoute()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ persisted: true, sent: 0 })
  })
})
