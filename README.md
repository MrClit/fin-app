# fin-app

App web personal de gestión y análisis de finanzas. Stack: Next.js 16 (App Router) + TypeScript, Supabase, Tailwind CSS v4.

## Cron de Edenred

El workflow [.github/workflows/edenred-scraper.yml](.github/workflows/edenred-scraper.yml) ejecuta el scraper de Edenred una vez al día (06:00 UTC = 07:00 Madrid en invierno / 08:00 en verano) y también puede dispararse a mano desde la pestaña **Actions → Edenred scraper → Run workflow**.

> **Aviso sobre el `schedule`**: GitHub Actions solo dispara `schedule` desde el fichero del workflow tal como esté en la rama default del repo (`main`). Mientras el workflow viva en otra rama (p.ej. `develop`), el cron **no se ejecutará automáticamente**; solo funcionará `workflow_dispatch` seleccionando esa rama. El cron empezará a las 06:00 UTC en cuanto se haga el merge a `main`.

### Secrets requeridos

Configurar en `Settings → Secrets and variables → Actions → New repository secret`.

| Secret | Para qué se usa | Cómo obtenerlo |
|---|---|---|
| `EDENRED_STORAGE_STATE` | cron diario | base64 de `scripts/storage-state.json` tras `pnpm scrape:edenred:login`. Comando: `base64 -i scripts/storage-state.json` |
| `EDENRED_WEBHOOK_SECRET` | cron diario + endpoint Vercel | mismo valor que `.env.local` (generado con `openssl rand -hex 32`). **Debe estar también en Vercel** para que el endpoint `/api/edenred` valide la auth |
| `APP_URL` | cron diario | URL de producción de Vercel (`https://<...>.vercel.app`), sin barra final |
| `EDENRED_USER` | regenerar sesión local | email de edenred.es. **No se inyecta en el cron**; solo se usa en `pnpm scrape:edenred:login` |
| `EDENRED_PASS` | regenerar sesión local | contraseña de edenred.es. **No se inyecta en el cron**; solo se usa en `pnpm scrape:edenred:login` |

### Verificar que funciona

1. Configurados los 3 secrets de runtime (`EDENRED_STORAGE_STATE`, `EDENRED_WEBHOOK_SECRET`, `APP_URL`), ir a **Actions → Edenred scraper → Run workflow** y seleccionar la rama.
2. Esperar a que el run termine en verde (≤ 2 min).
3. Abrir `/cuentas` en la app: la card de Edenred debe mostrar balance actualizado e indicador verde "hace menos de 1 hora".
4. Abrir `/movimientos` y filtrar por la cuenta Edenred: las transacciones aparecen con `category='restaurant'`, salvo las cuya descripción sea `RECARGA` (entran como `category='income'` con amount positivo).
5. Relanzar el workflow: las transacciones no se duplican (upsert por `external_id` en el webhook).

### Regenerar la sesión cuando caduca

El scraper sale con **exit code 2** si Edenred pide login o 2FA. En ese caso hay que regenerar `storage-state.json` localmente:

```bash
pnpm scrape:edenred:login                 # abre Chromium, completas 2FA, ENTER al final
base64 -i scripts/storage-state.json | gh secret set EDENRED_STORAGE_STATE
```

`scripts/storage-state.json` está en `.gitignore` y nunca se commitea.

## Comandos

- `pnpm dev` — desarrollo local
- `pnpm build` — compilar para producción
- `pnpm test` — tests Vitest
- `pnpm scrape:edenred` — ejecutar el scraper (requiere storage-state válido)
- `pnpm scrape:edenred:login` — regenerar storage-state con login manual
