/**
 * Cliente Supabase falso para testear las funciones de datos de `lib/` (issue #306).
 *
 * Como esas funciones reciben el cliente por parámetro, no hace falta `vi.mock` de
 * ningún módulo: se les pasa este doble, que registra la cadena de llamadas
 * (`.eq()`, `.gte()`, `.order()`…) para poder afirmar sobre la query construida, y
 * devuelve lo que diga el `responder`.
 */

export interface FakeCall {
  method: string
  args: unknown[]
}

export interface FakeQuery {
  table: string
  calls: FakeCall[]
}

/** Argumentos de la primera llamada a `method`, o `undefined` si no se llamó. */
export function argsOf(query: FakeQuery, method: string): unknown[] | undefined {
  return query.calls.find(c => c.method === method)?.args
}

/** `true` si la cadena incluyó una llamada a `method`. */
export function called(query: FakeQuery, method: string): boolean {
  return query.calls.some(c => c.method === method)
}

export type FakeResult = { data?: unknown; error?: unknown; count?: number }

/**
 * Devuelve un cliente encadenable y la lista de queries que se han construido con
 * él, en orden. `responder` recibe la query ya completa (tabla + cadena de
 * llamadas) y decide qué resuelve el `await`.
 */
export function createFakeSupabase(responder: (query: FakeQuery) => FakeResult) {
  const queries: FakeQuery[] = []

  const from = (table: string) => {
    const query: FakeQuery = { table, calls: [] }
    queries.push(query)

    const builder: Record<string | symbol, unknown> = new Proxy(
      {},
      {
        get(_target, prop) {
          // El `await` de la cadena dispara el responder con la query completa.
          if (prop === 'then') {
            const result = responder(query)
            return (onFulfilled: (v: FakeResult) => unknown, onRejected: (e: unknown) => unknown) =>
              Promise.resolve({ data: null, error: null, ...result }).then(onFulfilled, onRejected)
          }
          return (...args: unknown[]) => {
            query.calls.push({ method: String(prop), args })
            return builder
          }
        },
      }
    )

    return builder
  }

  return { supabase: { from } as never, queries }
}
