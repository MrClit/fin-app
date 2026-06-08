import { Skeleton } from '@/components/ui/skeleton'

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-4 pt-3 pb-6">
      {/* Balance banner a sangre completa */}
      <Skeleton className="-mx-4 h-47.5 rounded-none" />
      {/* Patrimonio chart full-width */}
      <Skeleton className="-mx-4 h-45 rounded-none border-y border-border" />
      {/* Bloque de cuentas 2 col con divisores internos (coincide con el real) */}
      <div>
        <Skeleton className="mb-3 h-4 w-24" />
        <div className="-mx-4 grid grid-cols-2 border-t border-l border-border">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="bg-secondary px-4 py-4 border-r border-b border-border">
              <Skeleton className="mb-2.5 size-8 rounded-[10px]" />
              <Skeleton className="mb-1.5 h-3 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
