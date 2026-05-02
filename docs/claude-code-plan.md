# Plan de arranque con Claude Code

Guía para llevar el prototipo y el spec al desarrollo real.  
Usar junto a `finanzas-spec.md` y `finanzas-app.jsx`.

---

## 1. Estructura del repo antes de abrir Claude Code

```
finanzas-app/
├── CLAUDE.md                 ← lo más importante
├── docs/
│   ├── finanzas-spec.md      ← el spec
│   └── finanzas-app.jsx      ← el prototipo
└── .env.example              ← variables de entorno documentadas
```

El prototipo y el spec van en `docs/` para que no interfieran con el proyecto Next.js que se creará en la raíz.

---

## 2. El CLAUDE.md

Este fichero es la memoria persistente entre sesiones. Claude Code lo lee automáticamente al arrancar. Cuanto más concreto, mejor.

Crea `CLAUDE.md` en la raíz del repo con este contenido:

```markdown
# Finanzas Personales — App de gestión financiera personal

## Contexto del proyecto
App web personal (usuario único) de gestión y análisis de finanzas.
Lee `docs/finanzas-spec.md` para la especificación completa.
El fichero `docs/finanzas-app.jsx` es el prototipo visual de referencia —
es la fuente de verdad para todas las decisiones de UI/UX.

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
- Transiciones de pantalla solo con `opacity`, nunca con `transform`
- Server Components por defecto; `'use client'` solo cuando haya estado o touch events
- Estado `gran` (período de análisis) vive en el layout/contexto compartido,
  no dentro de cada pantalla
- Lógica de agregación SQL siempre en servidor, nunca en cliente

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
- `is_internal_transfer` en `transactions` para evitar duplicados tarjeta/cuenta
- Vista materializada `transactions_monthly_summary` para agregaciones

## Lo que NO hacer
- No reimplementar YTD sin discutirlo (fue retirado por UX — ver §14.15 del spec)
- No usar `overflow: hidden` en contenedores padre de sticky headers
- No calcular agregaciones de análisis en el cliente
- No hardcodear datos — todo viene de Supabase

## Comandos
- `npm run dev` — desarrollo local
- `npm run build` — verificar que compila antes de hacer push
- `npm run test` — Vitest para tests unitarios
```

---

## 3. El .env.example

Crea `.env.example` en la raíz con este contenido. Claude Code lo usará como referencia para saber qué variables existen — sin él tenderá a inventarse nombres:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# GoCardless / Nordigen
GOCARDLESS_SECRET_ID=
GOCARDLESS_SECRET_KEY=

# Edenred scraper (GitHub Actions → webhook)
EDENRED_WEBHOOK_SECRET=    # genera con: openssl rand -hex 32

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Copia `.env.example` a `.env.local` y rellena los valores reales antes de arrancar el servidor.

---

## 4. Issues de GitHub — Fase 1

Crea estas issues antes de la primera sesión. Las de fases siguientes créalas al terminar cada fase, no todas de golpe (el spec evolucionará con el uso real).

### Labels recomendados
- `feature` / `chore` / `bug`
- `backend` / `frontend` / `infra`
- `claude-code` (para marcar las listas para Claude Code)

### Columnas del Kanban
`Backlog` → `Ready` → `In Progress` → `In Review` → `Done`

Una issue está **Ready** cuando:
- Tiene referencia a la sección del spec relevante
- El alcance cabe en una sesión de Claude Code
- No tiene dependencias sin resolver

### Issues de la Fase 1 — Infraestructura base

```
#1  [chore] Setup: inicializar Next.js 16 + TypeScript + Tailwind + shadcn/ui
    Ref: §4.1 del spec. Usar `npx create-next-app@latest`.
    Verificar que el contenedor raíz usa `overflow: clip` (§6.5).

#2  [chore] Supabase: schema SQL completo + RLS policies + índices
    Ref: §3.1 del spec. Incluir todas las tablas, índices y policies.
    Ejecutar en Supabase SQL Editor y verificar que RLS está activo.

#3  [chore] Deploy inicial en Vercel + configurar variables de entorno
    Ref: §4.1. Conectar repo de GitHub, añadir variables del .env.example.
    Verificar que el build pasa sin errores.

#4  [feature] Auth: Supabase magic link + middleware de protección de rutas
    Ref: §4.4. Usar @supabase/ssr para el middleware de Next.js.
    Redirigir a /login si no hay sesión activa.

#5  [feature] Layout base: App shell, bottom nav 4 tabs, dark/light mode
    Ref: §6.1, §6.4. Replicar el sistema de tokens de color del prototipo.
    Incluir safe-area-insets para iPhone (§7.2).

#6  [chore] Utilidades compartidas: fmt(), theme tokens, tipos TypeScript
    Ref: §13 nota 6. Crear lib/formatting.ts, lib/theme.ts y types/index.ts.
    El tipo Account debe incluir is_liability. El tipo Transaction debe incluir
    is_internal_transfer y category_manual.
```

