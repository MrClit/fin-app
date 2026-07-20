/**
 * Utilidades de test para acceder a posiciones de array bajo
 * `noUncheckedIndexedAccess` (issue #270).
 *
 * Con el flag activo, `arr[0]` es `T | undefined`, así que afirmar sobre él
 * directamente no compila. Estos helpers estrechan el tipo fallando el test con
 * un mensaje que dice qué se esperaba y qué había, en vez del `Cannot read
 * properties of undefined` que saldría de un `!`.
 */

/** El elemento en la posición `i`, fallando el test si no existe. */
export function at<T>(items: readonly T[], i: number, what = 'elemento'): T {
  const item = items[i]
  if (item === undefined) {
    throw new Error(`Se esperaba ${what} en la posición ${i}; el array tiene ${items.length}`)
  }
  return item
}

/** Los argumentos de la llamada `i` a un mock de Vitest, fallando si no se llamó tantas veces. */
export function callAt<A extends unknown[]>(mockFn: { mock: { calls: A[] } }, i: number): A {
  return at(mockFn.mock.calls, i, 'llamada')
}
