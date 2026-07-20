'use client'

import { useEffect, useState } from 'react'
import { useTxMutations } from '@/components/transactions/useTxMutations'
import type { CategoryId, CategoryPeriodData, Granularity } from '@/types'

// Datos del detalle de categoría: la ventana de 6 períodos de la gráfica y las
// transacciones del período seleccionado. Las mutaciones vienen de
// useTxMutations (#311): optimistas con rollback + toast de reintento, y ajuste
// del badge de no leídas. La lista se siembra vacía y se reemplaza con cada
// fetch de período (replaceTxs).
export function useCategoryDetailData(
  categoryId: CategoryId,
  granularity: Granularity,
  periodParam: string | null,
) {
  const [periods, setPeriods] = useState<CategoryPeriodData[]>([])
  const [selectedBarIdx, setSelectedBarIdx] = useState(5)
  const [loadingPeriods, setLoadingPeriods] = useState(true)
  const [loadingTxs, setLoadingTxs] = useState(true)
  const { transactions, replaceTxs, deleteTx, recategorize, markRead, markUnread } =
    useTxMutations([])

  // Mark loading during render when inputs change (React 19: setState in effect body is disallowed)
  const periodsKey = `${granularity}|${categoryId}`
  const [lastPeriodsKey, setLastPeriodsKey] = useState(periodsKey)
  if (periodsKey !== lastPeriodsKey) {
    setLastPeriodsKey(periodsKey)
    setLoadingPeriods(true)
  }

  // Fetch 6-period chart data when granularity changes
  useEffect(() => {
    let cancelled = false
    fetch(`/api/analytics/category?id=${categoryId}&granularity=${granularity}`)
      .then(r => r.json())
      .then(d => {
        if (!cancelled) {
          const ps: CategoryPeriodData[] = d.periods ?? []
          // Selecciona el período de origen si está en la ventana; si no (más
          // antiguo que los últimos mostrados) o sin param, el más reciente.
          const fromParam = periodParam ? ps.findIndex(p => p.start === periodParam) : -1
          setPeriods(ps)
          setSelectedBarIdx(fromParam >= 0 ? fromParam : ps.length - 1)
          setLoadingPeriods(false)
        }
      })
    return () => { cancelled = true }
  }, [granularity, categoryId, periodParam])

  const selectedPeriodForKey = periods[selectedBarIdx]
  const txsKey = selectedPeriodForKey
    ? `${categoryId}|${selectedPeriodForKey.start}|${selectedPeriodForKey.end}`
    : null
  const [lastTxsKey, setLastTxsKey] = useState<string | null>(txsKey)
  if (txsKey && txsKey !== lastTxsKey) {
    setLastTxsKey(txsKey)
    setLoadingTxs(true)
  }

  // Fetch transactions when selected bar or periods change
  useEffect(() => {
    if (periods.length === 0) return
    const period = periods[selectedBarIdx]
    if (!period) return
    let cancelled = false
    fetch(
      `/api/transactions?category=${categoryId}&dateFrom=${period.start}&dateTo=${period.end}&limit=500`
    )
      .then(r => r.json())
      .then(d => {
        if (!cancelled) {
          replaceTxs(d.data ?? [])
          setLoadingTxs(false)
        }
      })
    return () => { cancelled = true }
  }, [selectedBarIdx, periods, categoryId, replaceTxs])

  return {
    periods,
    selectedBarIdx,
    setSelectedBarIdx,
    loadingPeriods,
    loadingTxs,
    transactions,
    deleteTx,
    recategorize,
    markRead,
    markUnread,
  }
}
