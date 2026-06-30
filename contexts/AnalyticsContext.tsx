'use client'

import { createContext, useContext, useState } from 'react'
import type { Granularity } from '@/types'
import { DEFAULT_GRANULARITY } from '@/lib/analytics'

interface AnalyticsContextValue {
  granularity: Granularity
  setGranularity: (g: Granularity) => void
  showPicker: boolean
  setShowPicker: (v: boolean) => void
}

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null)

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const [granularity, setGranularity] = useState<Granularity>(DEFAULT_GRANULARITY)
  const [showPicker, setShowPicker] = useState(false)

  return (
    <AnalyticsContext.Provider value={{ granularity, setGranularity, showPicker, setShowPicker }}>
      {children}
    </AnalyticsContext.Provider>
  )
}

export function useAnalytics() {
  const ctx = useContext(AnalyticsContext)
  if (!ctx) throw new Error('useAnalytics must be used within AnalyticsProvider')
  return ctx
}
