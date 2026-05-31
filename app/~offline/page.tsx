import type { Metadata } from 'next'
import { WifiOff } from 'lucide-react'
import { OfflineBottomNav } from '@/components/offline-bottom-nav'

export const metadata: Metadata = {
  title: 'Sin conexión',
}

/**
 * Documento de fallback que sirve el service worker cuando se navega a una ruta
 * que aún no estaba cacheada y no hay red (spec §8.2). Las rutas ya visitadas se
 * sirven de la caché; esta página solo aparece para las nuevas.
 */
export default function OfflinePage() {
  return (
    <>
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-6 pb-22.5 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-muted">
          <WifiOff className="size-6 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-foreground">Sin conexión</h1>
          <p className="text-sm text-muted-foreground">
            No hay red para cargar esta pantalla. Vuelve a intentarlo cuando recuperes la
            conexión.
          </p>
        </div>
      </main>
      {/* Salida de la pantalla offline: el bottom nav lleva a rutas ya cacheadas y
          resalta la sección que el usuario intentó abrir. */}
      <OfflineBottomNav />
    </>
  )
}
