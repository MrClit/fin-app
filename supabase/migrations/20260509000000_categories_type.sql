-- Tabla de categorías con tipo (expense / income / non_computable)
-- Ref: issue #32 — necesaria para queries de Análisis (Fase 4)

CREATE TABLE IF NOT EXISTS categories (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  color      TEXT NOT NULL,
  type       TEXT NOT NULL CHECK (type IN ('expense', 'income', 'non_computable')),
  sort_order INT  NOT NULL DEFAULT 0
);

-- Sin RLS: datos de referencia compartidos (no por usuario)

-- ─── GASTOS ──────────────────────────────────────────────────────────────────
INSERT INTO categories (id, name, color, type, sort_order) VALUES
  ('groceries',      'Supermercado',          '#22c55e', 'expense',         1),
  ('restaurant',     'Restaurantes',           '#f59e0b', 'expense',         2),
  ('transport',      'Transporte público',     '#8b5cf6', 'expense',         3),
  ('fuel',           'Gasolina',               '#7c3aed', 'expense',         4),
  ('parking',        'Parking y Peaje',        '#6d28d9', 'expense',         5),
  ('vehicle',        'Vehículo',               '#5b21b6', 'expense',         6),
  ('mortgage',       'Hipoteca / Alquiler',    '#0284c7', 'expense',         7),
  ('community_fees', 'Comunidad de vecinos',   '#0369a1', 'expense',         8),
  ('electricity',    'Electricidad',           '#f59e0b', 'expense',         9),
  ('gas',            'Gas natural',            '#d97706', 'expense',        10),
  ('water',          'Agua',                   '#06b6d4', 'expense',        11),
  ('internet',       'Internet / Telefonía',   '#0891b2', 'expense',        12),
  ('home',           'Hogar',                  '#0e7490', 'expense',        13),
  ('clothing',       'Ropa y calzado',         '#ec4899', 'expense',        14),
  ('shopping',       'Compras',                '#db2777', 'expense',        15),
  ('electronics',    'Electrónica',            '#9333ea', 'expense',        16),
  ('health',         'Salud',                  '#10b981', 'expense',        17),
  ('pharmacy',       'Farmacia',               '#059669', 'expense',        18),
  ('leisure',        'Ocio',                   '#ef4444', 'expense',        19),
  ('sports',         'Deporte',                '#dc2626', 'expense',        20),
  ('subscriptions',  'Suscripciones',          '#f97316', 'expense',        21),
  ('travel',         'Viajes',                 '#0ea5e9', 'expense',        22),
  ('education',      'Educación',              '#a855f7', 'expense',        23),
  ('insurance',      'Seguros',                '#84cc16', 'expense',        24),
  ('beauty',         'Cuidado personal',       '#f472b6', 'expense',        25),
  ('gifts',          'Regalos',                '#fb7185', 'expense',        26),
  ('charity',        'Solidaridad',            '#4ade80', 'expense',        27),
  ('memberships',    'Asociaciones',           '#a3e635', 'expense',        28),
  ('taxes',          'Impuestos',              '#facc15', 'expense',        29),
  ('loans',          'Préstamos',              '#fb923c', 'expense',        30),
  ('cash',           'Efectivo',               '#a8a29e', 'expense',        31),
  ('fees',           'Comisiones',             '#94a3b8', 'expense',        32),
  ('other',          'Otros gastos',           '#64748b', 'expense',        33),

-- ─── INGRESOS ────────────────────────────────────────────────────────────────
  ('payroll',        'Nómina',                 '#3b82f6', 'income',         34),
  ('returns',        'Rendimientos',           '#0284c7', 'income',         35),
  ('reimbursement',  'Reembolso',              '#16a34a', 'income',         36),
  ('other_income',   'Otros ingresos',         '#6366f1', 'income',         37),

-- ─── NO COMPUTABLE ────────────────────────────────────────────────────────────
  ('investment',     'Inversión',              '#059669', 'non_computable', 38),
  ('savings',        'Ahorro',                 '#0d9488', 'non_computable', 39),
  ('transfer',       'Transferencia interna',  '#78716c', 'non_computable', 40),
  ('loan_payment',   'Amortización',           '#b45309', 'non_computable', 41);

-- Índice para filtrar por tipo en queries de Análisis
CREATE INDEX IF NOT EXISTS categories_type_idx ON categories (type);
