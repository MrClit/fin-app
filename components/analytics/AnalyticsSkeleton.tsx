import { Skeleton } from '@/components/ui/skeleton'

function CardSkeleton({ height = 120 }: { height?: number }) {
  return <Skeleton className="-mx-4 rounded-none border-y border-border" style={{ height }} />
}

/**
 * Estado de carga de ruta para /analytics. Replica la estructura de
 * AnalyticsClient (header sticky + tarjetas) para que no haya salto de layout
 * al llegar el contenido real. Se sirve vía app/(app)/analytics/loading.tsx.
 */
export function AnalyticsSkeleton() {
  return (
    <div>
      {/* Sticky header — mismo encuadre que AnalyticsClient */}
      <div
        className="sticky z-30 border-b border-border px-4 pt-3 pb-3"
        style={{
          top: 'calc(env(safe-area-inset-top) + 3rem)',
          background: 'color-mix(in srgb, var(--background) 92%, transparent)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-xl font-bold text-foreground">Análisis</span>
          <Skeleton className="h-7 w-24 rounded-full" />
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-3 px-4 py-3">
        {/* KPI row */}
        <CardSkeleton />
        {/* Chart card */}
        <CardSkeleton height={220} />
        {/* Category breakdown */}
        <CardSkeleton height={420} />
        {/* Savings card */}
        <CardSkeleton />
      </div>
    </div>
  )
}
