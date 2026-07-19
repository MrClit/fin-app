import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { getCurrentUser, getRequestClient } from '@/lib/auth/session'
import { argsOf, called, createFakeSupabase } from '@/tests/supabase-fake'

vi.mock('@/lib/auth/session', () => ({
  getCurrentUser: vi.fn(),
  getCurrentHouseholdId: vi.fn(),
  getRequestClient: vi.fn(),
}))

vi.mock('@/lib/error-log', () => ({
  logError: vi.fn(async () => {}),
}))

const { GET: listNotifications } = await import('./route')
const { GET: unreadCount } = await import('./unread-count/route')

const USER_ID = '00000000-0000-0000-0000-000000000001'
const DAY_MS = 86_400_000

const req = (path: string) => new NextRequest(`http://localhost${path}`)

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.mocked(getCurrentUser).mockResolvedValue({
    id: USER_ID,
  } as unknown as Awaited<ReturnType<typeof getCurrentUser>>)
})

describe('GET /api/notifications', () => {
  it('filtra por antigüedad (30 días) pero incluye siempre las no leídas', async () => {
    const { supabase, queries } = createFakeSupabase(() => ({ data: [] }))
    vi.mocked(getRequestClient).mockResolvedValue(supabase)

    const res = await listNotifications(req('/api/notifications'))

    expect(res.status).toBe(200)
    expect(queries[0].table).toBe('notifications')

    const orArg = argsOf(queries[0], 'or')![0] as string
    const match = orArg.match(/^created_at\.gte\.(.+),read_at\.is\.null$/)
    expect(match).not.toBeNull()
    // El corte es "ahora − 30 días" calculado en la petición (tolerancia 1 min).
    const cutoffMs = new Date(match![1]).getTime()
    expect(Math.abs(cutoffMs - (Date.now() - 30 * DAY_MS))).toBeLessThan(60_000)

    expect(argsOf(queries[0], 'order')).toEqual(['created_at', { ascending: false }])
    expect(argsOf(queries[0], 'limit')).toEqual([30])
  })

  it('devuelve las notificaciones de la consulta', async () => {
    const rows = [
      { id: 'a', title: 'Aviso', read_at: null, created_at: '2026-07-01T00:00:00Z' },
    ]
    const { supabase } = createFakeSupabase(() => ({ data: rows }))
    vi.mocked(getRequestClient).mockResolvedValue(supabase)

    const res = await listNotifications(req('/api/notifications'))

    expect(await res.json()).toEqual({ notifications: rows })
  })

  it('devuelve 401 sin sesión, sin tocar la BD', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null)
    const { supabase, queries } = createFakeSupabase(() => ({ data: [] }))
    vi.mocked(getRequestClient).mockResolvedValue(supabase)

    const res = await listNotifications(req('/api/notifications'))

    expect(res.status).toBe(401)
    expect(queries).toHaveLength(0)
  })
})

describe('GET /api/notifications/unread-count', () => {
  // Guardarraíl del invariante de #314: el badge cuenta TODAS las no leídas, sin
  // corte de antigüedad. Si alguien añade aquí el corte de la lista, una no leída
  // antigua desaparecería del conteo (o, al revés, la lista ocultaría filas que el
  // badge cuenta).
  it('cuenta las no leídas sin filtro de antigüedad', async () => {
    const { supabase, queries } = createFakeSupabase(() => ({ count: 3 }))
    vi.mocked(getRequestClient).mockResolvedValue(supabase)

    const res = await unreadCount(req('/api/notifications/unread-count'))

    expect(await res.json()).toEqual({ count: 3 })
    expect(queries[0].table).toBe('notifications')
    expect(argsOf(queries[0], 'is')).toEqual(['read_at', null])
    expect(called(queries[0], 'or')).toBe(false)
    expect(called(queries[0], 'gte')).toBe(false)
  })
})
