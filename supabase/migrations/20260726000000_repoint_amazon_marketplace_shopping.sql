-- Issue #391: repunte de las compras de Amazon Marketplace mal categorizadas.
--
-- La regla de suscripciones de lib/categories/rules.ts incluía `amzn\.com\/bill`
-- en su patrón. Ese no es un identificador de suscripción sino el dominio por el
-- que Amazon factura TODO: Prime y las compras del Marketplace. Como `AUTO_RULES`
-- devuelve la primera regla que casa y suscripciones precede a la genérica de
-- compras, toda compra facturada por ese dominio acababa en `subscriptions`.
--
-- La regla ya está corregida, pero la categorización corre en la INGESTA: las filas
-- ya guardadas no se recalculan solas ni con un re-sync (Enable Banking upsertea con
-- ignoreDuplicates: true). De ahí este repunte.
--
-- El WHERE reproduce exactamente lo que decidiría la regla nueva —Amazon va a
-- `shopping` salvo que la marca diga suscripción— para que el histórico quede
-- coherente con lo que hará la ingesta a partir de ahora.
--
-- Escribe en `category`, NUNCA en `category_manual`: nada automático pisa la
-- corrección del usuario, y `category_manual` es la única fuente de la que aprende
-- `get_learned_categories` (#359). Por eso el filtro exige `category_manual IS NULL`:
-- una fila que el usuario ya haya tocado a mano no se toca.
--
-- Ejecutar en Supabase SQL Editor como un único bloque.
-- No altera esquema: no requiere `pnpm gen:types`.

-- Comprobación previa (opcional, para ejecutar suelta antes del UPDATE):
--
--   SELECT date, amount, description, category
--   FROM   transactions
--   WHERE  category = 'subscriptions'
--     AND  category_manual IS NULL
--     AND  description ~* 'amzn|amazon'
--     AND  description !~* 'amazon prime|prime video|audible|kindle unlimited|amazon music';

UPDATE transactions
SET    category = 'shopping'
WHERE  category = 'subscriptions'
  AND  category_manual IS NULL
  AND  description ~* 'amzn|amazon'
  AND  description !~* 'amazon prime|prime video|audible|kindle unlimited|amazon music';
