import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getCurrentUser, getCurrentHouseholdId, getRequestClient } from '@/lib/auth/session'
import { logError } from '@/lib/error-log'
import { argsOf, called, createFakeSupabase, queryAt } from '@/tests/supabase-fake'
import type { FakeQuery, FakeResult } from '@/tests/supabase-fake'
import type { CreateTransactionBody } from '@/lib/schemas/transactions'

vi.mock('@/lib/auth/session', () => ({
  getCurrentUser: vi.fn(),
  getCurrentHouseholdId: vi.fn(),
  getRequestClient: vi.fn(),
}))

vi.mock('@/lib/error-log', () => ({
  logError: vi.fn(async () => {}),
}))

const {
  createTransaction,
  updateTransaction,
  deleteTransaction,
  countSimilarTransactions,
  applyCategoryToSimilar,
} = await import('./transactions')

const USER_ID = '00000000-0000-0000-0000-000000000001'
const HOUSEHOLD_ID = '00000000-0000-0000-0000-0000000000a1'
const ACCOUNT_ID = '00000000-0000-0000-0000-0000000000b1'
const TX_ID = '00000000-0000-0000-0000-0000000000c1'

function mockDb(responder: (query: FakeQuery) => FakeResult) {
  const { supabase, queries } = createFakeSupabase(responder)
  vi.mocked(getRequestClient).mockResolvedValue(supabase)
  return { queries }
}

/** Los pares `eq(columna, valor)` de la cadena, en orden. */
function eqFilters(query: FakeQuery): unknown[][] {
  return query.calls.filter(c => c.method === 'eq').map(c => c.args)
}

/** El modal puede no enviar categoría; el resto de campos son obligatorios. */
const bodySinCategoria = {
  amount: -42.5,
  description: 'Compra',
  date: '2026-05-18',
  account_id: ACCOUNT_ID,
}

const validBody = { ...bodySinCategoria, category_manual: 'groceries' } as CreateTransactionBody

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.mocked(getCurrentUser).mockResolvedValue({
    id: USER_ID,
  } as unknown as Awaited<ReturnType<typeof getCurrentUser>>)
  vi.mocked(getCurrentHouseholdId).mockResolvedValue(HOUSEHOLD_ID)
})

describe('createTransaction', () => {
  it('crea el movimiento con los campos forzados y devuelve la fila', async () => {
    const { queries } = mockDb(q => ({ data: { id: TX_ID, ...(argsOf(q, 'insert')![0] as object) } }))

    const res = await createTransaction(validBody)

    expect(res.error).toBeUndefined()
    expect(res.data).toMatchObject({ id: TX_ID, amount: -42.5 })
    expect(argsOf(queryAt(queries, 0), 'insert')![0]).toEqual({
      user_id: USER_ID,
      household_id: HOUSEHOLD_ID,
      account_id: ACCOUNT_ID,
      amount: -42.5,
      description: 'Compra',
      date: '2026-05-18',
      category_manual: 'groceries',
      // «Compra» es sólo trámite: no deja clave de comercio (#359).
      description_key: null,
      description_key_root: null,
      source: 'manual',
      is_read: true,
    })
    // La fila vuelve con la cuenta embebida: es la forma que consume la UI.
    expect(argsOf(queryAt(queries, 0), 'select')).toEqual(['*, account:accounts(id, name, color)'])
  })

  it('acepta el importe 0 (issue #308: el chequeo por falsy lo rechazaba)', async () => {
    const { queries } = mockDb(() => ({ data: { id: TX_ID } }))

    const res = await createTransaction({ ...validBody, amount: 0 })

    expect(res.error).toBeUndefined()
    expect(argsOf(queryAt(queries, 0), 'insert')![0]).toMatchObject({ amount: 0 })
  })

  it('guarda la categoría como null cuando no viene', async () => {
    const { queries } = mockDb(() => ({ data: { id: TX_ID } }))

    await createTransaction(bodySinCategoria as CreateTransactionBody)

    expect(argsOf(queryAt(queries, 0), 'insert')![0]).toMatchObject({ category_manual: null })
  })

  it.each([
    ['el importe no es numérico', { ...validBody, amount: 'abc' }],
    ['la cuenta no es un UUID', { ...validBody, account_id: 'abc' }],
    ['la fecha no es YYYY-MM-DD', { ...validBody, date: '18/05/2026' }],
    ['la descripción está vacía', { ...validBody, description: '' }],
    ['la categoría no está en el catálogo', { ...validBody, category_manual: 'cripto' }],
  ])('devuelve invalid_input sin tocar la BD si %s', async (_label, body) => {
    const { queries } = mockDb(() => ({ data: null }))

    const res = await createTransaction(body as CreateTransactionBody)

    expect(res.error).toMatchObject({ code: 'invalid_input' })
    expect(res.error!.issues!.length).toBeGreaterThan(0)
    expect(queries).toHaveLength(0)
    expect(logError).not.toHaveBeenCalled()
  })

  it('devuelve unauthorized sin sesión', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null)
    const { queries } = mockDb(() => ({ data: null }))

    const res = await createTransaction(validBody)

    expect(res.error).toEqual({ code: 'unauthorized' })
    expect(queries).toHaveLength(0)
  })
})

