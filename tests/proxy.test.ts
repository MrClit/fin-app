import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

// Espía createServerClient: sólo debe invocarse en rutas protegidas. En los
// webhooks exentos, proxy() retorna antes de tocar Supabase.
const getUser = vi.fn()
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({ auth: { getUser } })),
}))

const { proxy } = await import('@/proxy')
const { createServerClient } = await import('@supabase/ssr')

const req = (path: string) => new NextRequest(new URL(`http://test${path}`))

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://supabase.test')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key')
  vi.mocked(createServerClient).mockClear()
  getUser.mockReset()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('proxy — webhooks públicos con auth Bearer (exentos de sesión)', () => {
  const exemptPaths = [
    '/api/scrapers/notify',
    '/api/edenred',
    '/api/sabadell-visa/webhook',
    '/api/sync/enablebanking/cron',
    '/api/error-log',
  ]

  it.each(exemptPaths)('%s no se redirige y no consulta la sesión', async path => {
    const res = await proxy(req(path))
    // NextResponse.next() no lleva Location; el redirect a /login sí.
    expect(res.headers.get('location')).toBeNull()
    expect(createServerClient).not.toHaveBeenCalled()
    expect(getUser).not.toHaveBeenCalled()
  })
})

describe('proxy — rutas protegidas', () => {
  it('redirige a /login cuando no hay sesión', async () => {
    getUser.mockResolvedValue({ data: { user: null } })
    const res = await proxy(req('/api/transactions'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login')
  })

  it('deja pasar cuando hay sesión', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    const res = await proxy(req('/analytics'))
    expect(res.headers.get('location')).toBeNull()
    expect(getUser).toHaveBeenCalled()
  })
})
