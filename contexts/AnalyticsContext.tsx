'use client'

import { createContext, useContext, useState } from 'react'
import type { Granularity } from '@/types'

interface AnalyticsContextValue {
  gran: Granularity
  setGran: (g: Granularity) => void
  showPicker: boolean
  setShowPicker: (v: boolean) => void
}

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null)

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const [gran, setGran] = useState<Granularity>('month')
  const [showPicker, setShowPicker] = useState(false)

  return (
    <AnalyticsContext.Provider value={{ gran, setGran, showPicker, setShowPicker }}>
      {children}
    </AnalyticsContext.Provider>
  )
}

export function useAnalytics() {
  const ctx = useContext(AnalyticsContext)
  if (!ctx) throw new Error('useAnalytics must be used within AnalyticsProvider')
  return ctx
}
