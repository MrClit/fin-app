import type { NextConfig } from "next";
import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import withSerwistInit from "@serwist/next";
import pkg from "./package.json" with { type: "json" };

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.ngrok-free.app", "*.ngrok-free.dev"],
  // Versión fijada en build-time desde package.json (fuente única). Disponible en
  // cliente como NEXT_PUBLIC_APP_VERSION; al hacer bump basta el siguiente build.
  env: { NEXT_PUBLIC_APP_VERSION: pkg.version },
};

// El service worker (Serwist) solo se genera en el build de producción. En `next dev`
// ni siquiera inicializamos el plugin: usa Turbopack por defecto en Next 16 y Serwist
// (modo webpack) no lo soporta, así que llamarlo en dev inyecta config de webpack y
// emite un warning. Dejando dev con Turbopack puro el HMR queda intacto.
function configWithSerwist(): NextConfig {
  // Revisión para invalidar la entrada de precache del fallback offline: el hash del
  // commit cambia en cada deploy (uuid si git no está disponible).
  let revision: string;
  try {
    revision = execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();
  } catch {
    revision = randomUUID();
  }

  const withSerwist = withSerwistInit({
    swSrc: "app/sw.ts",
    swDest: "public/sw.js",
    additionalPrecacheEntries: [{ url: "/~offline", revision }],
  });

  return withSerwist(nextConfig);
}

export default process.env.NODE_ENV === "production"
  ? configWithSerwist()
  : nextConfig;
