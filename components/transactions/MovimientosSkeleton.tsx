import { Skeleton } from '@/components/ui/skeleton'

export function MovimientosSkeleton() {
  return (
    <div className="px-5 pt-3 pb-6 flex flex-col gap-4">
      {/* Título */}
      <Skeleton className="h-7 w-40" />
      {/* Toolbar (búsqueda + filtros) */}
      <Skeleton className="h-10 rounded-xl" />
      {/* 5 filas con la misma altura que TxRow */}
      <div className="flex flex-col gap-2">
        {[0, 1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-15.5 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
