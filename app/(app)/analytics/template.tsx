'use client'

import { usePathname } from 'next/navigation'

// A diferencia del layout, el template se remonta en cada navegación dentro
// del segmento (lista ⇄ detalle de categoría, incluidos router.back() y el
// back gesture), re-ejecutando la animación de entrada de la pantalla
// entrante (#315): el detalle entra deslizando desde la derecha (push) y la
// lista reaparece con fade. La salida del detalle (pop) vive en
// CategoryDetailClient, que anima antes de navegar. El transform del slide es
// seguro aquí: BottomNav queda fuera del template y la animación de entrada
// no deja transform persistente al terminar (sin fill-mode). Nota: una
// navegación de solo searchParams también remontaría; si algún día hay que
// sincronizar ?period a la URL, usar window.history.replaceState (shallow),
// no router.replace.
export default function AnalyticsTemplate({ children }: { children: React.ReactNode }) {
  const isCategoryDetail = usePathname().startsWith('/analytics/category/')
  return (
    <div className={isCategoryDetail ? 'animate-slide-in-right' : 'animate-fade-in'}>
      {children}
    </div>
  )
}
