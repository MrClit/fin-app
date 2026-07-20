'use client'

import { createContext, useContext, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import type { Granularity } from '@/types'
import { DEFAULT_GRANULARITY, parseGranularity } from '@/lib/analytics'

interface AnalyticsContextValue {
  granularity: Granularity
  setGranularity: (g: Granularity) => void
}

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null)

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams()
  // Siembra desde la URL (?g=) para sobrevivir a un F5 y ser coherente en SSR;
  // el provider vive en el layout y no se desmonta al navegar lista⇄detalle,
  // así que el inicializador perezoso sólo corre en el montaje del segmento.
  const [granularity, setGranularityState] = useState<Granularity>(
    () => parseGranularity(searchParams.get('g')) ?? DEFAULT_GRANULARITY,
  )

  // Persiste la granularidad en la URL con replaceState (shallow): no remonta
  // el template ni re-dispara la animación de entrada del segmento (#315), y
  // preserva otros params como ?period=.
  function setGranularity(g: Granularity) {
    setGranularityState(g)
    const params = new URLSearchParams(window.location.search)
    params.set('g', g)
    window.history.replaceState(null, '', `?${params}`)
  }

  return (
    <AnalyticsContext.Provider value={{ granularity, setGranularity }}>
      {children}
    </AnalyticsContext.Provider>
  )
}

export function useAnalytics() {
  const ctx = useContext(AnalyticsContext)
  if (!ctx) throw new Error('useAnalytics must be used within AnalyticsProvider')
  return ctx
}
