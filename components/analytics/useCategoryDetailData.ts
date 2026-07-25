'use client'

import { useCallback, useEffect, useState } from 'react'
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
  // Fetch caído (sin red o SW sin respuesta, #387). Sin esto la pantalla se quedaba
  // en skeleton indefinidamente y el rechazo quedaba sin capturar.
  const [periodsError, setPeriodsError] = useState(false)
  const [txsError, setTxsError] = useState(false)
  // Bumpea al reintentar: reejecuta ambos fetch sin cambiar categoría ni período.
  const [reloadKey, setReloadKey] = useState(0)
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
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(d => {
        if (!cancelled) {
          const ps: CategoryPeriodData[] = d.periods ?? []
          // Selecciona el período de origen si está en la ventana; si no (más
          // antiguo que los últimos mostrados) o sin param, el más reciente.
          const fromParam = periodParam ? ps.findIndex(p => p.start === periodParam) : -1
          setPeriods(ps)
          setSelectedBarIdx(fromParam >= 0 ? fromParam : ps.length - 1)
          setLoadingPeriods(false)
          setPeriodsError(false)
        }
      })
      .catch(err => {
        console.error('[useCategoryDetailData] no se pudieron cargar los períodos', err)
        if (cancelled) return
        setPeriodsError(true)
        setLoadingPeriods(false)
        // `periods` se queda vacío, así que el fetch de movimientos no llega a
        // dispararse nunca: hay que bajar su loading aquí o su lista también se
        // quedaría en skeleton.
        setLoadingTxs(false)
      })
    return () => { cancelled = true }
  }, [granularity, categoryId, periodParam, reloadKey])

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
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(d => {
        if (!cancelled) {
          replaceTxs(d.data ?? [])
          setLoadingTxs(false)
          setTxsError(false)
        }
      })
      .catch(err => {
        console.error('[useCategoryDetailData] no se pudieron cargar los movimientos', err)
        if (cancelled) return
        setTxsError(true)
        setLoadingTxs(false)
      })
    return () => { cancelled = true }
  }, [selectedBarIdx, periods, categoryId, replaceTxs, reloadKey])

  // Reintento manual: limpia los errores y relanza ambos fetch.
  const reload = useCallback(() => {
    setPeriodsError(false)
    setTxsError(false)
    setLoadingPeriods(true)
    setLoadingTxs(true)
    setReloadKey(k => k + 1)
  }, [])

  return {
    periods,
    selectedBarIdx,
    setSelectedBarIdx,
    loadingPeriods,
    loadingTxs,
    periodsError,
    txsError,
    reload,
    transactions,
    deleteTx,
    recategorize,
    markRead,
    markUnread,
  }
}