### Issues de la Fase 2 — Conexión bancaria
*(crear al terminar Fase 1)*

```
#7  [feature] GoCardless: flujo de autorización OAuth + callback
    Ref: §4.4 del spec.

#8  [feature] Sync de transacciones desde GoCardless + categorización automática
    Ref: §4.4, §5.3 del spec.

#9  [feature] Pantalla de Cuentas con datos reales
    Ref: §2.4 del spec.

#10 [feature] Pantalla de Movimientos básica: lista + búsqueda + filtros
    Ref: §2.3 del spec.
```

---

## 5. Cómo arrancar la primera sesión de Claude Code

Abre Claude Code en la raíz del repo y di **exactamente** esto:

> "Lee el CLAUDE.md, luego el spec en docs/finanzas-spec.md y después trabaja en la issue #1. Antes de crear ningún fichero, muéstrame el plan de lo que vas a hacer."

**El "antes de crear ningún fichero, muéstrame el plan" es la instrucción más importante.** Evita que Claude Code tome decisiones de arquitectura sin confirmación, especialmente en la Fase 1 donde se establecen las bases.

### Plantilla para arrancar cada sesión posterior

> "Lee el CLAUDE.md. Vamos a trabajar en la issue #[N]. Antes de empezar, revisa si hay dependencias con otras issues completadas y dime si necesitas consultar alguna sección del spec."

---

## 6. Cómo usar el prototipo durante el desarrollo

**No copies el prototipo al proyecto.** Úsalo como referencia en cada sesión. Claude Code puede leer `docs/finanzas-app.jsx` directamente con sus herramientas de lectura de ficheros.

Ejemplos de cómo referenciarlo:

```
"Para implementar DualBarChart, consulta docs/finanzas-app.jsx líneas ~106-240
y replica el mismo comportamiento usando Recharts, excepto las líneas YoY
que deben implementarse en SVG puro como en el prototipo."

"El componente TxRow en el prototipo tiene swipe con onTouchStart/onTouchEnd.
Extráelo como componente 'use client' en components/transactions/TxRow.tsx."

"El sistema de tokens de color está definido en el objeto `t` dentro del
componente App del prototipo. Extráelo a lib/theme.ts manteniendo los mismos
valores para light y dark mode."
```

---

## 7. Fases de desarrollo completas

Referencia rápida del plan de implementación (ver §11 del spec para el detalle):

| Fase | Contenido | Semana |
|------|-----------|--------|
| 1 | Setup, Supabase, Auth, Layout base, utilidades | 1 |
| 2 | GoCardless, sync transacciones, Cuentas, Movimientos básico | 2 |
| 3 | Dashboard completo, modales detalle/nuevo, swipe, patrimonio | 3 |
| 4 | Análisis completo: barras, donut, KPIs, drilldown categoría | 4 |
| 5 | Edenred scraper, GitHub Actions, Onboarding real, PWA | 5 |
| 6 | Estados carga/error, renovación PSD2, tests unitarios | 6 |

---

## 8. Reglas de oro para trabajar con Claude Code

1. **Una issue = una sesión.** Si una tarea es demasiado grande, divide antes de empezar.

2. **Pide el plan primero.** Antes de cualquier tarea con más de 3 ficheros involucrados, pide que te explique el plan. Ahorra tiempo de revisión.

3. **Revisa el schema antes de continuar.** Al terminar la issue #2, revisa el schema SQL contra §3.1 del spec antes de avanzar a la Fase 2. Un error en el schema cuesta mucho más corregir tarde.

4. **El prototipo manda en UI.** Si Claude Code propone algo visualmente diferente al prototipo, redirige: "El prototipo en docs/finanzas-app.jsx muestra X, sigue ese diseño."

5. **No avances con build roto.** Antes de cerrar una sesión, pide siempre: "Ejecuta `npm run build` y asegúrate de que no hay errores TypeScript."

6. **Commits atómicos.** Pide un commit por issue completada con un mensaje descriptivo. Facilita revertir si algo sale mal.
