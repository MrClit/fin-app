import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Nummo',
    short_name: 'Nummo',
    description: 'Gestiona y analiza tus finanzas personales',
    start_url: '/',
    display: 'standalone',
    // La app no tiene layout apaisado: en horizontal el viewport cruza `md` con
    // ~390px de alto, aparece el rail de `SideNav` y queda bajo la isla dinámica.
    // Lo respetan Chrome/Android en standalone; WebKit no implementa este campo,
    // así que en iPhone sigue girando (allí sólo lo evita el bloqueo del sistema).
    orientation: 'portrait',
    background_color: '#f5f5f7',
    theme_color: '#6366f1',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icons/icon-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
