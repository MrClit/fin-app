# Plan responsive — documento de decisión (#354)

> Salida de la issue de análisis [#354](https://github.com/MrClit/fin-app/issues/354).
> A diferencia del resto de `docs/` (material de arranque superado por el código), este
> documento es **vigente**: registra las decisiones de adaptación a tablet/escritorio y
> el porqué de lo descartado.
>
> **La parte normativa ya vive en `CLAUDE.md`** (sección «Responsive y breakpoints»)
> desde #363: semántica de breakpoints, geometría del app-shell e invariantes CSS. Ante
> discrepancia manda `CLAUDE.md`; aquí queda el razonamiento y lo descartado.

## Objetivo

Adaptar la app —diseñada y pulida como experiencia móvil pura (contenedor de 420px,
bottom nav, bottom sheets)— para usarse con comodidad en pantallas de cualquier tamaño,
**sin degradar la experiencia móvil ni la PWA instalada**. Mobile-first: en `< 768px`
nada cambia; lo nuevo se añade por encima de breakpoints.

## 1. Rango de tamaños objetivo y breakpoints

Se usan los breakpoints por defecto de Tailwind (nada nuevo en `@theme`), con esta
semántica de proyecto:

| Token | Ancho | Semántica |
|---|---|---|
| (base) | < 768px | **Móvil. Intacto e invariante**: el diseño actual, sin cambios |
| `md` | ≥ 768px | **Cambia el chrome**: nav pasa a rail lateral, sheets pasan a diálogo, columna de lectura |
| `lg` | ≥ 1024px | **Cambia el layout**: rejillas multi-panel (Dashboard, Análisis) |
| `xl` | ≥ 1280px | **Solo ensancha**: el rail se expande a sidebar completa |

Convención de uso: mobile-first estricto — las clases base describen el móvil actual y
las variantes `md:`/`lg:`/`xl:` añaden encima. `sm:` (640px) queda sin semántica
asignada; no usarlo salvo necesidad puntual justificada.

**Descartado:** tratamiento específico de landscape móvil (caso marginal en una app de
finanzas de uso vertical; el coste no lo justifica) y un tercer diseño dedicado a
tablet — el rango `md`–`lg` se resuelve como «escritorio estrecho» (rail + columna de
lectura), que en tablet portrait funciona bien en táctil.

## 2. Modelo de navegación

| Rango | Navegación |
|---|---|
| base | Bottom tab bar actual (se oculta con `md:hidden`; comportamiento intacto) |
| `md` | **Rail lateral izquierdo** (~80px): icono + etiqueta, 4 destinos, badge de no leídos |
| `xl` | El rail se expande a **sidebar** (~240px) |

Es el patrón estándar (Material 3: bottom nav en compact, rail en medium, sidebar en
expanded); con 4 destinos el rail sobra de espacio. El avatar (`UserMenuTrigger`) y las
notificaciones (`NotificationsTrigger`) migran del `AppHeader` al rail en `md+`; el
header queda como cabecera de contenido (o se oculta si queda vacío). Theming con los
tokens `--sidebar-*` que ya existen en `globals.css`.

En el **detalle de categoría** el rail permanece visible en `md+` (a diferencia del
bottom-nav móvil, que se oculta); el botón «‹ Atrás» se mantiene.

## 3. Estrategia de layout

Base común: **columna de contenido con `max-w` de lectura ~672px** (`max-w-2xl`) que
respeta la jerarquía móvil. Rejilla multi-panel solo donde aporta:

| Pantalla | base | `md` | `lg+` |
|---|---|---|---|
| Dashboard | actual | columna de lectura | rejilla 2 col: balance + patrimonio lado a lado; grid de cuentas a 3–4 col |
| Movimientos | actual | columna de lectura | igual que `md` |
| Cuentas | actual | columna de lectura | igual que `md` |
| Análisis | actual | columna de lectura | rejilla 2 col de KPIs y gráficas |
| Detalle de categoría | actual | columna de lectura, subruta a pantalla completa | igual que `md` |

El layout raíz (`app/(app)/layout.tsx`) se reestructura como **app-shell**: slot de
navegación + área de contenido. Se retira el candado `max-w-105` del raíz; el ancho
útil lo define el área de contenido. Los `fixed` hoy centrados con
`left-1/2 -translate-x-1/2 max-w-105` (toast, bottom-nav) se reanclan al área de
contenido vía CSS var de offset (ancho del rail; 0 en móvil).

El patrón de cards full-width (`-mx-4` + `border-y`, sin `rounded`) recupera `rounded`
y borde completo en `md+`: el full-bleed solo tiene sentido cuando la card toca los
bordes del viewport.

**Ancho de las pantallas de rejilla (#366).** La columna de lectura de 672px no da para
partirse en dos: los paneles quedarían en ~330px, menos que los 420px del móvil, y las
gráficas *encogerían* al crecer el viewport. Por eso las pantallas con rejilla —y sólo
ellas— ensanchan su columna a 960px desde `lg`. El mecanismo separa dos variables que
antes eran una: `--content-read` (la columna de lectura, a la que sigue anclado el
chrome `fixed`: un toast no crece porque la pantalla de turno sea de rejilla) y
`--content-max` (el ancho real de la columna, que por defecto es la de lectura). La
pantalla se declara ancha poniéndose `data-content="wide"`, que el shell recoge con
`:has()`. **Descartado:** subir `--content-max` globalmente en `lg` (Movimientos y
Cuentas deben quedarse en columna de lectura) y que el shell decidiera por ruta —es la
pantalla quien sabe si lleva rejilla, no el layout—.

**Descartado (esta fase):** master-detail en Movimientos (lista + detalle en panel).
Es el cambio de mayor coste/riesgo (rompe el modelo de navegación por rutas y los
overlays de fila) y la columna centrada funciona. Queda como evolución futura si el
uso en escritorio lo pide.

## 4. Overlays

**Un único componente responsive, sin bifurcación por JS.** Los 5 bottom-sheets
(`AddTxModal`, `TxModal`, `AccountFilter`, `CategoryPicker`, `GranularityPicker`)
comparten la primitiva `SheetContent` (`components/ui/sheet.tsx`, base-ui Dialog):
se le añaden variantes `md:` para que `side="bottom"` renderice como **diálogo
centrado** (`max-w-md`, `rounded-2xl`, animación fade/scale) en vez de hoja anclada
abajo. En `md+` desaparecen el handle de arrastre, las esquinas de hoja y el padding
de `safe-area-inset-bottom`.

## 5. Gráficas

Las tres gráficas Recharts (`NetWorthChart`, `DualBarChart`, `CategoryBarChart`) ya
usan `ResponsiveContainer`; `DonutChart` y `Sparkline` son SVG propio. En esta fase:
**verificación de escalado** (alturas fijas vs. proporción, densidad de ticks,
`viewBox`) y cap de ancho de gráfica (~720px) si se deforma. Sin cambio de forma ni
de densidad de datos.

## 6. Densidad de información

Se respeta la jerarquía móvil ensanchada. Única excepción: más columnas en grids ya
existentes (cuentas del Dashboard, category picker). Enriquecer `TxRow` con más
columnas en escritorio queda como mejora posterior, fuera de la serie.

## 7. Touch vs. puntero  *(implementado en #369)*

Confirmado al ejecutar: Tailwind v4 restringe `hover:` a `@media (hover: hover)` por
defecto y el proyecto no lo desactiva (no hay ningún `@custom-variant hover`), así que
el hover nunca ensucia táctil. Lo que sí faltaba era cobertura, foco y semántica.

**Capacidad de entrada, no ancho.** Las acciones de puntero se gatean con
`pointer-fine:` / `pointer-coarse:` (Tailwind ≥ 4.1), **nunca con `md:`**: el breakpoint
mide ancho, y hay portátiles estrechos con ratón y tablets anchas sin él. Es también lo
que evita `matchMedia`, coherente con los overlays de #365.

**Alternativa de puntero al swipe de `TxRow`.** Recategorizar y marcar leído vivían solo
detrás del gesto táctil. Ahora la fila tiene un gutter de dos botones que aparece con
hover o con foco (`group-hover` + `group-focus-within`). Decisiones:
- El hueco se **reserva siempre** con `pointer-fine:pr-20`, y lo único que cambia al
  pasar el ratón es la opacidad: el importe nunca queda tapado —inaceptable en una app
  de finanzas— y la fila no salta.
- El gutter se oculta con `pointer-coarse:hidden` (`display:none`), que lo saca del
  puntero *y* del orden de tabulación. El swipe táctil no se toca.
- De paso se corrige un bug latente: los botones de los paneles de swipe estaban
  siempre en el DOM y eran tabulables fuera de pantalla (`pointer-events-none` no saca
  del orden de foco). Ahora llevan `tabIndex={-1}` mientras su lado está cerrado.

**Foco visible.** Se declara una vez, en `@layer base` (`:focus-visible { outline: 2px
solid var(--ring) }`), en vez de componente a componente: la app usa `<button>`/`<a>`
nativos con clases ad-hoc —la primitiva `ui/button` solo la consume `ui/sheet`—, así que
una regla de base cubre todo. Corolario normativo: **no añadir `outline-none` sin
sustituto**; los dos inputs de búsqueda que lo hacían ahora pintan el anillo en su
contenedor con `focus-within`.

**Semántica antes que handlers.** Los `<div onClick>` pasan a `<button>` (acción) o
`<Link>` (navegación) —filas de categoría, `FieldRow` de los modales, contenido de
`TxRow`—. El elemento nativo da Enter/Espacio, foco y rol sin escribir un solo
`onKeyDown`. Se añade además un skip link al `<main>`, que con 4 destinos de nav más
campana y avatar es la diferencia entre recorrido usable e inusable.

**Fondos en `style` inline.** Un `background` inline gana siempre a un `hover:bg-*`, así
que el barrido obligó a elegir por caso: mover el fondo a tokens/clases cuando el color
era fijo (`bg-primary/10 hover:bg-primary/20`), pasarlo por CSS var cuando era dinámico
(`RenewBankButton`), o realzar con `brightness` cuando el fondo es un degradado o el
color de una categoría.

**Cursor de los botones** *(añadido en #378)*. Tailwind v4 retiró de su preflight el
`cursor: pointer` sobre `<button>` que traía v3, y nadie lo notó hasta la revisión de
esta sección: los ~55 botones de la app habían caído al `default` del UA y solo 16 sitios
lo corregían a mano, así que dentro de una misma pantalla unos botones daban mano y otros
no —y los `<a>` de al lado sí, porque ese lo pone la hoja del navegador—. Se elige
**restaurarlo**, no adoptar el nuevo default: el argumento de Tailwind (la mano significa
«enlace», y los botones nativos del SO no la usan) es defendible en abstracto, pero en web
la convención aprendida es la contraria y la sostienen todos los sistemas de diseño
mayores; además varios controles de la app no parecen botones (el FAB, el toggle de tema,
la campana, el avatar, el gutter de `TxRow`) y la mano es su única señal de hover. La
accesibilidad no entra en la decisión: el cursor no lo lee ninguna tecnología asistiva ni
existe en táctil. Va donde el anillo de foco —una regla en `@layer base`, no una clase por
componente—, con `:not(:disabled)` para que un botón inerte nunca prometa clic, y permitió
**borrar** los 16 ad-hoc en vez de añadir 20 más. Se descartó incluir `[role="button"]` en
el selector: legitimaría el patrón que esta misma sección prohíbe. Quedan fuera los
clicables no nativos de las gráficas, que declaran su cursor inline porque ningún selector
sobre `button` los alcanza.

**Gráficas fuera de alcance, deliberadamente.** Los arcos del donut y las barras siguen
con `tabIndex={-1}`: son una **ruta redundante**: la misma navegación al detalle está en
la lista de categorías de debajo, que sí es accesible por teclado. Hacerlas focusables
duplicaría cada parada de tabulación sin añadir ninguna capacidad. Si algún día el donut
ofrece algo que la lista no, se revisa.

## 8. Chrome PWA/iOS y viewport  *(verificado en #369)*

El chrome PWA es todo `env()` (franja de status bar, safe-areas): en escritorio vale
0 y es **inerte** — solo requería verificación, no trabajo. Comprobado: la franja de
`app/layout.tsx` usa `h-[env(safe-area-inset-top)]` **sin** `max()`, así que fuera de
iOS standalone mide 0px; los `env()` que sí llevan `max(…, 1.5rem)` no son chrome sino
padding de diseño, y los sheets ya lo neutralizan con su variante `md:`.

El desbloqueo del zoom (`maximumScale: 1, userScalable: false`, anti-patrón WCAG 1.4.4
que iOS moderno además ignora) se adelantó a #363 y sigue retirado.

## 9. Riesgos

- **Sticky + overflow**: al reestructurar el shell, el `overflow: clip` debe quedar
  en el contenedor de scroll del contenido; `overflow: hidden` rompería los sticky
  headers (convención crítica de `CLAUDE.md`).
- **`transform` + `fixed`**: el rail debe colgar del app-shell, fuera del
  `template.tsx` de analytics — el slide del detalle de categoría (#315) no debe
  convertir a ningún ancestro del rail en viewport de sus `fixed`. Sin transform
  persistente al acabar las animaciones.
- **`fixed` centrados**: toast y bottom-nav asumen hoy que la app es el viewport
  (`left-1/2 -translate-x-1/2 max-w-105`); con rail lateral deben reanclarse al área
  de contenido (CSS var de offset).
- **Regresión móvil**: cada issue de la serie tiene como criterio de aceptación que
  en `< 768px` la pantalla sea visualmente idéntica a la actual.

## 10. Serie de ejecución

| Issue | Alcance | Depende de |
|---|---|---|
| [#363](https://github.com/MrClit/fin-app/issues/363) | 1/7 — app-shell y breakpoints (fundaciones) | — |
| [#364](https://github.com/MrClit/fin-app/issues/364) | 2/7 — navegación adaptativa (rail `md`, sidebar `xl`) | #363 |
| [#365](https://github.com/MrClit/fin-app/issues/365) | 3/7 — overlays (sheet ↔ diálogo) | #363 (paralela a #364) |
| [#366](https://github.com/MrClit/fin-app/issues/366) | 4/7 — Dashboard en rejilla | #363, #364 |
| [#367](https://github.com/MrClit/fin-app/issues/367) | 5/7 — Movimientos y Cuentas en columna ancha | #363, #364 |
| [#368](https://github.com/MrClit/fin-app/issues/368) | 6/7 — Análisis y detalle de categoría | #363, #364 |
| [#369](https://github.com/MrClit/fin-app/issues/369) | 7/7 — puntero, teclado y accesibilidad | #363–#368 |

#366, #367 y #368 son paralelas entre sí. El desbloqueo del zoom del viewport,
conceptualmente de #369, se adelanta a #363 por trivial.
