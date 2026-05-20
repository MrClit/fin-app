import { Skeleton } from '@/components/ui/skeleton'

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-4 pt-3 pb-6">
      {/* Balance card */}
      <Skeleton className="h-47.5 rounded-3xl" />
      {/* Patrimonio chart */}
      <Skeleton className="h-45 rounded-3xl" />
      {/* Account grid */}
      <div>
        <Skeleton className="mb-3 h-4 w-24" />
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map(i => (
            <Skeleton key={i} className="h-26.25 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
