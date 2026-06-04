import { Skeleton } from '@/components/ui/skeleton'

export function AccountsSkeleton() {
  return (
    <div className="px-4 pt-3 pb-6 flex flex-col gap-4">
      {/* Título */}
      <Skeleton className="mb-2 h-7 w-28" />
      {/* Tarjetas de cuenta */}
      {[0, 1, 2].map(i => (
        <Skeleton key={i} className="h-47.5 rounded-[20px]" />
      ))}
      {/* Botón conectar banco */}
      <Skeleton className="h-12 rounded-2xl" />
    </div>
  )
}
