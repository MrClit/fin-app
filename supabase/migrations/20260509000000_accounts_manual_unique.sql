-- Limpiar duplicados primero: conservar el más antiguo por usuario, eliminar el resto.
DELETE FROM accounts
WHERE source = 'manual'
  AND id NOT IN (
    SELECT DISTINCT ON (user_id) id
    FROM accounts
    WHERE source = 'manual'
    ORDER BY user_id, created_at ASC
  );

-- Ahora que no hay duplicados, crear el índice único parcial.
-- Un índice parcial es más limpio que un unique en (user_id, source) porque
-- source puede repetirse para otros valores (enablebanking puede tener N cuentas).
CREATE UNIQUE INDEX IF NOT EXISTS accounts_user_manual_unique
  ON accounts(user_id)
  WHERE source = 'manual';
