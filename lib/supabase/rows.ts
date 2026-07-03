import type { AccountType, DataSource } from '@/types'

// Las columnas `type` (accounts) y `source` (accounts/transactions) se guardan
// como TEXT con un CHECK en Postgres, así que los tipos generados las dan como
// `string`. Este helper las estrecha a su unión de dominio en el borde de lectura
// de la BD, preservando el resto de columnas seleccionadas y estrechando sólo las
// presentes en la fila. El CHECK garantiza el valor; migrar esas columnas a enums
// de Postgres haría innecesario el assert (issue #241, ver #255).
type NarrowUnions<T> = Omit<T, 'type' | 'source'> &
  (T extends { type: string } ? { type: AccountType } : unknown) &
  (T extends { source: string } ? { source: DataSource } : unknown)

export function narrowUnions<T extends object>(row: T): NarrowUnions<T> {
  return row as NarrowUnions<T>
}
