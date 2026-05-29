import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

// El manifest de precache lo inyecta el plugin de Serwist en tiempo de build.
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  // `defaultCache` aplica las estrategias de la tabla del issue de forma Next-aware:
  // cache-first/immutable para /_next/static/* e iconos (los hashes invalidan solos) y
  // network-first con fallback a cache para páginas y payloads RSC.
  runtimeCaching: defaultCache,
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