describe('updateTransaction', () => {
  it('escribe solo los campos presentes, filtrando por id y hogar', async () => {
    const { queries } = mockDb(() => ({ data: { id: TX_ID, is_read: true } }))

    const res = await updateTransaction(TX_ID, { is_read: true })

    expect(res.error).toBeUndefined()
    expect(res.data).toMatchObject({ id: TX_ID })
    expect(argsOf(queryAt(queries, 0), 'update')).toEqual([{ is_read: true }])
    expect(eqFilters(queryAt(queries, 0))).toEqual([
      ['id', TX_ID],
      ['household_id', HOUSEHOLD_ID],
    ])
  })

  it('acepta category_manual null ("sin categoría")', async () => {
    const { queries } = mockDb(() => ({ data: { id: TX_ID } }))

    const res = await updateTransaction(TX_ID, { category_manual: null })

    expect(res.error).toBeUndefined()
    expect(argsOf(queryAt(queries, 0), 'update')).toEqual([{ category_manual: null }])
  })

  it('devuelve invalid_input con el body vacío, sin tocar la BD', async () => {
    const { queries } = mockDb(() => ({ data: null }))

    const res = await updateTransaction(TX_ID, {})

    expect(res.error).toMatchObject({ code: 'invalid_input' })
    expect(queries).toHaveLength(0)
  })

  it('devuelve invalid_input si el id no es un UUID', async () => {
    const { queries } = mockDb(() => ({ data: null }))

    const res = await updateTransaction('abc', { is_read: true })

    expect(res.error).toMatchObject({ code: 'invalid_input' })
    expect(queries).toHaveLength(0)
  })

  it('devuelve server_error y registra el fallo si la BD falla', async () => {
    mockDb(() => ({ data: null, error: { message: 'boom', code: 'XX000' } }))

    const res = await updateTransaction(TX_ID, { is_read: true })

    expect(res.error).toEqual({ code: 'server_error' })
    expect(logError).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'server',
        route: 'actions/transactions#updateTransaction',
        userId: USER_ID,
        householdId: HOUSEHOLD_ID,
      })
    )
  })
})

describe('deleteTransaction', () => {
  it('borra un movimiento manual, filtrando por id y hogar', async () => {
    const { queries } = mockDb(q =>
      called(q, 'single') ? { data: { source: 'manual' } } : { data: null }
    )

    const res = await deleteTransaction(TX_ID)

    expect(res.error).toBeUndefined()
    expect(res.data).toEqual({ id: TX_ID })
    expect(called(queryAt(queries, 1), 'delete')).toBe(true)
    expect(eqFilters(queryAt(queries, 1))).toEqual([
      ['id', TX_ID],
      ['household_id', HOUSEHOLD_ID],
    ])
  })

  it('devuelve not_found si la fila no existe', async () => {
    const { queries } = mockDb(() => ({ data: null }))

    const res = await deleteTransaction(TX_ID)

    expect(res.error).toEqual({ code: 'not_found' })
    expect(queries).toHaveLength(1)
  })

  it('devuelve imported_transaction sin borrar si el movimiento no es manual', async () => {
    const { queries } = mockDb(() => ({ data: { source: 'enablebanking' } }))

    const res = await deleteTransaction(TX_ID)

    expect(res.error).toEqual({ code: 'imported_transaction' })
    expect(queries.some(q => called(q, 'delete'))).toBe(false)
  })

  it('devuelve invalid_input si el id no es un UUID', async () => {
    const { queries } = mockDb(() => ({ data: null }))

    const res = await deleteTransaction('abc')

    expect(res.error).toMatchObject({ code: 'invalid_input' })
    expect(queries).toHaveLength(0)
  })
})

// ── Aplicación retroactiva de una corrección (issue #359) ──────────────────────
//
// Ambas acciones hacen dos consultas: la 0 resuelve la clave del movimiento y la
// 1 cuenta o actualiza. `keysOf` responde a la primera.

