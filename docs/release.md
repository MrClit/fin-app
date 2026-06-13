# Flujo de release a producción

Producción vive en **Vercel**, con la rama **`main`** como rama de producción: cada
push a `main` dispara automáticamente el deploy de producción. El trabajo de
integración ocurre en `develop`. Un release consiste en llevar `develop` a `main`,
versionar y etiquetar.

El proyecto usa **versionado semántico (SemVer)** con **tags de git anotados**, sobre
la base de los [Conventional Commits](https://www.conventionalcommits.org/) que ya
se usan en los mensajes de commit.

## Versionado (SemVer)

Formato `MAYOR.MENOR.PATCH`. El salto de versión se decide por lo que incluye el
release:

| Commits incluidos en el release | Salto | Ejemplo |
| --- | --- | --- |
| solo `fix:` / `chore:` / `docs:` … | **patch** | `0.1.1` → `0.1.2` |
| algún `feat:` | **menor** | `0.1.1` → `0.2.0` |
| breaking change, o decisión de "ya es estable" | **mayor** | `0.x` → `1.0.0` |

La app está en fase `0.x` (pre-estable): las reglas son más laxas y el salto a
`1.0.0` es una decisión explícita del usuario, no automática.

No se mantiene un `CHANGELOG.md` a mano; si se quisiera, se puede generar desde los
Conventional Commits (p. ej. con `git-cliff`).

## Pasos de un release

Partiendo de `develop` actualizada y con la versión a publicar decidida (`vX.Y.Z`):

### 1. Bump de versión

```bash
git checkout develop && git pull
git checkout -b release/vX.Y.Z
# editar "version" en package.json → X.Y.Z
git commit -am "chore(release): vX.Y.Z"
git push -u origin release/vX.Y.Z
```

Antes de abrir el PR, ejecutar **siempre** las validaciones (no usar `--no-verify`):

```bash
pnpm test && pnpm lint && pnpm build
```

Abrir PR `release/vX.Y.Z` → `develop` y mergear con **squash** una vez la CI esté en
verde:

```bash
gh pr merge <n> --squash
```

### 2. PR develop → main

```bash
gh pr create --base main --head develop --title "Release vX.Y.Z"
```

Ambas ramas tienen protección: el check `lint-test-build` (CI) y Vercel deben pasar
antes de poder mergear. El auto-merge del repo está deshabilitado, así que hay que
esperar y mergear a mano:

```bash
gh pr checks <n> --watch     # esperar a que pasen los checks
gh pr merge <n> --merge      # merge commit (NO squash: conserva el historial)
```

> El PR `develop` → `main` se mergea con **merge commit** para preservar el historial
> de commits del release. Las feature PRs hacia `develop` van con `--squash`.

El merge a `main` dispara el deploy de producción en Vercel automáticamente.

### 3. Tag de la versión

Una vez mergeado, etiquetar `main`:

```bash
git checkout main && git pull
git tag -a vX.Y.Z -m "Release vX.Y.Z — <resumen>"
git push origin vX.Y.Z
git checkout develop
```

## Checklist antes de cada release

- [ ] Las env vars del server existen en el environment **Production** de Vercel (no
      solo Preview). Las `NEXT_PUBLIC_*` son build-time → requieren redeploy si cambian.
- [ ] `NEXT_PUBLIC_APP_URL` = URL de prod **sin barra final**; es el redirect de Enable
      Banking (`/api/banking/callback`) y debe estar dada de alta como redirect URI en
      el panel de Enable Banking.
- [ ] Migraciones de Supabase aplicadas en el proyecto de **Production**.
- [ ] `pnpm test`, `pnpm lint` y `pnpm build` pasan en local.

## Historial de releases

| Versión | Fecha | Notas |
| --- | --- | --- |
| `v0.1.1` | 2026-06-13 | Primer release con versionado SemVer. 5 fixes de seguridad (#178, #179, #180, #182, #191). |
