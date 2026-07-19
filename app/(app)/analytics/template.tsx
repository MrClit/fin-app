// A diferencia del layout, el template se remonta en cada navegación dentro
// del segmento (lista ⇄ detalle de categoría, incluidos router.back() y el
// back gesture), re-ejecutando el fade-in de la pantalla entrante (#315).
// Solo opacity: transform u overflow aquí romperían el header sticky del
// detalle y el BottomNav fijo. Nota: una navegación de solo searchParams
// también remontaría; si algún día hay que sincronizar ?period a la URL,
// usar window.history.replaceState (shallow), no router.replace.
export default function AnalyticsTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-fade-in">{children}</div>
}