/** Los pares `is(columna, valor)` de la cadena, en orden. */
function isFilters(query: FakeQuery): unknown[][] {
  return query.calls.filter(c => c.method === 'is').map(c => c.args)
}

function mockScope(
  keys: { description_key: string | null; description_key_root: string | null } | null,
  last: FakeResult = {},
  /** Correcciones manuales ya existentes bajo la raíz, que deciden si se usa. */
  votes: { category_manual: string }[] = []
) {
  let call = -1
  return mockDb(() => {
    call++
    if (call === 0) return { data: keys }
    // Con raíz hay una consulta intermedia de votos; sin ella se salta.
    if (call === 1 && keys?.description_key_root) return { data: votes }
    return last
  })
}

/** Índice de la consulta que cuenta o actualiza: la última de la cadena. */
const lastQuery = (queries: FakeQuery[]) => queryAt(queries, queries.length - 1)

describe('countSimilarTransactions', () => {
  it('cuenta por la raíz, que es la que agrupa el comercio en todas sus ciudades', async () => {
    const { queries } = mockScope(
      { description_key: 'mercadona sant boi', description_key_root: 'mercadona' },
      { count: 87 },
      [{ category_manual: 'groceries' }, { category_manual: 'groceries' }]
    )

    const res = await countSimilarTransactions(TX_ID, 'groceries')

    expect(res.data).toEqual({
      count: 87,
      key: 'mercadona',
      level: 'root',
      label: 'MERCADONA',
    })
    expect(eqFilters(lastQuery(queries))).toEqual([
      ['household_id', HOUSEHOLD_ID],
      ['description_key_root', 'mercadona'],
    ])
  })

  it('cae a la clave exacta si el hogar NO respalda que la raíz sea esa categoría', async () => {
    // Caso real del hogar: la raíz `prat` es el topónimo, y sus correcciones se
    // reparten entre categorías. Ofrecer cambiar por raíz arrastraría decenas de
    // movimientos sin relación.
    const { queries } = mockScope(
      { description_key: 'prat espais aeroport', description_key_root: 'prat' },
      { count: 3 },
      [
        { category_manual: 'parking' },
        { category_manual: 'fuel' },
        { category_manual: 'restaurant' },
        { category_manual: 'transport' },
      ]
    )

    const res = await countSimilarTransactions(TX_ID, 'parking')

    expect(res.data).toMatchObject({ key: 'prat espais aeroport', level: 'exact' })
    expect(eqFilters(lastQuery(queries))).toEqual([
      ['household_id', HOUSEHOLD_ID],
      ['description_key', 'prat espais aeroport'],
    ])
  })

  it('usa la raíz cuando es la primera corrección de ese comercio', async () => {
    // Sin evidencia en contra, el acuerdo es 1,0: es lo que hace que corregir el
    // primer Mercadona arregle los de todas las ciudades.
    const { queries } = mockScope(
      { description_key: 'mercadona gava', description_key_root: 'mercadona' },
      { count: 12 },
      [{ category_manual: 'groceries' }]
    )

    const res = await countSimilarTransactions(TX_ID, 'groceries')

    expect(res.data).toMatchObject({ level: 'root', count: 12 })
    expect(eqFilters(lastQuery(queries))).toEqual([
      ['household_id', HOUSEHOLD_ID],
      ['description_key_root', 'mercadona'],
    ])
  })

  it('cae a la exacta si la corrección contradice al histórico de la raíz', async () => {
    // Un Mercadona marcado como Restaurante no debe proponer mover los otros 82.
    mockScope(
      { description_key: 'mercadona gava', description_key_root: 'mercadona' },
      { count: 1 },
      [
        { category_manual: 'restaurant' },
        { category_manual: 'groceries' },
        { category_manual: 'groceries' },
        { category_manual: 'groceries' },
      ]
    )

    const res = await countSimilarTransactions(TX_ID, 'restaurant')

    expect(res.data).toMatchObject({ level: 'exact', key: 'mercadona gava' })
  })

  it('cae a la clave exacta cuando la raíz no aporta un segundo nivel', async () => {
    const { queries } = mockScope(
      { description_key: 'glovo', description_key_root: null },
      { count: 4 }
    )

    const res = await countSimilarTransactions(TX_ID, 'restaurant')

    expect(res.data).toMatchObject({ count: 4, key: 'glovo', level: 'exact' })
    expect(eqFilters(lastQuery(queries))).toEqual([
      ['household_id', HOUSEHOLD_ID],
      ['description_key', 'glovo'],
    ])
  })

  it('NUNCA cuenta filas con category_manual: son decisiones humanas', async () => {
    const { queries } = mockScope(
      { description_key: 'glovo', description_key_root: null },
      { count: 0 }
    )

    await countSimilarTransactions(TX_ID, 'restaurant')

    expect(isFilters(lastQuery(queries))).toEqual([['category_manual', null]])
  })

  it('excluye el propio movimiento y los que ya tienen esa categoría', async () => {
    const { queries } = mockScope(
      { description_key: 'glovo', description_key_root: null },
      { count: 0 }
    )

    await countSimilarTransactions(TX_ID, 'restaurant')

    expect(argsOf(lastQuery(queries), 'neq')).toEqual(['id', TX_ID])
    expect(argsOf(lastQuery(queries), 'or')).toEqual(['category.is.null,category.neq.restaurant'])
  })

  it('devuelve 0 sin consultar si el descriptor no dejó clave', async () => {
    const { queries } = mockScope({ description_key: null, description_key_root: null })

    const res = await countSimilarTransactions(TX_ID, 'restaurant')

    expect(res.data).toMatchObject({ count: 0 })
    expect(queries).toHaveLength(1)
  })

  it('devuelve 0 si el movimiento no existe o es de otro hogar', async () => {
    const { queries } = mockScope(null)

    const res = await countSimilarTransactions(TX_ID, 'restaurant')

    expect(res.data).toMatchObject({ count: 0 })
    expect(queries).toHaveLength(1)
  })

  it.each([
    ['id no UUID', 'abc', 'groceries'],
    ['categoría fuera del catálogo', TX_ID, 'inventada'],
  ])('devuelve invalid_input con %s, sin tocar la BD', async (_caso, id, category) => {
    const { queries } = mockDb(() => ({ data: null }))

    const res = await countSimilarTransactions(id, category)

    expect(res.error).toMatchObject({ code: 'invalid_input' })
    expect(queries).toHaveLength(0)
  })
})

