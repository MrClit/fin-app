import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import { NetworkFirst, Serwist } from "serwist";

// El manifest de precache lo inyecta el plugin de Serwist en tiempo de build.
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// ── Warming de las rutas de la barra inferior (issue #137) ────────────────
// Las 4 rutas de navegación son server components dinámicos. `defaultCache` mete
// las navegaciones de documento en su cache catch-all "others" (no llevan header
// Content-Type, así que no entran en el cache "pages"), que se sobrescribe con
// cualquier GET same-origin y provoca caídas intermitentes a /~offline sin red.
// Las servimos desde un cache propio, con clave normalizada al pathname, y las
// calentamos en `activate` para garantizar el documento HTML offline.
const WARM_ROUTES = ["/", "/movimientos", "/cuentas", "/analisis"] as const;
const WARM_CACHE = "warm-pages";

// Clave estable = origin + pathname (sin query). Se aplica en lectura (mode
// "read"), escritura (mode "write") y en el `cache.put` manual del warming, de
// modo que la clave calentada coincide con la de lectura aunque la navegación
// traiga ?_rsc u otra query.
function warmCacheKey(url: URL): string {
  return url.origin + url.pathname;
}

const isWarmRoute = (url: URL): boolean =>
  (WARM_ROUTES as readonly string[]).includes(url.pathname);

const warmPagesEntry: RuntimeCaching = {
  matcher: ({ request, url, sameOrigin }) =>
    sameOrigin && request.mode === "navigate" && isWarmRoute(url),
  handler: new NetworkFirst({
    cacheName: WARM_CACHE,
    // Si la red tarda, caemos a cache rápido en vez de colgar la navegación.
    networkTimeoutSeconds: 3,
    plugins: [
      {
        // Normaliza la clave (quita ?_rsc / query) en lectura y escritura.
        cacheKeyWillBeUsed: async ({ request }) =>
          warmCacheKey(new URL(request.url)),
      },
    ],
  }),
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  // Nuestra entrada va PRIMERO: intercepta el documento de las 4 rutas antes de
  // que `defaultCache` las mande al cache "others". El resto (RSC, estáticos,
  // iconos, otras páginas) sigue exactamente igual que hoy.
  //
  // `defaultCache` aplica las estrategias de la tabla del issue de forma Next-aware:
  // cache-first/immutable para /_next/static/* e iconos (los hashes invalidan solos) y
  // network-first con fallback a cache para páginas y payloads RSC.
  runtimeCaching: [warmPagesEntry, ...defaultCache],
  fallbacks: {
    entries: [
      {
        // Se sirve solo al navegar a un documento no cacheado estando sin red.
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();

// Calienta el cache de las rutas de navegación en cada `activate`: cada deploy
// bumpea la revisión del SW (git HEAD en next.config.ts) => re-activa => recalienta
// con HTML fresco. Tolerante a fallos (Promise.allSettled + try/catch por ruta):
// sin red o con la sesión no lista no rompe el SW; NetworkFirst la calentará en la
// próxima navegación online.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(WARM_CACHE);
      await Promise.allSettled(
        WARM_ROUTES.map(async (route) => {
          try {
            const url = new URL(route, self.location.origin);
            const response = await fetch(url.href, {
              credentials: "include",
              // Evita reusar una respuesta de la caché HTTP intermedia.
              cache: "no-store",
              redirect: "follow",
            });
            // Solo cacheamos respuestas OK y que sigan en la misma ruta: si la
            // sesión expiró, el servidor redirige a /login y NO queremos guardar
            // esa pantalla como si fuera el dashboard.
            const finalUrl = new URL(response.url);
            if (!response.ok || finalUrl.pathname !== url.pathname) return;
            await cache.put(warmCacheKey(url), response.clone());
          } catch {
            // Sin red / fallo puntual: se calentará en la próxima navegación
            // online (NetworkFirst) o en el próximo activate. No propagamos.
          }
        }),
      );
    })(),
  );
});

// ── Notificaciones push (issue #115) ──────────────────────────────────────
// El servidor envía un JSON { title, body, url }. Mostramos la notificación
// nativa y, al pulsarla, enfocamos una pestaña abierta o abrimos la ruta.
interface PushPayload {
  title: string;
  body: string;
  url: string;
}

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload: PushPayload;
  try {
    payload = event.data.json() as PushPayload;
  } catch {
    payload = { title: "Finanzas", body: event.data.text(), url: "/" };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: payload.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string })?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Reutiliza una pestaña ya abierta de la app si la hay.
        for (const client of clientList) {
          if ("focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        return self.clients.openWindow(url);
      }),
  );
});
