import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { getCurrentUser, getCurrentHouseholdId, getRequestClient } from '@/lib/auth/session'
import { logError } from '@/lib/error-log'

vi.mock('@/lib/auth/session', () => ({
  getCurrentUser: vi.fn(),
  getCurrentHouseholdId: vi.fn(),
  getRequestClient: vi.fn(),
}))

vi.mock('@/lib/error-log', () => ({
  logError: vi.fn(async () => {}),
}))

const { POST } = await import('./route')

const USER_ID = '00000000-0000-0000-0000-000000000001'
const HOUSEHOLD_ID = '00000000-0000-0000-0000-0000000000a1'
const ACCOUNT_ID = '00000000-0000-0000-0000-0000000000b1'

/** Captura la fila insertada y devuelve la tx que Supabase respondería. */
function mockDb() {
  const insert = vi.fn((row: Record<string, unknown>) => ({
    select: () => ({
      single: async () => ({ data: { id: 'tx-1', ...row }, error: null }),
    }),
  }))
  vi.mocked(getRequestClient).mockResolvedValue({
    from: () => ({ insert }),
  } as unknown as Awaited<ReturnType<typeof getRequestClient>>)
  return { insert }
}

function post(body: unknown) {
  return new NextRequest('http://test/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

/** El modal puede no enviar categoría; el resto de campos son obligatorios. */
const bodySinCategoria = {
  amount: -42.5,
  description: 'Compra',
  date: '2026-05-18',
  account_id: ACCOUNT_ID,
}

const validBody = { ...bodySinCategoria, category_manual: 'groceries' }

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.mocked(getCurrentUser).mockResolvedValue({
    id: USER_ID,
  } as unknown as Awaited<ReturnType<typeof getCurrentUser>>)
  vi.mocked(getCurrentHouseholdId).mockResolvedValue(HOUSEHOLD_ID)
})

describe('POST /api/transactions', () => {
  it('crea el movimiento y lo devuelve con 201', async () => {
    const { insert } = mockDb()

    const res = await POST(post(validBody))

    expect(res.status).toBe(201)
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: USER_ID,
        household_id: HOUSEHOLD_ID,
        account_id: ACCOUNT_ID,
        amount: -42.5,
        description: 'Compra',
        date: '2026-05-18',
        category_manual: 'groceries',
        source: 'manual',
        is_read: true,
      })
    )
  })

  it('acepta el importe 0 (issue #308: el chequeo por falsy lo rechazaba)', async () => {
    const { insert } = mockDb()

    const res = await POST(post({ ...validBody, amount: 0 }))

    expect(res.status).toBe(201)
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ amount: 0 }))
  })

  it('guarda la categoría como null cuando no viene', async () => {
    const { insert } = mockDb()

    await POST(post(bodySinCategoria))

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ category_manual: null }))
  })

  it.each([
    ['el importe no es numérico', { ...validBody, amount: 'abc' }],
    ['la cuenta no es un UUID', { ...validBody, account_id: 'abc' }],
    ['la fecha no es YYYY-MM-DD', { ...validBody, date: '18/05/2026' }],
    ['la descripción está vacía', { ...validBody, description: '' }],
    ['la categoría no está en el catálogo', { ...validBody, category_manual: 'cripto' }],
  ])('devuelve 400 sin tocar la BD si %s', async (_label, body) => {
    const { insert } = mockDb()

    const res = await POST(post(body))

    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'Invalid body' })
    expect(insert).not.toHaveBeenCalled()
  })

  it('devuelve 400 (no 500) y no registra el error si el body no es JSON', async () => {
    mockDb()

    const res = await POST(post('no-json'))

    expect(res.status).toBe(400)
    expect(logError).not.toHaveBeenCalled()
  })
})
