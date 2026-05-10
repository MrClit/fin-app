'use client'

import { useEffect, useState } from 'react'
import type { AnalyticsResponse } from '@/types'
import { useAnalytics } from '@/contexts/AnalyticsContext'
import { PERIOD_LABELS } from '@/lib/analytics'
import GranPicker from './GranPicker'
import SavingsCard from './SavingsCard'

function CalendarIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function SavingsCardSkeleton() {
  return (
    <div
      className="animate-pulse"
      style={{ background: 'var(--secondary)', borderRadius: 20, padding: 20, height: 120 }}
    />
  )
}

export default function AnalyticsClient() {
  const { gran, showPicker, setShowPicker } = useAnalytics()
  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setData(null)
    fetch(`/api/analytics?gran=${gran}&offset=0`)
      .then(r => r.json())
      .then((d: AnalyticsResponse) => {
        setData(d)
        setLoading(false)
      })
  }, [gran])

  const current = data?.periods[data.periods.length - 1]

  return (
    <div>
      {/* Sticky header */}
      <div
        className="sticky top-0 z-50 flex items-center justify-between border-b border-border px-5 pb-3.5"
        style={{
          background: 'color-mix(in srgb, var(--background) 92%, transparent)',
          backdropFilter: 'blur(16px)',
          paddingTop: 52,
        }}
      >
        <span className="text-xl font-bold text-foreground">Análisis</span>
        <button
          onClick={() => setShowPicker(true)}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 cursor-pointer"
          style={{
            background: 'color-mix(in srgb, #6366f1 12%, transparent)',
            border: '1px solid color-mix(in srgb, #6366f1 27%, transparent)',
            color: '#6366f1',
          }}
        >
          <CalendarIcon />
          <span className="text-xs font-bold">{PERIOD_LABELS[gran]}</span>
          <span className="text-[10px] opacity-70">▾</span>
        </button>
      </div>

      {/* Content */}
      <div className="px-5 py-3 flex flex-col gap-4">
        {loading || !current ? (
          <SavingsCardSkeleton />
        ) : (
          <SavingsCard ingresos={current.ingresos} ahorro={current.ahorro} gran={gran} />
        )}
      </div>

      {showPicker && <GranPicker />}
    </div>
  )
}
