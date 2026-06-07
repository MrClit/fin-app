import { Skeleton } from '@/components/ui/skeleton'

export function AccountsSkeleton() {
  return (
    <div className="px-4 pt-3 pb-6 flex flex-col gap-4">
      {/* Título */}
      <Skeleton className="mb-2 h-7 w-28" />
      {/* Filas de cuenta a ancho completo (coincide con la lista real) */}
      <div className="-mx-4 flex flex-col border-y border-border divide-y divide-border">
        {[0, 1, 2].map(i => (
          <Skeleton key={i} className="h-47.5 rounded-none" />
        ))}
      </div>
      {/* Botón conectar banco */}
      <Skeleton className="h-12 rounded-2xl" />
    </div>
  )
}
