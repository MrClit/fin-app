-- ReDoS hardening (issue #182): acota la longitud del patrón de regla en el único
-- límite de escritura real. La validez/complejidad de la regex se valida en la app
-- (lib/categories/rules.ts → validateRulePattern); no es práctico en SQL.
-- Mantener el 200 sincronizado con MAX_PATTERN_LENGTH.

ALTER TABLE categorization_rules
  ADD CONSTRAINT categorization_rules_pattern_len
  CHECK (char_length(pattern) BETWEEN 1 AND 200);