describe('applyCategoryToSimilar', () => {
  it('escribe en category —NUNCA en category_manual— y sólo sobre filas sin corregir', async () => {
    const { queries } = mockScope(
      { description_key: 'mercadona sant boi', description_key_root: 'mercadona' },
      { data: [{ id: 'a' }, { id: 'b' }] },
      [{ category_manual: 'groceries' }]
    )

    const res = await applyCategoryToSimilar(TX_ID, 'groceries')

    expect(res.data).toEqual({ updated: 2 })
    const patch = argsOf(lastQuery(queries), 'update')![0]
    expect(patch).toEqual({ category: 'groceries' })
    expect(patch).not.toHaveProperty('category_manual')
    expect(isFilters(lastQuery(queries))).toEqual([['category_manual', null]])
  })

  it('acota el UPDATE al hogar y a la clave, y excluye el propio movimiento', async () => {
    const { queries } = mockScope(
      { description_key: 'glovo', description_key_root: null },
      { data: [] }
    )

    await applyCategoryToSimilar(TX_ID, 'restaurant')

    expect(eqFilters(lastQuery(queries))).toEqual([
      ['household_id', HOUSEHOLD_ID],
      ['description_key', 'glovo'],
    ])
    expect(argsOf(lastQuery(queries), 'neq')).toEqual(['id', TX_ID])
  })

  it('no actualiza nada si el descriptor no dejó clave', async () => {
    const { queries } = mockScope({ description_key: null, description_key_root: null })

    const res = await applyCategoryToSimilar(TX_ID, 'restaurant')

    expect(res.data).toEqual({ updated: 0 })
    expect(queries).toHaveLength(1)
  })

  it('devuelve invalid_input si la categoría no es del catálogo, sin tocar la BD', async () => {
    const { queries } = mockDb(() => ({ data: null }))

    const res = await applyCategoryToSimilar(TX_ID, 'inventada')

    expect(res.error).toMatchObject({ code: 'invalid_input' })
    expect(queries).toHaveLength(0)
  })

  it('devuelve server_error y registra el fallo si el UPDATE falla', async () => {
    mockScope(
      { description_key: 'glovo', description_key_root: null },
      { data: null, error: { message: 'boom', code: 'XX000' } }
    )

    const res = await applyCategoryToSimilar(TX_ID, 'restaurant')

    expect(res.error).toMatchObject({ code: 'server_error' })
    expect(logError).toHaveBeenCalled()
  })
})
