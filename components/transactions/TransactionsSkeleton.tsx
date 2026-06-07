import { Skeleton } from '@/components/ui/skeleton'

export function TransactionsSkeleton() {
  return (
    <div className="px-4 pt-3 pb-6 flex flex-col gap-4">
      {/* Título */}
      <Skeleton className="h-7 w-40" />
      {/* Búsqueda */}
      <Skeleton className="h-10 rounded-[14px]" />
      {/* Selector de cuenta (ancho completo) */}
      <Skeleton className="h-10 rounded-[14px]" />
      {/* Pills de tipo (Todos / Ingresos / Gastos / No Computable) */}
      <div className="flex items-center gap-2">
        {['w-16', 'w-20', 'w-16', 'w-32'].map((w, i) => (
          <Skeleton key={i} className={`h-7 rounded-full ${w}`} />
        ))}
      </div>
      {/* Filas a ancho completo con la misma altura que TxRow (coincide con la
          lista real). Suficientes para llenar la pantalla hasta abajo. */}
      <div className="-mx-4 flex flex-col gap-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-15.5 rounded-none border-y border-border" />
        ))}
      </div>
    </div>
  )
}
