-- GENERATED FILE — no editar a mano. Regenerar con: pnpm seed:categories
-- Sincroniza la tabla `categories` con lib/categories/catalog.ts (fuente única, issue #175).
-- Ejecutar en el Supabase SQL Editor como un único bloque cada vez que cambie el catálogo.
--
-- El DELETE final fallará por FK si una categoría retirada aún tiene transacciones
-- o reglas asociadas: en ese caso hace falta antes una migración de repunte
-- (patrón alta→repunte→baja, ver #151 y #174).

INSERT INTO categories (id, name, color, type, sort_order) VALUES
  ('groceries', 'Supermercado', '#22c55e', 'expense', 1),
  ('restaurant', 'Restaurantes', '#f59e0b', 'expense', 2),
  ('transport', 'Transporte público', '#8b5cf6', 'expense', 3),
  ('fuel', 'Gasolina', '#7c3aed', 'expense', 4),
  ('parking', 'Parking y Peaje', '#6d28d9', 'expense', 5),
  ('vehicle', 'Vehículo', '#5b21b6', 'expense', 6),
  ('mortgage', 'Hipoteca / Alquiler', '#0284c7', 'expense', 7),
  ('community_fees', 'Comunidad de vecinos', '#0369a1', 'expense', 8),
  ('electricity', 'Electricidad', '#f59e0b', 'expense', 9),
  ('gas', 'Gas natural', '#d97706', 'expense', 10),
  ('water', 'Agua', '#06b6d4', 'expense', 11),
  ('internet', 'Internet / Telefonía', '#0891b2', 'expense', 12),
  ('home', 'Hogar', '#0e7490', 'expense', 13),
  ('clothing', 'Ropa y calzado', '#ec4899', 'expense', 14),
  ('shopping', 'Compras', '#db2777', 'expense', 15),
  ('electronics', 'Electrónica', '#9333ea', 'expense', 16),
  ('health', 'Salud', '#10b981', 'expense', 17),
  ('pharmacy', 'Farmacia', '#059669', 'expense', 18),
  ('leisure', 'Ocio', '#ef4444', 'expense', 19),
  ('sports', 'Deporte', '#dc2626', 'expense', 20),
  ('subscriptions', 'Suscripciones', '#f97316', 'expense', 21),
  ('travel', 'Viajes', '#0ea5e9', 'expense', 22),
  ('education', 'Educación', '#a855f7', 'expense', 23),
  ('insurance_health', 'Seguro salud', '#84cc16', 'expense', 24),
  ('insurance_home', 'Seguro hogar', '#0d9488', 'expense', 25),
  ('insurance_auto', 'Seguro auto', '#65a30d', 'expense', 26),
  ('domestic_help', 'Servicio doméstico', '#14b8a6', 'expense', 27),
  ('beauty', 'Cuidado personal', '#f472b6', 'expense', 28),
  ('gifts', 'Regalos', '#fb7185', 'expense', 29),
  ('charity', 'Solidaridad', '#4ade80', 'expense', 30),
  ('memberships', 'Asociaciones', '#a3e635', 'expense', 31),
  ('taxes', 'Impuestos', '#facc15', 'expense', 32),
  ('loans', 'Préstamos', '#fb923c', 'expense', 33),
  ('cash', 'Efectivo', '#a8a29e', 'expense', 34),
  ('fees', 'Comisiones', '#94a3b8', 'expense', 35),
  ('other', 'Otros gastos', '#64748b', 'expense', 36),
  ('payroll', 'Nómina', '#3b82f6', 'income', 37),
  ('returns', 'Rendimientos', '#0284c7', 'income', 38),
  ('reimbursement', 'Reembolso', '#16a34a', 'income', 39),
  ('other_income', 'Otros ingresos', '#6366f1', 'income', 40),
  ('investment', 'Inversión', '#059669', 'non_computable', 41),
  ('savings', 'Ahorro', '#0d9488', 'non_computable', 42),
  ('transfer', 'Transferencia interna', '#78716c', 'non_computable', 43),
  ('loan_payment', 'Amortización', '#b45309', 'non_computable', 44),
  ('card_payment', 'Pago tarjeta crédito', '#a8a29e', 'non_computable', 45)
ON CONFLICT (id) DO UPDATE
  SET name       = EXCLUDED.name,
      color      = EXCLUDED.color,
      type       = EXCLUDED.type,
      sort_order = EXCLUDED.sort_order;

DELETE FROM categories
WHERE id NOT IN ('groceries', 'restaurant', 'transport', 'fuel', 'parking', 'vehicle', 'mortgage', 'community_fees', 'electricity', 'gas', 'water', 'internet', 'home', 'clothing', 'shopping', 'electronics', 'health', 'pharmacy', 'leisure', 'sports', 'subscriptions', 'travel', 'education', 'insurance_health', 'insurance_home', 'insurance_auto', 'domestic_help', 'beauty', 'gifts', 'charity', 'memberships', 'taxes', 'loans', 'cash', 'fees', 'other', 'payroll', 'returns', 'reimbursement', 'other_income', 'investment', 'savings', 'transfer', 'loan_payment', 'card_payment');
