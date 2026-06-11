'use client'

import { useCallback, useRef, useState } from 'react'
import { buildPaginationParams, type TransactionCursor } from '@/lib/pagination'
import type { TransactionWithAccount } from '@/types'

const PAGE_SIZE = 200

interface UseTxPaginationArgs {
  initialCursor: TransactionCursor | null
  appendTxs: (items: TransactionWithAccount[]) => void
}

export function useTxPagination({ initialCursor, appendTxs }: UseTxPaginationArgs) {
  const [cursor, setCursor] = useState<TransactionCursor | null>(initialCursor)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Evita disparos concurrentes del IntersectionObserver mientras el fetch está en vuelo.
  const inFlight = useRef(false)

  const loadMore = useCallback(async () => {
    if (inFlight.current || !cursor) return
    inFlight.current = true
    setLoading(true)
    setError(null)
    try {
      const params = buildPaginationParams(cursor, { limit: PAGE_SIZE })
      const res = await fetch(`/api/transactions?${params.toString()}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json() as {
        data: TransactionWithAccount[]
        meta: { count: number; nextCursor: TransactionCursor | null }
      }
      appendTxs(json.data ?? [])
      setCursor(json.meta?.nextCursor ?? null)
    } catch (err) {
      console.error('[useTxPagination.loadMore]', err)
      setError('No se pudieron cargar más movimientos')
    } finally {
      inFlight.current = false
      setLoading(false)
    }
  }, [cursor, appendTxs])

  return {
    loadMore,
    hasMore: cursor !== null,
    loading,
    error,
  }
}
