# Finanzas Personales — App de gestión financiera personal

## Contexto del proyecto
App web personal (usuario único) de gestión y análisis de finanzas.
Lee `docs/finanzas-spec.md` para la especificación completa.
El fichero `docs/finanzas-app.jsx` es el prototipo visual de referencia —
es la fuente de verdad para todas las decisiones de UI/UX.
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
- `pnpm dev` — desarrollo local
- `pnpm build` — verificar que compila antes de hacer push
- `pnpm test` — Vitest para tests unitarios

## Flujos de GitHub

**Regla general:** usar MCP siempre que sea posible; CLI `gh` solo para lo que el MCP no cubra.

### Crear issues y añadirlas al proyecto
1. Crear la issue con MCP `mcp__github__create_issue` (owner: `MrClit`, repo: `fin-app`)
2. Vincularla al proyecto FinApp con `gh` (el MCP no soporta la API de Projects):
   ```bash
   gh project item-add 2 --owner MrClit --url "https://github.com/MrClit/fin-app/issues/$N"
   ```
   El proyecto FinApp tiene ID `2`.

### Ciclo de vida de una issue

Mover el estado de una issue en el proyecto con:
```bash
gh project item-edit --id <item-id> --field-id <field-id> --project-id 2 --single-select-option-id <option-id>
```
Para obtener `item-id`, `field-id` y `option-id` del estado usar:
```bash
gh project item-list 2 --owner MrClit --format json   # → item-id por número de issue
gh project field-list 2 --owner MrClit --format json  # → field-id y option-ids del campo Status
```

**Flujo obligatorio al trabajar con issues:**

| Momento | Acción |
|---|---|
| Antes de analizar/planificar una issue | Verificar que la rama activa es `develop` (si no, avisar y parar) |
| Antes de analizar/planificar una issue | Mover a **Ready** (si no lo está ya) |
| Al aceptar el plan e iniciar implementación | Si el plan difiere significativamente de la descripción original de la issue, actualizarla con `mcp__github__update_issue` antes de empezar |
| Al aceptar el plan e iniciar implementación | Mover a **In progress** |
| Al aceptar el plan e iniciar implementación | Crear rama `feature/<issue-slug>` o `fix/<issue-slug>` desde `develop` y trabajar en ella |
| Al terminar implementación y validaciones | Hacer push de la rama y abrir PR hacia `develop` con `mcp__github__create_pull_request` |
| Al terminar implementación y validaciones | Mover a **Review** |
| Al cerrar la issue | Mover a **Done** + comentar resumen con `mcp__github__add_issue_comment` |

Si el usuario pide mergear la PR, hacerlo directamente con `mcp__github__merge_pull_request` (sin aprobación previa — GitHub no permite que el autor apruebe su propia PR).

Nunca trabajar directamente en `develop` ni en `main` durante la implementación.

El análisis y la planificación deben tener siempre en cuenta: `CLAUDE.md`, `docs/finanzas-spec.md` y el prototipo `docs/finanzas-app.jsx`.