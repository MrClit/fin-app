-- Corrige el signo de los consumos de Edenred guardados en positivo (#413).
--
-- Entre el 17/08 y el 03/09/2026 Edenred empezó a mostrar el signo en la tabla
-- de movimientos ("-11,90 €"). El scraper seguía negando todo lo que no fuera
-- "RECARGA", así que cada consumo se guardó invertido: +111,80 € en 10 filas.
--
-- Se listan por `external_id` y no con una regla sobre `amount > 0`: una
-- devolución real también es positiva y no debe tocarse. Las 10 son consumos:
-- 8 verificados en vivo en Edenred (salen en negativo); los 2 del 01/09 y el
-- 04/09 17:25 ya no aparecen en la ventana, pero son pagos en restaurante.
-- El `amount > 0` hace el UPDATE idempotente.
--
-- ORDEN: aplicar DESPUÉS de que el fix del scraper llegue a `main`. El cron
-- ejecuta el scraper desde origin/main (#299) y reescribe las filas que ve
-- (`ignoreDuplicates: false`): con el código viejo volvería a invertirlas.
--
-- No altera esquema: no requiere `pnpm gen:types`.
-- Ejecutar en Supabase SQL Editor como un único bloque.

-- Comprobación previa (opcional): deben salir 10 filas, todas en positivo.
--
--   SELECT t.external_id, t.date, t.amount, t.description
--   FROM   transactions t
--   JOIN   accounts a ON a.id = t.account_id
--   WHERE  a.type = 'edenred'
--     AND  t.external_id IN (… la misma lista …);

UPDATE transactions t
SET    amount = -t.amount
FROM   accounts a
WHERE  a.id = t.account_id
  AND  a.type = 'edenred'
  AND  t.amount > 0
  AND  t.external_id IN (
         'edenred-2026-09-01-19:57:04',
         'edenred-2026-09-04-17:25:42',
         'edenred-2026-09-04-17:30:38',
         'edenred-2026-09-05-09:17:19',
         'edenred-2026-09-05-11:45:47',
         'edenred-2026-09-11-20:23:02',
         'edenred-2026-09-12-13:23:32',
         'edenred-2026-09-18-16:23:25',
         'edenred-2026-09-19-08:47:01',
         'edenred-2026-09-19-10:03:54'
       );
