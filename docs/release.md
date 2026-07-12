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
| `v0.9.1` | 2026-07-12 | Fixes: la cuenta «Manual» se crea en el bootstrap del hogar en vez de en el render (#323), los no leídos anteriores a la ventana de 90 días ya se cargan (#302). Refactors: acceso a datos de cuentas y movimientos unificado en `lib/` (#318), preámbulo de auth y manejo de errores extraídos a `withAuth`/`withUser` (#317), fallback de error duplicado a componente compartido (#303), root layout limpiado y escala de z-index ordenada (#304). |
| `v0.9.0` | 2026-07-08 | Renombrado de la app a «Nummo» con logo nuevo (#298). Scrapers: el cron ejecuta siempre `origin/main` vía worktree dedicado + wrapper (#256), notificación de fallos de scraping/webhook bajo cron (#295), manejo del modal «Confirmar dispositivo» en el login Sabadell (#286). |
| `v0.8.0` | 2026-07-05 | Integración del plan de ahorro Sabadell (#197): nuevo tipo de cuenta `savings`, módulo `sabadell-shared` reutilizable + cierre automático del aviso de DNI caducado, endpoint `/api/sabadell-savings` con categorización por concepto (REVALORIZACION→returns, aportación→savings) y scraper del plan de ahorro (Bansabadell Vida). |
| `v0.7.0` | 2026-07-04 | Bloque-veredicto (ahorro + KPIs) en la cabecera de Análisis (#283). Fix: el proxy exime `/api/scrapers` del chequeo de sesión (#284). |
| `v0.6.0` | 2026-07-03 | Clientes de Supabase tipados con `Database` generado y tipos de dominio derivados (#269, #268), período inicial de análisis resuelto en servidor (#235), título de pestaña por sección (#238). Seguridad: RLS de `household_members` restringida al owner (#234), endpoint público de error-log endurecido (#233), `setAll` protegido con try/catch (#237). Perf: dedupe de `getUser()`/`household_id` por request con `cache()` (#236). Fixes de analytics/dashboard: total gasto/ingreso unificado (#272), hydration del Donut (#276), contraste del pill semanal (#278). |
| `v0.5.0` | 2026-06-30 | Avisos in-app de fallo de scrapers (#177). Fixes: login de Sabadell VISA y navegación post-login (#212), resolución determinista del owner del hogar en webhooks (#257), Edenred blur antes del click de login (#253). |
| `v0.4.0` | 2026-06-20 | Cifras tabulares para todos los importes (#243), push al iPhone al fallar el scraper de Sabadell VISA (#213), versión de release en login + acceso solo con Google (#226). Seguridad: RLS en `categories` (#232) y retirada de la MV `transactions_monthly_summary` (#231). |
| `v0.3.0` | 2026-06-18 | Sección «No leídos» de transacciones: reorganización en vivo (#219) con animación de entrada/salida (#221) y revalidación del badge al volver a primer plano (#214, #217). |
| `v0.2.0` | 2026-06-17 | Observabilidad (error_log #200) y mejoras del scraper Edenred: auto-relogin (#208) y push accionable ante 2FA (#204). |
| `v0.1.1` | 2026-06-13 | Primer release con versionado SemVer. 5 fixes de seguridad (#178, #179, #180, #182, #191). |
