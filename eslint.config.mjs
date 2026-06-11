import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Node scripts ejecutados fuera del bundle de Next.
    "scripts/**",
    // Service worker generado por Serwist en build (gitignored, minificado).
    "public/sw.js",
    // Prototipo visual de referencia (no producción) — ver CLAUDE.md.
    "docs/**",
    // Templates de skills de Claude Code (no se compilan con la app).
    ".agents/**",
  ]),
]);

export default eslintConfig;
