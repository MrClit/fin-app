# Finanzas Personales — App de gestión financiera personal

## Contexto del proyecto
App web personal (usuario único) de gestión y análisis de finanzas.
Lee `docs/finanzas-spec.md` para la especificación completa.
El fichero `docs/finanzas-app.jsx` fue el prototipo visual con el que arrancó
el desarrollo; ya **no** es referencia para la evolución de la app — las
decisiones de UI/UX se toman por el spec y por mejores prácticas.
El fichero `docs/claude-code-plan.md` es la guía de arranque para llevar el prototipo y el spec al desarrollo real.

## Stack
- Next.js 16 (App Router) + TypeScript
- Supabase (PostgreSQL + Auth)
- Tailwind CSS v4
- Recharts (gráficas, excepto Donut y Sparkline que son SVG puro)
- shadcn/ui (componentes base)
- Lucide React (iconos)

## Convenciones críticas
- `overflow: clip` en el contenedor raíz (nunca `overflow: hidden` — rompe sticky)
- Nunca `transform` en contenedores con hijos `position: fixed`
- Transiciones de pantalla con `opacity`; slide con `transform` solo si ningún
  descendiente `position: fixed` está montado durante la animación y sin dejar
  transform persistente al acabar (sin fill-mode en entradas) —
  patrón en `app/(app)/analytics/template.tsx` (#315)
- Server Components por defecto; `'use client'` solo cuando haya estado o touch events
- Estado `gran` (período de análisis) vive en el layout/contexto compartido,
  no dentro de cada pantalla
- Lógica de agregación SQL siempre en servidor, nunca en cliente
- Hooks y providers colocados por feature en `components/<feature>/`;
  `hooks/` solo para hooks transversales agnósticos de dominio. No existe `contexts/`

## Formato de números
Siempre usar esta función (formato español: punto miles, coma decimal):
```typescript
export const fmt = (n: number, decimals = 0): string => {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  const [intPart, decPart] = abs.toFixed(decimals).split('.')
  const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return sign + intFormatted + (decPart !== undefined ? ',' + decPart : '')
}
```

## Base de datos
- Todas las tablas tienen `user_id` con RLS activada
- `is_liability` en `accounts` para distinguir activos de pasivos
- La clasificación de una transacción (`income` / `expense` / `non_computable`) viene determinada por `categories.type` de su categoría efectiva (`COALESCE(category_manual, category)`). El signo del `amount` nunca se usa para clasificar tipo, sólo para presentación visual.
- Vista materializada `transactions_monthly_summary` para agregaciones
- **Tipos generados**: `lib/supabase/database.types.ts` es la foto en TS del esquema real (#241) y la fuente de la que se derivan los tipos de dominio en `types/index.ts`. **Tras cualquier migración que altere tablas/columnas/nullability o una firma RPC, regenerar con `pnpm gen:types`** (requiere `supabase login`) y commitear el fichero. No hay guardarraíl automático (a diferencia del test de drift de categorías): si se olvida, el fichero queda desactualizado y el build no avisa. El flag apunta al proyecto actual con `--project-id`; ver acoplamiento con el entorno dev/prod en #255.
- **Categorías**: la fuente única de verdad es `lib/categories/catalog.ts` (#175). `CategoryId`, `CATEGORY_META`, `CATEGORY_COLORS` y `VALID_CATEGORIES` se derivan de ahí. La tabla `categories` es una réplica: tras cambiar el catálogo, regenerar con `pnpm seed:categories` y ejecutar `supabase/seed/categories.sql` en el SQL Editor (un test de drift falla si se olvida). `transactions.category`/`category_manual` tienen FK a `categories.id` con `ON DELETE NO ACTION`: retirar o renombrar un id requiere migración de repunte (patrón alta→repunte→baja, ver #151/#174).

## Lo que NO hacer
- No reimplementar YTD sin discutirlo (fue retirado por UX — ver §14.15 del spec)
- No usar `overflow: hidden` en contenedores padre de sticky headers
- No calcular agregaciones de análisis en el cliente
- No hardcodear datos — todo viene de Supabase

## Comandos
- `pnpm dev` — desarrollo local
- `pnpm build` — verificar que compila antes de hacer push
- `pnpm test` — Vitest para tests unitarios

## Flujos de GitHub

**Delegación obligatoria:** toda operación con GitHub (issues, tablero del proyecto, ramas, commits, PRs, merges, release) la ejecuta el subagente **`gh-ops`** (Sonnet), no el hilo principal. El *cómo* vive en la skill **`gh-workflow`**; el release, en la skill **`release`** (historial en `CHANGELOG.md`).

Delegar **en bloques** y con un brief explícito — el subagente arranca en frío y no ve la conversación —, nunca llamada a llamada: un spawn para un solo comando cuesta más que ejecutarlo directo. Bloques típicos: «crea la issue con este cuerpo, enlázala al tablero y muévela a Ready», o «corre las validaciones, pushea, abre el PR con este título y cuerpo, y mueve a In review».

El hilo principal conserva lo que exige contexto del código: analizar, planificar, implementar y **redactar** el cuerpo de la issue, el del PR y los comentarios de cierre.

**Invariantes** (aplican también al hilo principal):
- Antes de analizar o planificar una issue, la rama activa debe ser `develop`. Si no, avisar y parar.
- Nunca trabajar directamente en `develop` ni en `main`: rama `feature/<slug>` o `fix/<slug>`.
- Antes de abrir PR: `pnpm test`, `pnpm lint` y `pnpm build`. Si algo falla, arreglarlo. Nunca `--no-verify`.
- **El salto de versión de un release (patch / minor / major) lo aprueba siempre el usuario.** Proponerlo con los commits que entran y su justificación, y esperar respuesta antes de tocar nada.

El análisis y la planificación deben tener siempre en cuenta: `CLAUDE.md`, `docs/finanzas-spec.md` y el prototipo `docs/finanzas-app.jsx`.