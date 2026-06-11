# Enable Banking — Log de integración

> Registro completo de problemas encontrados y soluciones aplicadas durante la integración del flujo OAuth PSD2 con Enable Banking en fin-app (Next.js 16 App Router + TypeScript).
> Issue: [#14 — \[feature\] Enable Banking: flujo OAuth + conexión de cuenta](https://github.com/MrClit/fin-app/issues/14)
> Rama: `feature/enable-banking-oauth` — [PR #18](https://github.com/MrClit/fin-app/pull/18)

---

## Estado actual (2026-05-06)

El flujo **llega a hacer llamadas correctas a la API de Enable Banking** pero está bloqueado en la configuración de la redirect URL, que debe ser HTTPS. El entorno local usa HTTP y los túneles probados (localtunnel, ngrok) tienen fricción adicional. **Pendiente: probar en el preview de Vercel del PR.**

---

## Credenciales

- **`ENABLEBANKING_APP_ID`** — UUID de la aplicación registrada en el Developer Portal. Coincide con el nombre del fichero `.pem` descargado.
- **`ENABLEBANKING_SECRET_KEY`** — Clave privada RSA-4096 en formato PKCS8 (`BEGIN PRIVATE KEY`). **El portal de Enable Banking genera el par de claves y entrega solo la clave privada.** No hay que generar claves ni subir clave pública — el portal ya tiene la pública internamente.

Ambas variables están en `.env.local`. La clave privada es multilínea y debe ir entre comillas dobles:
```
ENABLEBANKING_SECRET_KEY="-----BEGIN PRIVATE KEY-----
MIIEvQ...
-----END PRIVATE KEY-----"
```
Next.js/dotenv lo parsea correctamente con las comillas.

---

## Problemas encontrados y soluciones

### 1. Algoritmo JWT incorrecto: ES256 → RS256

**Error:** `Invalid key type` en `importPKCS8`

**Causa:** La implementación inicial asumía que Enable Banking usa ECDSA P-256 (ES256). La clave descargada del portal es RSA-4096, que requiere RS256.

**Diagnóstico:**
```bash
openssl pkey -in docs/3dea7d0f-....pem -text -noout | head -1
# RSA Private-Key: (4096 bit)
```

**Solución:** Cambiar `'ES256'` por `'RS256'` en `importPKCS8` y en el header del JWT.

---

### 2. JWT — claim `aud` faltante

**Error:** `401 — {"message": "aud is missing in JWT body"}`

**Causa:** El JWT no incluía el claim `aud` (audience).

**Solución:** Añadir `.setAudience('api.enablebanking.com')`. El valor correcto es `"api.enablebanking.com"` (sin `https://`). Valores incorrectos probados: `"enablebanking"`.

---

### 3. JWT — claim `aud` incorrecto

**Error:** `401 — {"message": "JWT audience is not valid"}`

**Causa:** El valor `"enablebanking"` no era el audience correcto.

**Solución:** El audience correcto es `"api.enablebanking.com"`.

---

### 4. JWT — claim `iss` incorrecto

**Causa:** El `iss` (issuer) se ponía como el `APP_ID`. Enable Banking espera `"enablebanking.com"`.

**Solución:** `.setIssuer('enablebanking.com')`

**Resumen de claims JWT correctos:**
```json
Header: { "alg": "RS256", "kid": "<APP_ID>" }
Body:   { "iss": "enablebanking.com", "aud": "api.enablebanking.com", "iat": ..., "exp": ... }
```

---

### 5. Endpoint incorrecto: `/application/sessions` → `/auth`

**Error:** `404 — {"detail": "Not Found"}`

**Causa:** La documentación inicial llevó a usar `POST /application/sessions`, que no existe.

**Flujo real de la API:**
```
POST /auth       → devuelve { url, authorization_id }
                   (url = redirect al banco para que el usuario autorice)

[Usuario autoriza en el banco]

Callback recibe: ?code=xxx  (NO session_id)

POST /sessions   → body: { code }
                 → devuelve { session_id, accounts[], access.valid_until }
```

**Archivos afectados:**
- `lib/enablebanking.ts` — renombrar `createSession` → `initiateAuth` (llama a `/auth`) y `getSession` → `createSessionFromCode` (llama a `POST /sessions`)
- `app/api/banking/callback/route.ts` — leer `?code=` en lugar de `?session_id=`

---

### 6. `/auth` requiere `aspsp` y `state`

**Error:** `422 — {"error":"WRONG_REQUEST_PARAMETERS","detail":[{"loc":["body","aspsp"],"msg":"Field required"}, {"loc":["body","state"],"msg":"Field required"}]}`

**Causa:** El endpoint `POST /auth` requiere obligatoriamente:
- `aspsp: { name: string, country: string }` — el banco al que conectar
- `state: string` — string aleatorio anti-CSRF

**Implicación de diseño:** No hay selector de banco en la UI del banco, hay que pre-seleccionarlo. Enable Banking tiene un endpoint `GET /aspsps?country=XX` para listar los bancos disponibles por país.

**Solución implementada:**
- Nuevo endpoint `GET /api/banking/aspsps?country=XX` que consulta la lista de bancos
- `ConnectBankButton` expandido con un selector de país + lista de bancos antes de conectar
- `state` generado con `crypto.randomUUID()` en cada llamada

**Body completo de `POST /auth`:**
```json
{
  "aspsp": { "name": "Banco Santander", "country": "ES" },
  "access": { "valid_until": "2026-08-03T..." },
  "state": "uuid-aleatorio",
  "redirect_url": "https://tu-app.com/api/banking/callback",
  "psu_type": "personal"
}
```

---

### 7. `NEXT_PUBLIC_APP_URL` = `undefined` → redirect_url inválida

**Error:** `422 — {"detail":[{"loc":["body","redirect_url"],"msg":"Input should be a valid URL","input":"undefined/api/banking/callback"}]}`

**Causa:** Un script Python usado anteriormente para escribir `ENABLEBANKING_SECRET_KEY` en `.env.local` usaba `re.DOTALL` en el regex, lo que hacía que el patrón `ENABLEBANKING_SECRET_KEY=.*` consumiera todo el contenido del fichero hasta el final, borrando `NEXT_PUBLIC_APP_URL` y `EDENRED_WEBHOOK_SECRET`.

**Solución:** Restaurar manualmente en `.env.local`:
```
EDENRED_WEBHOOK_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

### 8. HTTPS requerido para la redirect URL

**Error:** `400 — {"error":"REDIRECT_URI_NOT_ALLOWED"}`

**Causa:** Enable Banking **no acepta URLs HTTP** como redirect URI. Solo HTTPS. En desarrollo local (`http://localhost:3000`) no funciona.

**Opciones probadas para desarrollo local:**

| Opción | Resultado |
|--------|-----------|
| `http://localhost:3000` | ❌ Rechazado por Enable Banking |
| `localtunnel` (`npx localtunnel --port 3000`) | ⚠️ Genera URL HTTPS pero requiere registrarla en el portal y a veces pide tunnel password |
| `ngrok` | ⚠️ Requiere cuenta registrada y authtoken |

**Solución pendiente:** Usar el **preview de Vercel del PR #18** como entorno de prueba:
1. Esperar a que el preview esté activo
2. Añadir en Vercel → Environment Variables (Preview): `ENABLEBANKING_APP_ID`, `ENABLEBANKING_SECRET_KEY`, `NEXT_PUBLIC_APP_URL=https://url-del-preview.vercel.app`
3. Registrar `https://url-del-preview.vercel.app/api/banking/callback` en Enable Banking portal
4. Hacer redeploy del preview

---

### 9. Scroll bloqueado en `/onboarding`

**Causa:** El `<body>` del root layout (`app/layout.tsx`) tenía la clase `overflow-clip`, que bloquea el scroll en toda la app, incluyendo páginas que legítimamente necesitan scroll (como onboarding cuando se abre el selector de banco).

**Nota:** El layout de `(app)` ya tiene `overflow-clip` en su propio contenedor, así que el `body` no necesitaba esa clase.

**Solución:** Eliminar `overflow-clip` del `body` en `app/layout.tsx`.

---

### 10. Caché de Next.js corrupta

**Síntoma:** Todas las rutas devolvían 404 tras reiniciar el servidor.

**Solución:**
```bash
rm -rf .next
pnpm dev
```

---

## Estructura de ficheros relevantes

```
lib/
└── enablebanking.ts          # signJWT (RS256), initiateAuth (/auth), createSessionFromCode (/sessions)

app/api/banking/
├── connect/route.ts          # POST → llama initiateAuth, devuelve { url }
├── callback/route.ts         # GET ?code=xxx → llama createSessionFromCode, guarda accounts
└── aspsps/route.ts           # GET ?country=XX → lista bancos disponibles

components/accounts/
├── AccountCard.tsx            # Server Component, muestra cuenta con saldo y badge PSD2/Scraper
└── ConnectBankButton.tsx      # Client Component, selector país+banco + POST /api/banking/connect

components/onboarding/
└── OnboardingClient.tsx       # Client Component, reutiliza ConnectBankButton

app/(app)/cuentas/page.tsx     # Server Component, lee accounts de Supabase
app/onboarding/page.tsx        # Server Component (fuera del grupo (app)), verifica has_onboarded
```

---

## Variables de entorno necesarias

```bash
# Supabase (ya configuradas)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Enable Banking
ENABLEBANKING_APP_ID=3dea7d0f-87a5-4cf2-9ec7-3e42c44d09db
ENABLEBANKING_SECRET_KEY="-----BEGIN PRIVATE KEY-----
...clave RSA-4096 PKCS8...
-----END PRIVATE KEY-----"

# App (debe ser HTTPS para que Enable Banking acepte la redirect URL)
NEXT_PUBLIC_APP_URL=https://tu-dominio.com
```

---

## Pendiente

- [ ] Probar el flujo completo en el preview de Vercel del PR #18
- [ ] Verificar que `GET /api/banking/aspsps?country=ES` devuelve bancos correctamente
- [ ] Verificar que el callback procesa bien el `code` y guarda las cuentas en Supabase
- [ ] Aplicar la migración SQL en Supabase: `supabase/migrations/20260506000000_accounts_unique_external_id.sql`
- [ ] (Futura issue) Sincronización de saldos y transacciones tras la conexión
