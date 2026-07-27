# Coordenadas de GitHub — fin-app

Datos concretos de este repo para la skill `gh-workflow` y el agente `gh-ops`, que viven a nivel de
usuario y son genéricos. El *cómo* está allí; aquí solo el *dónde*.

## Repo

| | |
|---|---|
| Owner / repo | `MrClit` / `fin-app` |
| Visibilidad | privada, un solo desarrollador |

No hay **issue types**: son metadatos de organización y este es un repo personal. Las labels son la
categorización canónica.

## Ramas

| | |
|---|---|
| Integración (base de los PRs) | `develop` |
| Producción | `main` |
| Por defecto en GitHub | `main` |

Producción vive en **Vercel** y despliega automáticamente en cada push a `main`.

Como la rama por defecto es `main` y los PRs van contra `develop`, **`Closes #N` no autocierra al
mergear**: hay que cerrar la issue a mano y moverla a `Done`.

## Tablero

| | |
|---|---|
| Proyecto | **FinApp** — número `2`, node id `PVT_kwHOCaelWs4BWWzJ` |
| Owner | `MrClit` |
| Campo Status | `PVTSSF_lAHOCaelWs4BWWzJzhRrz6Q` |

| Estado | option-id |
|---|---|
| Backlog | `f75ad846` |
| Ready | `61e4505c` |
| In progress | `47fc9ee4` |
| In review | `df73e18b` |
| Done | `98236657` |

## Labels

Poner **una de tipo + una de área**:

- **Tipo:** `bug` · `feature` · `chore` · `refactor` · `documentation`
- **Área:** `backend` · `frontend` · `scrapers` · `infra` · `security` · `tests` · `dx` · `pwa` ·
  `qa` · `data-quality` · `edenred`

## Validaciones antes de abrir PR

```bash
pnpm test && pnpm lint && pnpm build
```

Nunca `--no-verify`. Tras tocar tipos de dominio, además `pnpm exec tsc --noEmit`: `next build` no
chequea los `*.test.ts` y CI tampoco los typechequea.

CI (`.github/workflows/ci.yml`) corre lint + test + build en cada PR y en los push a `develop` y
`main`.

## Pre-vuelo del release

- [ ] Las env vars del server existen en el environment **Production** de Vercel (no solo Preview).
      Las `NEXT_PUBLIC_*` son build-time → requieren redeploy si cambian.
- [ ] `NEXT_PUBLIC_APP_URL` = URL de prod **sin barra final**; es el redirect de Enable Banking
      (`/api/banking/callback`) y debe estar dada de alta como redirect URI en su panel.
- [ ] **Migraciones de Supabase aplicadas en el proyecto de Production.** Si el release incluye
      migraciones, esto va **antes** del merge a `main`, no después.
- [ ] `pnpm test`, `pnpm lint` y `pnpm build` pasan en local.

Las tres primeras las verifica el **usuario** (el agente no tiene acceso a los paneles): si el
release toca env vars o migraciones, preguntar explícitamente antes de mergear a `main`.

El historial de versiones publicadas está en [CHANGELOG.md](../CHANGELOG.md).

## Idioma

Issues, PRs y commits se escriben **en castellano**. Los identificadores del código (variables,
funciones, ficheros, rutas, columnas SQL) van **en inglés**.
