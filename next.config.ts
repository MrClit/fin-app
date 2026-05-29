import type { NextConfig } from "next";
import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import withSerwistInit from "@serwist/next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.ngrok-free.app", "*.ngrok-free.dev"],
};

// Revisión usada para invalidar la entrada de precache del fallback offline:
// el hash del commit cambia en cada deploy (uuid en local si git no está disponible).
const revision = (() => {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();
  } catch {
    return randomUUID();
  }
})();

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  // SW desactivado en desarrollo: `next dev` sigue con Turbopack y el HMR no se ve
  // afectado (la generación del SW requiere webpack vía `next build --webpack`).
  disable: process.env.NODE_ENV === "development",
  // Documento de fallback para navegaciones a rutas aún no cacheadas estando offline.
  additionalPrecacheEntries: [{ url: "/~offline", revision }],
});

export default withSerwist(nextConfig);
