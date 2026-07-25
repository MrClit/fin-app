import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function DashboardSkeleton() {
  // Espeja el layout real (#366) —incluida la marca `data-content="wide"`— o la columna
  // salta de ancho y el contenido se recoloca al resolverse el Suspense.
  return (
    <div data-content="wide" className="flex flex-col gap-4 px-4 pt-3 pb-6">
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2">
        {/* Balance banner a sangre en móvil, card enmarcada desde `md` */}
        <Skeleton className="-mx-4 h-47.5 rounded-none md:mx-0 md:rounded-2xl" />
        {/* Patrimonio: la gráfica gana altura en `md`, como la real */}
        <Skeleton className="-mx-4 h-45 rounded-none border-y border-border md:mx-0 md:h-53 md:rounded-2xl md:border" />
      </div>
      {/* Bloque de cuentas con divisores internos (coincide con el real): 2 columnas en
          móvil, 3 en `md` y 4 en `lg`. Las dos últimas celdas sólo existen en `md` para
          completar las dos filas de tres. */}
      <div>
        <Skeleton className="mb-3 h-4 w-24" />
        <div className="-mx-4 border-t border-l border-border md:mx-0 md:overflow-clip md:rounded-2xl md:border">
          <div className="grid grid-cols-2 md:-mr-px md:-mb-px md:grid-cols-3 lg:grid-cols-4">
            {[0, 1, 2, 3, 4, 5].map(i => (
              <div
                key={i}
                className={cn(
                  'bg-secondary px-4 py-4 border-r border-b border-border',
                  i > 3 && 'hidden md:block lg:hidden',
                )}
              >
                <Skeleton className="mb-2.5 size-8 rounded-[10px]" />
                <Skeleton className="mb-1.5 h-3 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
