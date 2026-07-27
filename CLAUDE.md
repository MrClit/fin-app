# Finanzas Personales — App de gestión financiera personal

## Contexto del proyecto
App web privada de gestión y análisis de finanzas: agrega cuentas bancarias
(Enable Banking/PSD2), tarjetas y saldo Edenred vía scrapers, y da análisis por
período con categorización. La unidad de propiedad de los datos es el **hogar**
(`household_id`, #131), no el usuario: varios usuarios comparten un mismo hogar
y ven los mismos datos. En Fase 1 cada usuario pertenece a un único hogar.

**La fuente de verdad es el código.** Las decisiones de UI/UX se toman por
mejores prácticas. Para operación (scrapers, cron de `launchd`, entornos y
secretos) ver `README.md`; el historial de releases, en `CHANGELOG.md`.

`docs/` contiene el material de arranque del proyecto —spec original, prototipo
y plan— que el código ya ha superado: describen RLS por `user_id`, una vista
materializada retirada y rutas que no existen. **No usarlos como referencia.**
Su única parte todavía útil es `docs/finanzas-spec.md` §14 (backlog de mejoras
pensadas y descartadas, con su razonamiento).

## Stack
- Next.js 16 (App Router) + React 19 + TypeScript `strict` con `noUncheckedIndexedAccess`
- Supabase (PostgreSQL + Auth) vía `@supabase/ssr`
- Tailwind CSS v4 (`@theme` en `app/globals.css`, sin fichero de config)
- shadcn/ui estilo `base-nova` — las primitivas son `@base-ui/react`, no Radix
- Recharts (`NetWorthChart`, `DualBarChart`, `CategoryBarChart`); `DonutChart` y
  `Sparkline` son SVG puro
- Zod v4 (`lib/schemas/`) para validar todo payload de entrada
- Lucide React (iconos) · next-themes · Serwist (PWA) · web-push · Playwright (scrapers)
- El middleware vive en `proxy.ts` en la raíz (Next 16 renombró `middleware`)

**Next 16 no es el Next que el modelo cree conocer**: trae breaking changes en APIs,
convenciones y estructura de ficheros respecto a versiones anteriores. Ante cualquier
duda sobre el framework, consultar la documentación versionada que viene dentro del
paquete —`node_modules/next/dist/docs/`— antes de escribir código, y hacer caso a los
avisos de deprecación. Esa doc es la de esta versión exacta; el conocimiento previo,
no. (Complementariamente existe la skill `next-best-practices`.)

## Convenciones críticas
- `overflow: clip` en el área de contenido del app-shell (nunca `overflow: hidden` —
  crea contenedor de scroll y rompe sticky)
- Nunca `transform` en contenedores con hijos `position: fixed`
- Transiciones de pantalla con `opacity`; slide con `transform` solo si ningún
  descendiente `position: fixed` está montado durante la animación y sin dejar
  transform persistente al acabar (sin fill-mode en entradas) —
  patrón en `app/(app)/analytics/template.tsx` (#315)
- Server Components por defecto; `'use client'` solo cuando haya estado o touch events
- El período de análisis (`granularity`) vive en `components/analytics/AnalyticsContext.tsx`,
  compartido por Análisis y el detalle de categoría; no duplicarlo por pantalla
- Lógica de agregación SQL siempre en servidor, nunca en cliente
- Hooks y providers colocados por feature en `components/<feature>/`;
  `hooks/` solo para hooks transversales agnósticos de dominio. No existe `contexts/`
- **Identificadores en inglés** (variables, funciones, tipos, ficheros, rutas,
  columnas SQL); los strings de UI y los comentarios, en castellano
- Tests colocados junto al módulo (`lib/analytics.test.ts`); `tests/` solo aloja
  helpers compartidos y lo que no tiene módulo propio (`proxy.test.ts`)
- `cn()` usa `extendTailwindMerge`: cualquier token `text-*` custom que sea un
  tamaño debe registrarse en el grupo `font-size` o twMerge lo tratará como color
  y lo eliminará al fusionar (#244)

## Responsive y breakpoints
Breakpoints por defecto de Tailwind, **sin añadir ninguno a `@theme`**. Mobile-first
estricto: las clases base describen el móvil y las variantes se añaden encima.

| Token | Ancho | Semántica |
|---|---|---|
| (base) | < 768px | **Móvil. Intacto e invariante**: cualquier cambio que se vea aquí es una regresión |
| `md` | ≥ 768px | **Cambia el chrome**: nav, overlays, columna de lectura |
| `lg` | ≥ 1024px | **Cambia el layout**: rejillas multi-panel |
| `xl` | ≥ 1280px | **Solo ensancha** |

`sm:` (640px) no tiene semántica asignada; no usarlo sin justificación.

**Geometría del app-shell** (`app/(app)/layout.tsx`, #363) — dos CSS vars en
`globals.css`, fuera de `@theme` porque cambian por breakpoint:
- `--content-offset`: ancho del rail de navegación (0 en móvil, 80px en `md`, 240px en
  `xl`). El shell lo aplica como `padding-left` y `SideNav` como `width`. Los escalones
  se declaran en la clase `.app-shell`, **no en `:root`**: `/login` y `/~offline` viven
  fuera del shell y deben conservar el 0.
- `--content-read`: la **columna de lectura** (420px en base, 672px desde `md`). Es a lo
  que se ancla el chrome `fixed` vía `.content-anchored`.
- `--content-max`: el ancho **real** de la columna de contenido. Por defecto es
  `var(--content-read)`; sólo diverge en las pantallas de rejilla multi-panel (#366),
  que se marcan a sí mismas con `data-content="wide"` en su div raíz y suben a 960px
  desde `lg` —partir 672px en dos daría paneles más estrechos que el móvil—. El escalón
  se declara con `.app-shell:has([data-content='wide'])`, en `.app-shell` y no en
  `:root`. Al marcar una pantalla, marcar también su skeleton o la columna salta de
  ancho al resolverse el Suspense.

**Navegación** (#364): `BottomNav` en móvil (`md:hidden`) y `SideNav` desde `md` —rail
de iconos que se expande a sidebar en `xl`, con los tokens `--sidebar-*`—. Excluyentes
por breakpoint, con los 4 destinos compartidos en `components/nav-items.ts`. En `md+`
el avatar y la campana viven en el rail y `AppHeader` se queda solo con el `StatusBanner`.

Un `position: fixed` que deba alinearse con la columna en vez de con el viewport se
ancla con la utility **`.content-anchored`** (`BottomNav`, `Toast`); nunca con
`left-1/2 -translate-x-1/2 max-w-*` a mano, que asume que la app es el viewport.

**Overlays** (#365): todos usan `SheetContent` con `side="bottom"`, que es **un único
componente responsive** —hoja anclada abajo en móvil, diálogo centrado desde `md`—
resuelto solo con variantes `md:` en la primitiva, sin `matchMedia` ni bifurcación JS.
El diálogo se centra respecto al viewport (un modal no es chrome de la columna) con
`inset-0 + m-auto + h-fit`, no con `left-1/2 -translate-x-1/2`: así el `transform`
queda libre para la animación y no persiste en reposo. En el consumidor, lo que solo
tiene sentido como hoja (handle de arrastre, esquinas superiores, padding de
safe-area) se neutraliza con su variante `md:`, y el botón de cierre se pide con
`showCloseButton="md"` —en móvil el afordance es el handle; en escritorio hace falta
la X—. Nada de altura ni geometría en `style` inline: un estilo inline gana a la
variante `md:` y rompe el patrón.

**Invariantes CSS en clave multi-columna:**
- El scroll es el **del documento**; no hay contenedor de scroll interno y no debe
  haberlo. Un `overflow-y: auto` en el área de contenido reanclaría todos los sticky
  del proyecto y rompería `dvh` y las safe-areas. `overflow: clip` es seguro
  precisamente porque no crea contenedor de scroll.
- La navegación cuelga del app-shell, **fuera** del `template.tsx` de analytics: el
  slide del detalle de categoría (#315) no debe convertirse en containing block de
  ningún `fixed` de chrome.

**Puntero, teclado y foco** (#369):
- Lo que depende de la **capacidad de entrada** —no del ancho— se gatea con
  `pointer-fine:` / `pointer-coarse:`, nunca con `md:`: hay portátiles estrechos con
  ratón y tablets anchas sin él. Patrón de referencia: el gutter de acciones de `TxRow`,
  que reserva su hueco siempre y solo anima la opacidad en `hover`/`focus-within`.
- El anillo de foco lo da `:focus-visible` en `@layer base` de `globals.css`. **No añadir
  `outline-none` sin un sustituto** (si el control vive dentro de una caja con borde
  propio, el anillo va en el contenedor con `focus-within`).
- Interactivo = elemento nativo: `<button>` si dispara una acción, `<Link>` si navega.
  No hay ni debe haber `role="button"` + `onKeyDown` a mano.
- Un `background` en `style` inline gana a cualquier `hover:bg-*`. Si un control necesita
  hover, su fondo va en clases (token, o CSS var cuando el color es dinámico); si es un
  degradado o un color de categoría, se realza con `brightness`.
- El cursor de los botones lo da `button:not(:disabled) { cursor: pointer }` en `@layer base`
  de `globals.css` (#378) — Tailwind v4 lo retiró de su preflight. **No declarar el cursor
  en un `<button>`**: ya lo tiene, y un `disabled` debe quedarse en `default` (ojo: escribir
  la utility aquí en prosa basta para que Tailwind la emita). Lo único que
  declara el cursor a mano son los clicables **no nativos** de las gráficas (los `<g>` de
  Recharts y el SVG de `DonutChart`), que el selector no alcanza.

El razonamiento completo y lo descartado, en `docs/responsive.md` (#354).

## Formato de números
Usar siempre `fmt()` de `lib/formatting.ts` (formato español: punto de miles,
coma decimal). No reimplementarla ni formatear a mano.

## Arquitectura de servidor
- **Route handlers**: envolver en `withAuth` / `withUser` de `lib/http/with-auth.ts`
  (#305). Resuelven sesión, hogar y cliente Supabase, capturan excepciones, las
  registran en `error_log` y devuelven el 500. Lanzar `RouteError` para errores
  esperados; `parseBody` traduce un body inválido a 400 sin ensuciar el log (#308).
- **Sesión**: `lib/auth/session.ts` memoiza usuario y hogar con `cache()` de React,
  deduplicado por request (#236). Usar esos resolvers, no `getUser()` suelto.
- **Ingesta**: todo lo que entra (webhooks de los tres scrapers y Enable Banking)
  pasa por el núcleo `lib/ingest/` (#309, #331) — normaliza, resuelve cuenta,
  categoriza y hace upsert. No escribir en `transactions` desde un route handler.
- **Webhooks públicos**: `proxy.ts` exime del chequeo de sesión a `/api/edenred`,
  `/api/sabadell-*`, `/api/scrapers`, `/api/sync/enablebanking/cron` y
  `/api/error-log`; se autentican por Bearer (`lib/http/bearer.ts`).
- **Categorización automática**: cascada de proveedores en `lib/categories/categorizer.ts`
  (#359) — reglas explícitas del hogar (`categorization_rules`) → reglas **aprendidas**
  de las correcciones del usuario → `AUTO_RULES` (regex en `lib/categories/rules.ts`,
  evaluadas en orden: las específicas primero, los catch-all al final). Gana el primero
  que acierta; los peldaños futuros entran como proveedores nuevos, no reescribiendo.
- **Aprendizaje**: no hay tabla de reglas aprendidas ni modelo — la fuente son los
  propios movimientos con `category_manual`, agregados en vivo por el RPC
  `get_learned_categories` (voto por mayoría por clave de comercio, ponderado por
  recencia). La clave la calcula `lib/categories/normalize.ts` y se persiste en
  `transactions.description_key`/`description_key_root`. Dos invariantes: sólo se
  aprende de `category_manual`, y nada automático escribe jamás en `category_manual`.

## Base de datos
- **RLS por hogar**: las políticas filtran por `household_id IN (SELECT current_household_ids())`.
  `user_id` sigue existiendo como autoría de la fila, pero **no** es lo que
  determina la visibilidad. Toda tabla nueva de dominio necesita `household_id`,
  RLS activada y su política de hogar.
- `is_liability` en `accounts` para distinguir activos de pasivos.
- La clasificación de una transacción (`income` / `expense` / `non_computable`) viene
  determinada por `categories.type` de su categoría efectiva
  (`COALESCE(category_manual, category)`). El signo del `amount` nunca se usa para
  clasificar tipo, sólo para presentación visual.
- **Agregación**: el RPC `get_period_data` (en vivo) alimenta Análisis; el Dashboard
  consulta `transactions`/`accounts` directamente. La MV `transactions_monthly_summary`
  fue eliminada por fuga entre hogares y cómputo muerto (#231) — no reintroducirla.
- **Migraciones**: ficheros en `supabase/migrations/`, aplicados **a mano en el SQL
  Editor** de Supabase como un único bloque. No hay `supabase db push` en el flujo;
  el fichero es el registro, no el ejecutor.
- **Tipos generados**: `lib/supabase/database.types.ts` es la foto en TS del esquema
  real (#241) y la fuente de la que se derivan los tipos de dominio en `types/index.ts`.
  **Tras cualquier migración que altere tablas/columnas/nullability o una firma RPC,
  regenerar con `pnpm gen:types`** (requiere `supabase login`) y commitear el fichero.
  No hay guardarraíl automático (a diferencia del test de drift de categorías): si se
  olvida, el fichero queda desactualizado y el build no avisa. El flag apunta al
  proyecto actual con `--project-id`; ver acoplamiento con el entorno dev/prod en #255.
- **Categorías**: la fuente única de verdad es `lib/categories/catalog.ts` (#175).
  `CategoryId`, `CATEGORY_META`, `CATEGORY_COLORS` y `VALID_CATEGORIES` se derivan de
  ahí. La tabla `categories` es una réplica: tras cambiar el catálogo, regenerar con
  `pnpm seed:categories` y ejecutar `supabase/seed/categories.sql` en el SQL Editor
  (un test de drift falla si se olvida). `transactions.category`/`category_manual`
  tienen FK a `categories.id` con `ON DELETE NO ACTION`: retirar o renombrar un id
  requiere migración de repunte (patrón alta→repunte→baja, ver #151/#174).

## Lo que NO hacer
- No reimplementar YTD sin discutirlo: se implementó y se retiró por confuso en UX
  (el razonamiento quedó en `docs/finanzas-spec.md` §14.15)
- No usar `overflow: hidden` en contenedores padre de sticky headers
- No calcular agregaciones de análisis en el cliente
- No hardcodear datos — todo viene de Supabase
- No filtrar consultas por `user_id` esperando aislamiento: el aislamiento es por hogar
- No escribir en `transactions` fuera de `lib/ingest/` ni de las server actions existentes

## Comandos
- `pnpm dev` — desarrollo local
- `pnpm build` — `next build --webpack`; verificar que compila antes de push
- `pnpm start` — build de producción en el puerto 3001 (necesario para probar
  PWA/service worker: en `pnpm dev` el precaching falla)
- `pnpm test` — Vitest · `pnpm lint` — ESLint
- `pnpm exec tsc --noEmit` — **necesario tras tocar tipos de dominio**: `next build`
  no chequea los `*.test.ts` y CI tampoco los typechequea
- `pnpm gen:types` · `pnpm seed:categories` — ver sección de Base de datos
- `pnpm scrape:*` / `pnpm cron:*:status` — scrapers y su cron local (ver README)

CI (`.github/workflows/ci.yml`) corre lint + test + build en PR y push a
`develop`/`main`. `enablebanking-sync.yml` dispara el sync diario a las 06:00 CET.

## Flujos de GitHub

**Delegación obligatoria:** toda operación con GitHub (issues, tablero del proyecto,
ramas, commits, PRs, merges, release) la ejecuta el subagente **`gh-ops`** (Sonnet),
no el hilo principal. El *cómo* vive en la skill **`gh-workflow`**; el release, en la
skill **`release`** (historial en `CHANGELOG.md`).

El agente y las dos skills **ya no están en este repo**: son genéricos y viven a nivel
de usuario en `~/.claude/`, enlazados desde el repo `claude-config` (#356). Lo propio de
fin-app —owner, ids del tablero, ramas, labels, validaciones y pre-vuelo del release—
está en **`.claude/gh-project.md`**, que es lo que la skill lee al arrancar. Si cambia
una coordenada, se toca ese fichero, no la skill.

Delegar **en bloques** y con un brief explícito — el subagente arranca en frío y no ve
la conversación —, nunca llamada a llamada: un spawn para un solo comando cuesta más
que ejecutarlo directo. Bloques típicos: «crea la issue con este cuerpo, enlázala al
tablero y muévela a Ready», o «corre las validaciones, pushea, abre el PR con este
título y cuerpo, y mueve a In review».

El hilo principal conserva lo que exige contexto del código: analizar, planificar,
implementar y **redactar** el cuerpo de la issue, el del PR y los comentarios de cierre.

**Invariantes** (aplican también al hilo principal):
- Antes de analizar o planificar una issue, la rama activa debe ser `develop`. Si no, avisar y parar.
- Nunca trabajar directamente en `develop` ni en `main`: rama `feature/<slug>` o `fix/<slug>`.
- Antes de abrir PR: `pnpm test`, `pnpm lint` y `pnpm build`. Si algo falla, arreglarlo. Nunca `--no-verify`.
- Una issue mergeada a `develop` **no se autocierra** (`Closes #N` solo actúa al
  aterrizar en `main`): cerrarla a mano y moverla a Done.
- **El salto de versión de un release (patch / minor / major) lo aprueba siempre el usuario.**
  Proponerlo con los commits que entran y su justificación, y esperar respuesta antes de tocar nada.
