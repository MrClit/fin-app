import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createServiceClient } from '@/lib/supabase/service'
import { sendPushToUser } from '@/lib/push'

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(),
}))
vi.mock('@/lib/push', () => ({
  sendPushToUser: vi.fn(),
}))

const { POST } = await import('./route')

const SECRET = 'test-secret'
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

function callRoute(opts: { auth?: string | null } = {}) {
  const headers: Record<string, string> = {}
  if (opts.auth !== null) {
    headers.authorization = opts.auth ?? `Bearer ${SECRET}`
  }
  return POST(new Request('http://test/api/edenred/notify-2fa', { method: 'POST', headers }))
}

beforeEach(() => {
  vi.stubEnv('EDENRED_WEBHOOK_SECRET', SECRET)
  vi.mocked(sendPushToUser).mockReset()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('POST /api/edenred/notify-2fa — auth', () => {
  it('rechaza con 401 si falta el header Authorization', async () => {
    const db = buildMockDb({ data: { user_id: USER_ID } })
    vi.mocked(createServiceClient).mockReturnValue(
      db as unknown as ReturnType<typeof createServiceClient>
    )

    const res = await callRoute({ auth: null })
    expect(res.status).toBe(401)
    expect(db.from).not.toHaveBeenCalled()
    expect(sendPushToUser).not.toHaveBeenCalled()
  })

  it('rechaza con 401 si el Bearer es incorrecto', async () => {
    const db = buildMockDb({ data: { user_id: USER_ID } })
    vi.mocked(createServiceClient).mockReturnValue(
      db as unknown as ReturnType<typeof createServiceClient>
    )

    const res = await callRoute({ auth: 'Bearer wrong' })
    expect(res.status).toBe(401)
    expect(sendPushToUser).not.toHaveBeenCalled()
  })
})

describe('POST /api/edenred/notify-2fa — configuración', () => {
  it('devuelve 500 si falta EDENRED_WEBHOOK_SECRET', async () => {
    vi.unstubAllEnvs()
    delete process.env.EDENRED_WEBHOOK_SECRET

    const res = await callRoute()
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Server misconfigured' })
  })

  it('devuelve 500 "No user configured" si user_config está vacío', async () => {
    const db = buildMockDb({ data: null, error: null })
    vi.mocked(createServiceClient).mockReturnValue(
      db as unknown as ReturnType<typeof createServiceClient>
    )

    const res = await callRoute()
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'No user configured' })
    expect(sendPushToUser).not.toHaveBeenCalled()
  })
})

describe('POST /api/edenred/notify-2fa — envío', () => {
  it('envía el push de 2FA al usuario y devuelve el conteo', async () => {
    const db = buildMockDb({ data: { user_id: USER_ID }, error: null })
    vi.mocked(createServiceClient).mockReturnValue(
      db as unknown as ReturnType<typeof createServiceClient>
    )
    vi.mocked(sendPushToUser).mockResolvedValue(2)

    const res = await callRoute()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ sent: 2 })

    expect(sendPushToUser).toHaveBeenCalledTimes(1)
    const [, userId, payload] = vi.mocked(sendPushToUser).mock.calls[0]
    expect(userId).toBe(USER_ID)
    expect(payload).toEqual({
      title: 'Edenred requiere 2FA',
      body: 'Ejecuta «pnpm scrape:edenred:login» para regenerar la sesión.',
      url: '/cuentas',
    })
  })

  it('devuelve 500 si sendPushToUser lanza (p. ej. VAPID sin configurar)', async () => {
    const db = buildMockDb({ data: { user_id: USER_ID }, error: null })
    vi.mocked(createServiceClient).mockReturnValue(
      db as unknown as ReturnType<typeof createServiceClient>
    )
    vi.mocked(sendPushToUser).mockRejectedValue(new Error('VAPID env vars no configuradas'))

    const res = await callRoute()
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Push failed' })
  })
})
