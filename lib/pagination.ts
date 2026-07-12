export interface TransactionCursor {
  date: string
  id: string
}

export function buildPaginationParams(
  cursor: TransactionCursor | null,
  extras: Record<string, string | number | undefined> = {},
): URLSearchParams {
  const params = new URLSearchParams()
  if (cursor) {
    params.set('before_date', cursor.date)
    params.set('before_id', cursor.id)
  }
  for (const [key, value] of Object.entries(extras)) {
    if (value === undefined || value === '') continue
    params.set(key, String(value))
  }
  return params
}
