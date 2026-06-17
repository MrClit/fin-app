# fin-app

App web personal de gestión y análisis de finanzas. Stack: Next.js 16 (App Router) + TypeScript, Supabase, Tailwind CSS v4.

## Cron de Edenred

El scraper de Edenred (`scripts/scrapers/edenred/scrape.mjs`) se ejecuta **cada día a las 07:00 hora local** mediante un agente de `launchd` en el Mac del usuario.

> **¿Por qué local y no en GitHub Actions?** Edenred valida la IP de origen de la sesión: una sesión creada desde una IP residencial española queda invalidada al usarla desde el datacenter de GitHub. Probado y descartado. Ejecutar el cron desde el Mac evita el problema, a costa de que el Mac tiene que estar encendido a la hora del scrape (si no, se salta ese día).

### Requisitos previos

- `.env.scrapers` con los secrets que necesita el scraper (fichero de producción de scrapers, separado de `.env.local` que es solo para la app de desarrollo — issue #201):
  | Variable | Valor |
  |---|---|
  | `EDENRED_WEBHOOK_SECRET` | mismo valor que en Vercel (generado con `openssl rand -hex 32`) |
  | `APP_URL` | URL del deploy donde vive el webhook (`https://<...>.vercel.app`, sin barra final) |
  | `EDENRED_USER` | email de edenred.es (para `scrape:edenred:login` y el auto-relogin de `scrape:edenred`) |
  | `EDENRED_PASS` | contraseña de edenred.es (para `scrape:edenred:login` y el auto-relogin de `scrape:edenred`) |
- Sesión válida en `scripts/scrapers/edenred/storage-state.json` — la generas con `pnpm scrape:edenred:login`.
- `pnpm` instalado y en el `PATH`.

### Instalar el cron

Desde la raíz del proyecto:

```bash
./scripts/scrapers/edenred/install-launchd.sh
```

El script:

1. Genera `~/Library/LaunchAgents/com.fin-app.edenred-scraper.plist` apuntando al directorio actual del proyecto y al `pnpm` que tenga tu shell en el `PATH`.
2. Lo registra con `launchctl load`. Se ejecuta en varios slots diarios (07, 10, 13, 16, 19, 22 hora local) y, gracias a `RunAtLoad`, también intenta un scrape **inmediato** al instalar el agente o al reiniciar el Mac — así ves el resultado en segundos sin esperar al siguiente slot. El marker diario (`~/Library/Logs/fin-app/edenred-last-success.YYYY-MM-DD`) evita que se ejecute dos veces el mismo día.
3. Crea `~/Library/Logs/fin-app/` para los logs (`edenred-scraper.out.log` y `edenred-scraper.err.log`).

### Verificar y operar

```bash
launchctl list | grep edenred-scraper      # confirma que está cargado
launchctl start com.fin-app.edenred-scraper # dispararlo a mano (no-op si ya hubo éxito hoy)
tail -f ~/Library/Logs/fin-app/edenred-scraper.out.log
tail -f ~/Library/Logs/fin-app/edenred-scraper.err.log
```

Para **forzar** un re-scrape aunque ya exista el marker del día (sin borrar ficheros ni desexportar `EDENRED_CRON`):

```bash
pnpm scrape:edenred:force
```

Tras una ejecución exitosa:
- En `/cuentas`, la card Edenred muestra balance actualizado e indicador verde "hace menos de 1 hora".
- En `/movimientos`, las transacciones aparecen con `category='restaurant'`, salvo aquellas cuya descripción sea `RECARGA` (top-up de la empresa), que entran con `category='income'` y `amount` positivo.

### Regenerar la sesión cuando caduca

Cuando la sesión `storage-state.json` caduca, el scraper se recupera **solo** en el caso mayoritario: si Edenred solo pide usuario/contraseña (sin 2FA), `scrape:edenred` reenvía `EDENRED_USER`/`EDENRED_PASS` en la misma ejecución headless, guarda la sesión nueva (con backup del state anterior) y continúa el scrape sin abortar. No hay que intervenir.

Solo se requiere intervención humana cuando Edenred pide **2FA** (código por email). En ese caso el scraper sale con **exit code 2** y hay que regenerar la sesión a mano:

```bash
pnpm scrape:edenred:login   # abre Chromium, completas 2FA, ENTER al final
```

`scripts/scrapers/edenred/storage-state.json` se actualiza y el siguiente run del cron volverá a funcionar. No hay que reinstalar el agente.

> **Guard anti-spam de 2FA.** Si el auto-relogin desemboca en 2FA, el scraper crea el marker `~/Library/Logs/fin-app/edenred-2fa-pending` y deja de reintentar el auto-login en los siguientes slots del cron — así no reenvía credenciales una y otra vez disparando un email de código nuevo cada vez. Un `pnpm scrape:edenred:login` exitoso borra el marker y re-arma el auto-relogin.

### Desinstalar

```bash
./scripts/scrapers/edenred/install-launchd.sh --uninstall
```

## Cron de Enable Banking

El sync de Enable Banking se ejecuta **cada día a las 06:00 Europe/Madrid** mediante GitHub Actions ([.github/workflows/enablebanking-sync.yml](.github/workflows/enablebanking-sync.yml)).

> **¿Por qué GitHub Actions y no launchd local como Edenred?** Enable Banking es una API PSD2 oficial: los tokens OAuth viven en `accounts.session_id` y la llamada saliente desde el servidor a `api.enablebanking.com` no depende de la IP de origen (a diferencia de Edenred). GitHub Actions corre 24/7 sin depender de que el Mac esté encendido, lo cual importa porque el consentimiento PSD2 caduca a 90 días.

### Secrets requeridos

| GitHub Secret | Valor |
|---|---|
| `ENABLEBANKING_WEBHOOK_SECRET` | mismo valor que en Vercel (generado con `openssl rand -hex 32`) |
| `APP_URL` | URL del deploy donde vive el endpoint (`https://<...>.vercel.app`, sin barra final). Es la misma URL de producción que usan los scrapers, pero aquí es un GitHub Secret del workflow EB (los scrapers la leen de `.env.scrapers`). |

Además, el endpoint vive en Vercel y necesita `ENABLEBANKING_WEBHOOK_SECRET` configurado como env var en Vercel (mismo valor que en GitHub).

### Disparar manualmente

Desde la pestaña Actions del repo → "Enable Banking sync" → "Run workflow". O por CLI:

```bash
gh workflow run enablebanking-sync.yml
```

### Verificar y operar

Los logs de cada run están en la pestaña Actions del repo. Una ejecución correcta devuelve `{ synced, accounts, failed }`:
- `synced`: nº de transacciones upserteadas.
- `accounts`: nº total de cuentas EB activas procesadas.
- `failed`: cuentas con error parcial (consentimiento caducado, token expirado, etc.). El run sigue siendo HTTP 200 — los errores parciales no abortan el cron, pero quedan logueados.

El run falla con código HTTP no-2xx solo si el endpoint devuelve 5xx (DB inalcanzable, secret mal configurado).

## Comandos

- `pnpm dev` — desarrollo local
- `pnpm build` — compilar para producción
- `pnpm test` — tests Vitest
- `pnpm scrape:edenred` — ejecutar el scraper (requiere `scripts/scrapers/edenred/storage-state.json` válido)
- `pnpm scrape:edenred:force` — ejecutar el scraper ignorando el marker diario (re-ejecuta aunque ya haya corrido hoy)
- `pnpm scrape:edenred:login` — regenerar `scripts/scrapers/edenred/storage-state.json` con login manual
