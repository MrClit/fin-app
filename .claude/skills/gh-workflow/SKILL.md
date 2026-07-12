---
name: gh-workflow
description: Flujo de trabajo de GitHub de fin-app — issues, tablero del proyecto FinApp, ramas, commits, pull requests, merges y release. Úsala ante cualquier operación con GitHub en este repo: crear o actualizar una issue, moverla de estado en el tablero, crear la rama de trabajo, commitear, abrir un PR hacia develop, mergearlo, cerrar la issue, o publicar un release a producción. Contiene las coordenadas del repo, la tabla de estados, las convenciones de rama/commit/PR y las validaciones obligatorias.
---

# Flujo de GitHub — fin-app

## Coordenadas

| | |
|---|---|
| Owner / repo | `MrClit` / `fin-app` |
| Proyecto | **FinApp** — número `2`, node id `PVT_kwHOCaelWs4BWWzJ` |
| Rama de integración | `develop` |
| Rama de producción | `main` (deploy automático en Vercel) |

## Qué herramienta usar para qué

Este proyecto usa el servidor MCP **oficial** (`github/github-mcp-server`), que sí sabe escribir
issues y PRs. Regla general: **MCP siempre que lo cubra, `gh` sólo para lo que no.**

| Operación | Herramienta |
|---|---|
| Crear / actualizar issue | `mcp__github__issue_write` (`method: "create"` \| `"update"`) |
| Leer issue, comentarios, labels | `mcp__github__issue_read` |
| Comentar una issue | `mcp__github__add_issue_comment` |
| Crear PR | `mcp__github__create_pull_request` |
| **Tablero (Projects V2)** | **`gh project`** — la toolset de Projects **no** está activada en el MCP |
| **Mergear un PR** | **`gh pr merge`** — el MCP devuelve error de permisos |

Las buenas prácticas genéricas de la API (buscar duplicados antes de crear, fijar `state_reason` al
cerrar, buscar plantilla de PR, paginar con `minimal_output`) las inyecta el propio servidor MCP en
contexto. No hace falta repetirlas aquí.

## Ciclo de vida de una issue

Estados reales del tablero: `Backlog` → `Ready` → `In progress` → **`In review`** → `Done`.
Los comandos y los ids están en [references/project-board.md](references/project-board.md).

| Momento | Acción |
|---|---|
| Antes de analizar / planificar | Verificar que la rama activa es `develop`. Si no, avisar y parar |
| Antes de analizar / planificar | Mover a **Ready** (si no lo está ya) |
| Al aceptar el plan | Si el plan difiere de la descripción original, actualizar la issue con `issue_write` (`method: "update"`) **antes** de empezar |
| Al aceptar el plan | Mover a **In progress** + crear la rama desde `develop` |
| Antes de abrir PR | Ejecutar **siempre** `pnpm test`, `pnpm lint` y `pnpm build`. Si algo falla, arreglarlo antes de pushear. Nunca `--no-verify` |
| Al terminar | Push + abrir PR hacia `develop` + mover a **In review** |
| Al cerrar | Cerrar la issue **a mano** (ver el aviso de abajo) + mover a **Done** + comentar el resumen |

> **`Closes #N` no autocierra al mergear en `develop`.** GitHub sólo cierra la issue cuando el commit
> aterriza en la rama por defecto, que aquí es `main`. Un PR mergeado a `develop` deja la issue
> abierta: hay que cerrarla explícitamente y moverla a **Done**.

## Ramas

Rama `feature/<slug>` o `fix/<slug>`, siempre **desde `develop`**. Nunca commitear directamente en
`develop` ni en `main`.

```bash
git checkout develop && git pull
git checkout -b feature/<slug>
```

## Commits

Conventional Commits, **en castellano**, con scope:

```
refactor(data): unificar el acceso a datos de cuentas y movimientos en lib/
fix(transactions): cargar no leídos anteriores a la ventana de 90 días
feat(scrapers): ejecutar el cron siempre desde origin/main vía worktree dedicado
```

Tipos: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `perf`, `ci`, `build`, `style`.

## Pull requests

Título = el mensaje del commit de squash, con la issue entre paréntesis:
`refactor(data): unificar el acceso a datos … (#306)`.

Cuerpo (así son los PRs del repo, p. ej. #318):

```markdown
Closes #N

## Qué problema resuelve
El porqué, no el qué. Qué estaba mal o faltaba.

## Cambios
Tabla o lista con los cambios relevantes y su razón.

## Verificación
- `pnpm test` (N ✅), `pnpm lint`, `pnpm build` ✅
- Qué se ejercitó de verdad, y qué queda pendiente de comprobar.
```

Los PRs de feature hacia `develop` se mergean con **squash**:

```bash
gh pr merge <n> --squash --subject "título del commit"
```

## Labels

`MrClit/fin-app` es un repo **personal**, así que **no hay issue types** (son metadatos de
organización). Las labels son la categorización canónica. Poner **una de tipo + una de área**:

- **Tipo:** `bug` · `feature` · `chore` · `refactor` · `documentation`
- **Área:** `backend` · `frontend` · `scrapers` · `infra` · `security` · `tests` · `dx` · `pwa` · `qa` · `data-quality` · `edenred`

## Idioma

Issues, PRs y commits se escriben **en castellano**. Los identificadores del código (variables,
funciones, ficheros, rutas, columnas SQL) van **en inglés**.

## Release a producción

No está aquí: el flujo versionado completo (bump SemVer → PR a `develop` → PR `develop` → `main` con
merge commit → tag anotado) está en [docs/release.md](../../../docs/release.md). Leerlo antes de
publicar.
