---
name: release
description: Publica un release a producción de fin-app — decidir el salto de versión (SemVer), bump de package.json, PR a develop, PR develop → main con merge commit, tag anotado y GitHub Release. Úsala ante cualquier petición de publicar, desplegar a producción, sacar una versión nueva o etiquetar un release. Contiene la puerta de aprobación del bump, el checklist de pre-vuelo y la coreografía completa.
---

# Release a producción — fin-app

Producción vive en **Vercel**, con **`main`** como rama de producción: cada push a `main` dispara el
deploy automáticamente. La integración ocurre en `develop`. Un release consiste en llevar `develop` a
`main`, versionar y etiquetar.

Versionado **SemVer** con **tags de git anotados**, sobre la base de los
[Conventional Commits](https://www.conventionalcommits.org/) que ya se usan en los mensajes.

El historial de versiones publicadas está en [CHANGELOG.md](../../../CHANGELOG.md).

## Reparto de responsabilidades

El **hilo principal** decide el salto de versión, obtiene la aprobación del usuario y redacta las
notas del release. La **ejecución** (ramas, commits, PRs, merges, tag, GitHub Release) la delega en
bloque al subagente **`gh-ops`**.

---

## Paso 0 — Puerta de aprobación del bump (OBLIGATORIO)

**No se toca nada — ni una rama, ni un fichero — antes de que el usuario apruebe el salto de versión.**

1. Lista los commits desde el último tag:

   ```bash
   git describe --tags --abbrev=0          # último tag publicado
   git log --oneline <último-tag>..develop # qué entra en este release
   ```

2. Deriva el salto propuesto con esta tabla:

   | Commits incluidos en el release | Salto | Ejemplo |
   |---|---|---|
   | solo `fix:` / `chore:` / `refactor:` / `docs:` … | **patch** | `0.1.1` → `0.1.2` |
   | algún `feat:` | **menor** | `0.1.1` → `0.2.0` |
   | breaking change, o decisión de «ya es estable» | **mayor** | `0.x` → `1.0.0` |

   La app está en fase `0.x` (pre-estable): las reglas son más laxas y el salto a `1.0.0` es una
   **decisión explícita del usuario**, nunca automática.

3. **Pregunta al usuario con `AskUserQuestion`**, mostrando la lista de commits y la versión
   propuesta con su justificación. Ofrece las alternativas razonables (p. ej. patch propuesto vs.
   subir a minor). La tabla es una recomendación, no un veredicto: el usuario puede saber algo que
   los mensajes de commit no dicen — que un refactor grande merece minor, que conviene agrupar y
   esperar, o que ya toca `1.0.0`.

Solo con la versión aprobada se continúa.

## Checklist de pre-vuelo

Antes de empezar la coreografía, verificar:

- [ ] Las env vars del server existen en el environment **Production** de Vercel (no solo Preview).
      Las `NEXT_PUBLIC_*` son build-time → requieren redeploy si cambian.
- [ ] `NEXT_PUBLIC_APP_URL` = URL de prod **sin barra final**; es el redirect de Enable Banking
      (`/api/banking/callback`) y debe estar dada de alta como redirect URI en su panel.
- [ ] **Migraciones de Supabase aplicadas en el proyecto de Production.** Si el release incluye
      migraciones, esto va **antes** del merge a `main`, no después.
- [ ] `pnpm test`, `pnpm lint` y `pnpm build` pasan en local.

Las tres primeras las verifica el **usuario** (el agente no tiene acceso a los paneles): si el
release toca env vars o migraciones, preguntar explícitamente antes de mergear a `main`.

---

## Coreografía

Con la versión aprobada (`vX.Y.Z`) y `develop` actualizada.

### 1. Bump de versión

Editar en el working tree, sobre `develop`:

- `package.json` → `"version": "X.Y.Z"`
- `CHANGELOG.md` → nueva fila al principio de la tabla, con las notas redactadas por el hilo principal

```bash
git checkout develop && git pull
git checkout -b release/vX.Y.Z
git commit -am "chore(release): vX.Y.Z"
git push -u origin release/vX.Y.Z
```

Antes de abrir el PR, ejecutar **siempre** las validaciones (nunca `--no-verify`):

```bash
pnpm test && pnpm lint && pnpm build
```

Si algo falla, **parar y reportar**. Abrir PR `release/vX.Y.Z` → `develop` y mergear con **squash**
una vez la CI esté en verde:

```bash
gh pr merge <n> --squash
```

### 2. PR develop → main

```bash
gh pr create --base main --head develop --title "Release vX.Y.Z"
```

Ambas ramas tienen protección: el check `lint-test-build` (CI) y Vercel deben pasar. El auto-merge
está deshabilitado, así que hay que esperar y mergear a mano:

```bash
gh pr checks <n> --watch
gh pr merge <n> --merge      # merge commit — NO squash: conserva el historial
```

> El PR `develop` → `main` va con **merge commit** para preservar el historial de commits del
> release. Las feature PRs hacia `develop` van con `--squash`.

El merge a `main` dispara el deploy de producción en Vercel.

### 3. Tag y GitHub Release

```bash
git checkout main && git pull
git tag -a vX.Y.Z -m "Release vX.Y.Z — <resumen>"
git push origin vX.Y.Z
gh release create vX.Y.Z --title "vX.Y.Z" --notes "<las notas del CHANGELOG>"
git checkout develop
```
