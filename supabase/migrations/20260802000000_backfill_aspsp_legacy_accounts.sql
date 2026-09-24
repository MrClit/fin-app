-- Backfill del ASPSP en las cuentas de Enable Banking heredadas.
--
-- Las cuentas conectadas antes de #79 se guardaron sin `aspsp_name` /
-- `aspsp_country`: el flujo de conexión de entonces no persistía el banco. Sin
-- esos dos campos, `/api/banking/renew` devuelve 422 `aspsp_unknown` y el botón
-- «Renovar conexión» de la card queda en un callejón sin salida — no puede
-- reconstruir el `aspsp` que exige `initiateAuth`.
--
-- El banco se deduce del IBAN: en un IBAN español las posiciones 5-8 son el
-- código de entidad, y 0081 es Banco de Sabadell. El nombre debe coincidir
-- EXACTAMENTE con el del catálogo de Enable Banking (`GET /aspsps?country=ES`),
-- que es lo que viaja en el `state` y en el cuerpo de `POST /auth`:
-- «Banco de Sabadell», país ES.
--
-- Sólo toca filas con el ASPSP a NULL: una cuenta conectada por el flujo actual
-- ya lo tiene bien y no se pisa. No altera esquema: no requiere `pnpm gen:types`.
--
-- Ejecutar en Supabase SQL Editor como un único bloque.

-- Comprobación previa (opcional, para ejecutar suelta antes del UPDATE):
--
--   SELECT id, name, iban, aspsp_name, aspsp_country, consent_expires_at
--   FROM   accounts
--   WHERE  source = 'enablebanking'
--     AND  aspsp_name IS NULL;

UPDATE accounts
SET    aspsp_name    = 'Banco de Sabadell',
       aspsp_country = 'ES'
WHERE  source = 'enablebanking'
  AND  aspsp_name IS NULL
  AND  replace(upper(iban), ' ', '') LIKE 'ES__0081%';
