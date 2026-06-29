import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { insertNotification, resolveScraperNotification } from './notifications'

const USER_ID = '00000000-0000-0000-0000-000000000001'

// Mock mínimo del builder de Supabase para insertNotification: la consulta de
// dedup encadena select().eq().eq().eq().is().gte().limit().maybeSingle(); el alta
// usa insert(). Ambos cuelgan del resultado de from().
function buildDb({
  existing = null,
  dedupeError = null,
  insertError = null,
}: {
  existing?: { id: string } | null
  dedupeError?: unknown
  insertError?: unknown
} = {}) {
  const captured: { inserted: Record<string, unknown> | null } = { inserted: null }
  const builder: Record<string, unknown> = {}
  Object.assign(builder, {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    is: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    maybeSingle: vi.fn(() => Promise.resolve({ data: existing, error: dedupeError })),
    insert: vi.fn((row: Record<string, unknown>) => {
      captured.inserted = row
      return Promise.resolve({ error: insertError })
    }),
  })
  const db = { from: vi.fn(() => builder) }
  return { db: db as unknown as SupabaseClient, builder, captured }
}

describe('resolveScraperNotification', () => {
  it('devuelve el contenido para combinaciones conocidas', () => {
    expect(resolveScraperNotification('edenred', '2fa')).toMatchObject({
      title: 'Edenred requiere 2FA',
      url: '/accounts',
    })
    expect(resolveScraperNotification('sabadell_visa', 'session_expired')?.title).toBe(
      'Sabadell VISA: sesión caducada'
    )
  })

  it('devuelve null para source o kind no soportados', () => {
    expect(resolveScraperNotification('edenred', 'unknown')).toBeNull()
    expect(resolveScraperNotification('unknown', '2fa')).toBeNull()
    // sabadell_visa no tiene 2fa en el catálogo.
    expect(resolveScraperNotification('sabadell_visa', '2fa')).toBeNull()
  })
})

const INPUT = {
  source: 'edenred',
  kind: 'session_expired',
  title: 'Edenred: sesión caducada',
  body: 'Ejecuta «pnpm scrape:edenred:login» para regenerar la sesión.',
  url: '/accounts',
} as const

describe('insertNotification', () => {
  it('inserta cuando no hay duplicado no leído y devuelve true', async () => {
    const { db, captured } = buildDb({ existing: null })
    const result = await insertNotification(db, USER_ID, INPUT)
    expect(result).toBe(true)
    expect(captured.inserted).toEqual({
      user_id: USER_ID,
      source: 'edenred',
      kind: 'session_expired',
      title: INPUT.title,
      body: INPUT.body,
      url: '/accounts',
    })
  })

  it('deduplica: si ya existe una no leída reciente del mismo tipo, no inserta', async () => {
    const { db, builder, captured } = buildDb({ existing: { id: 'abc' } })
    const result = await insertNotification(db, USER_ID, INPUT)
    expect(result).toBe(false)
    expect(captured.inserted).toBeNull()
    expect(builder.insert).not.toHaveBeenCalled()
  })

  it('devuelve false (sin lanzar) si la consulta de dedup falla', async () => {
    const { db, builder } = buildDb({ dedupeError: { message: 'boom' } })
    const result = await insertNotification(db, USER_ID, INPUT)
    expect(result).toBe(false)
    expect(builder.insert).not.toHaveBeenCalled()
  })

  it('devuelve false (sin lanzar) si el insert falla', async () => {
    const { db } = buildDb({ existing: null, insertError: { message: 'boom' } })
    const result = await insertNotification(db, USER_ID, INPUT)
    expect(result).toBe(false)
  })
})
