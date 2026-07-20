import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getCurrentUser, getRequestClient } from '@/lib/auth/session'
import { argsOf, createFakeSupabase, queryAt } from '@/tests/supabase-fake'

vi.mock('@/lib/auth/session', () => ({
  getCurrentUser: vi.fn(),
  getCurrentHouseholdId: vi.fn(),
  getRequestClient: vi.fn(),
}))

vi.mock('@/lib/error-log', () => ({
  logError: vi.fn(async () => {}),
}))

const { markAllNotificationsRead } = await import('./notifications')

const USER_ID = '00000000-0000-0000-0000-000000000001'

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.mocked(getCurrentUser).mockResolvedValue({
    id: USER_ID,
  } as unknown as Awaited<ReturnType<typeof getCurrentUser>>)
})

describe('markAllNotificationsRead', () => {
  it('marca read_at solo en las notificaciones no leídas', async () => {
    const { supabase, queries } = createFakeSupabase(() => ({ data: null }))
    vi.mocked(getRequestClient).mockResolvedValue(supabase)

    const res = await markAllNotificationsRead()

    expect(res.error).toBeUndefined()
    expect(queryAt(queries, 0).table).toBe('notifications')
    expect(argsOf(queryAt(queries, 0), 'update')![0]).toMatchObject({ read_at: expect.any(String) })
    expect(argsOf(queryAt(queries, 0), 'is')).toEqual(['read_at', null])
  })

  it('devuelve unauthorized sin sesión, sin tocar la BD', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null)
    const { supabase, queries } = createFakeSupabase(() => ({ data: null }))
    vi.mocked(getRequestClient).mockResolvedValue(supabase)

    const res = await markAllNotificationsRead()

    expect(res.error).toEqual({ code: 'unauthorized' })
    expect(queries).toHaveLength(0)
  })
})
