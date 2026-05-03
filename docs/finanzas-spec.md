# Finanzas Personales — Especificación Funcional y Técnica

> Documento de referencia para el desarrollo con Claude Code.  
> Usar junto al fichero `finanzas-app.jsx` que contiene el prototipo visual completo.

---

## 1. Visión del producto

Aplicación web personal de gestión y análisis de finanzas que agrega automáticamente los datos de cuentas bancarias, tarjetas y saldo Edenred, permitiendo al usuario entender en qué gasta su dinero, analizar tendencias y tomar mejores decisiones financieras.

**Diferenciadores respecto a Fintonic (inspiración principal):**
- Conexión Edenred mediante scraping automatizado
- Análisis YTD (acumulado anual) con comparativa vs año anterior
- Selección interactiva de períodos en gráficas que actualiza todos los KPIs
- Recategorización manual de transacciones
- Patrimonio neto en el tiempo

**Usuario objetivo:** Victor, usuario único (app personal, no SaaS).

---

## 2. Funcionalidades por pantalla

### 2.1 Onboarding
- Pantalla de bienvenida que se muestra la primera vez (flag en base de datos)
- CTA principal: conectar banco vía Enable Banking
- CTA secundario: cargar datos de ejemplo (modo demo)
- Accesible en cualquier momento pulsando el avatar de usuario

### 2.2 Dashboard (Inicio)

**Balance total**
- Saldo neto de todas las cuentas conectadas
- Sparkline de los últimos 30 días de evolución del balance
- Delta semanal con indicador de subida/bajada

**Patrimonio neto**
- Gráfica de línea suave con los últimos 12 meses
- Delta anual (balance actual vs hace 12 meses)

**Mis cuentas**
- Grid 2×2 mostrando todas las cuentas con saldo actual
- Badge de tipo: Cuenta / Tarjeta / Edenred
- Tap navega a la pantalla de Cuentas

> El Dashboard se mantiene minimalista. Para análisis detallado por mes, categorías y movimientos, el usuario navega a la pestaña Análisis.

### 2.3 Movimientos

**Buscador**
- Input de búsqueda por descripción y categoría
- Estado local al componente para evitar pérdida de foco

**Filtro por cuenta** (selector múltiple)
- Bottom sheet con checkboxes por cuenta
- "Todas las cuentas" como opción por defecto
- Badge con número de cuentas activas en el botón

**Filtros de tipo**
- Pills horizontales: Todos / Ingresos / Gastos / No Computable
- "No Computable" = Edenred/tickets restaurante

**Lista agrupada por día**
- Encabezado de día: "Hoy", "Ayer" o fecha formateada + neto del día
- Ordenación de más reciente a más antiguo
- Cada movimiento muestra: icono categoría, descripción, categoría (con punto de color), importe

**Swipe para recategorizar**
- Deslizar a la derecha revela botón "Categoría"
- Abre el selector de categorías predefinidas
- Deslizar a la izquierda o pulsar fuera cierra

**Detalle de movimiento** (modal bottom sheet)
- Importe en grande (44px) con icono de categoría
- Campos: Fecha completa, Cuenta origen, Categoría (editable)
- Badge "EDITADA" si la categoría fue modificada por el usuario
- Eliminar con confirmación en dos pasos y texto explicativo

**Nuevo movimiento** (modal bottom sheet)
- Toggle Gasto / Ingreso
- Importe en grande (48px) — botón Guardar inactivo hasta que se rellena
- Campos: Descripción, Fecha, Cuenta (fija "Manual"), Categoría (con grid inline)
- El botón Guardar cambia de color según el tipo (rojo/verde)

### 2.4 Cuentas

**Lista de cuentas**
- Card por cuenta con: nombre, número enmascarado, saldo, badge de fuente (PSD2 / Scraper)
- Indicador de última sincronización
- Botón "Conectar nueva cuenta" en la parte inferior

### 2.5 Análisis

**Selector de período** (bottom sheet — sticky en el header)
- Opciones: **Semana / Mes / Trimestre / Año**
- Siempre muestra el período actual, sin selección manual de fechas concretas
- El header que contiene el título "Análisis" y el selector **es sticky** — permanece visible al hacer scroll
- El estado de período es **compartido** entre Análisis y la pantalla de Detalle de categoría: cambiar en una actualiza la otra
- El mismo selector aparece en la pantalla de Detalle de categoría (arriba a la derecha del header)

**KPIs — Ingresos y Gastos**
- Importe del período / barra seleccionada
- Badge con % vs período anterior
- Badge con % vs mismo período año anterior
- Badge con el label de la barra cuando no es el período actual
- Color inteligente: para Gastos, + es malo (rojo), − es bueno (verde)

**Gráfica de barras dobles** (ingresos verde / gastos morado)
- Ventana de 6 períodos con navegación ← Anteriores / Siguientes →
- Barra seleccionada: opacidad plena + gradiente + sombra glow
- Barras no seleccionadas: 45% de opacidad
- Al seleccionar una barra: actualiza KPIs, categorías y ahorro
- Toggle "vs año ant.": muestra una **línea horizontal** dentro de cada barra indicando el nivel del año anterior
  - Línea verde con ticks verticales en los extremos para ingresos
  - Línea morada con ticks verticales en los extremos para gastos
  - Si la barra supera la línea → mejor que el año anterior; si queda por debajo → peor
  - Leyenda con el mismo pictograma de línea + ticks para coherencia visual

**Desglose por categoría**
- Toggle Gastos / Ingresos
- Donut interactivo centrado, tamaño 220px
  - Iconos externos en el midpoint de cada arco
  - Pulsar arco o icono: selecciona esa categoría
  - Categoría seleccionada: arco más grueso, resto al 20% de opacidad
  - Centro dinámico: "Total / importe total" → "Nombre cat. / importe cat."
- Barras de progreso por categoría debajo
  - Icono + nombre + % + importe + chevron "›"
  - Sincronizadas con la selección del donut
  - Tap navega a la **pantalla de Detalle de categoría** (no modal)

**Pantalla de Detalle de categoría** _(sub-pantalla con navegación)_
- Header sticky con: botón "‹ Atrás" → vuelve a Análisis, icono + nombre de la categoría, selector de período (compartido)
- Bottom navigation oculto en esta pantalla (se siente como sub-página)
- Gráfica de barras de los últimos 6 períodos para esa categoría
  - Barras del color de la categoría
  - KPI del período seleccionado con importe en grande
  - Tap en barra → actualiza el KPI; por defecto seleccionado el período actual
- Lista de movimientos agrupada por día, misma estructura que en Movimientos
  - Filtrada por la categoría
  - Con swipe para recategorizar y tap para ver detalle

**Card de Ahorro**
- Total ahorrado en el período / barra seleccionada
- Barra de progreso: % sobre ingresos del período
- Label del período en el título

---

## 3. Modelo de datos

### 3.1 Tablas en Supabase (PostgreSQL)

> **Modelo multi-usuario por diseño.** Aunque la app es para un único usuario en producción, todas las tablas tienen `user_id` referenciado a `auth.users`. Esto permite (a) que las RLS policies de Supabase funcionen correctamente, (b) usar la app desde varios dispositivos con el mismo login, y (c) compartir en el futuro con pareja/familia sin migración.

```sql
-- Cuentas financieras
accounts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,           -- "BBVA Cuenta", "Visa", "Edenred"
  type          TEXT NOT NULL,           -- 'bank' | 'card' | 'edenred' | 'cash'
  source        TEXT NOT NULL,           -- 'enablebanking' | 'scraper' | 'manual'
  is_liability  BOOLEAN DEFAULT false,   -- true = tarjeta de crédito / préstamo (resta del patrimonio)
  balance       DECIMAL(12,2),
  number        TEXT,                    -- "•••• 4521" enmascarado
  color         TEXT,                    -- hex color para la UI
  currency      TEXT DEFAULT 'EUR',
  external_id   TEXT,                    -- ID de cuenta en Enable Banking
  session_id    TEXT,                    -- ID de la sesión Enable Banking (para renovación)
  consent_expires_at TIMESTAMP WITH TIME ZONE, -- caducidad PSD2 (90-180 días)
  last_synced   TIMESTAMP WITH TIME ZONE,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
CREATE INDEX idx_accounts_user_id ON accounts(user_id);

-- Transacciones normalizadas de todas las fuentes
transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id      UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  amount          DECIMAL(12,2) NOT NULL,  -- negativo = gasto, positivo = ingreso
  description     TEXT NOT NULL,
  category        TEXT,                    -- categoría asignada automáticamente
  category_manual TEXT,                    -- categoría editada por el usuario (override)
  source          TEXT NOT NULL,           -- 'enablebanking' | 'scraper' | 'manual'
  external_id     TEXT,                    -- ID de transacción en Enable Banking para evitar duplicados
  is_computable   BOOLEAN DEFAULT true,    -- false = No Computable (Edenred)
  is_internal_transfer BOOLEAN DEFAULT false, -- traspaso entre cuentas propias
  notes           TEXT,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, external_id)             -- evita duplicados solo dentro del mismo user
)
CREATE INDEX idx_transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX idx_transactions_account ON transactions(account_id);

-- Configuración del usuario (una fila por user)
user_config (
  user_id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  has_onboarded   BOOLEAN DEFAULT false,
  primary_currency TEXT DEFAULT 'EUR',
  month_start_day INTEGER DEFAULT 1,       -- día del mes en que empieza el período
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
```

**Row Level Security (RLS) policies:**

```sql
-- Activar RLS en todas las tablas
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_config ENABLE ROW LEVEL SECURITY;

-- Policy: cada usuario solo ve sus propios datos
CREATE POLICY "Users access own accounts" ON accounts
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users access own transactions" ON transactions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users access own config" ON user_config
  FOR ALL USING (auth.uid() = user_id);
```

### 3.2 Categorías predefinidas

```typescript
const CATEGORIES = [
  { id: 'supermercado', name: 'Supermercado', color: '#22c55e' },
  { id: 'restaurante',  name: 'Restaurante',  color: '#f59e0b' },
  { id: 'transporte',   name: 'Transporte',   color: '#8b5cf6' },
  { id: 'hogar',        name: 'Hogar',        color: '#06b6d4' },
  { id: 'ocio',         name: 'Ocio',         color: '#ef4444' },
  { id: 'compras',      name: 'Compras',      color: '#ec4899' },
  { id: 'salud',        name: 'Salud',        color: '#10b981' },
  { id: 'ingresos',     name: 'Ingresos',     color: '#3b82f6' },
  { id: 'otros',        name: 'Otros',        color: '#64748b' },
]
```

La categoría `category_manual` en la tabla `transactions` sobreescribe `category` en la UI. Si `category_manual` tiene valor, se muestra con badge "EDITADA".

### 3.3 Lógica de "No Computable"

Las transacciones de Edenred tienen `is_computable = false`. En el filtro de Movimientos se llaman "No Computable" y se excluyen de los totales de Gastos en Análisis.

---

## 4. Arquitectura técnica

### 4.1 Stack

| Capa | Tecnología | Motivo |
|------|-----------|--------|
| Frontend | **Next.js 16.x** (App Router) | Última versión estable. Turbopack por defecto, React 19.2, mejor caching |
| Base de datos | **Supabase** (PostgreSQL) | Auth incluida, tiempo real, SDK TypeScript |
| Agregación bancaria | **Enable Banking** | PSD2, tier gratuito para developers, buena cobertura España |
| Scraping Edenred | **Playwright + Node.js** | Headless Chromium para la web de Edenred |
| Automatización | **GitHub Actions** | Cron job gratuito para el scraper diario |
| Deploy | **Vercel** | Free tier, integración Next.js nativa |
| Estilos | **Tailwind CSS v4** | Consistencia con el sistema de diseño del prototipo |

> **Nota sobre Next.js 16:** introduce cambios en los parámetros de rutas dinámicas (ahora son async), nuevas APIs de caché (`use cache`, `updateTag()`) y Turbopack estable como bundler por defecto. Al iniciar el proyecto usar `npx create-next-app@latest` que ya instala la 16.x.

### 4.2 Librerías de componentes y gráficas

Esta es una decisión importante. El prototipo `finanzas-app.jsx` implementa todos los charts en SVG puro para máximo control visual. En la app real hay que elegir entre fidelidad al diseño vs velocidad de desarrollo.

#### Gráficas — Recomendación: **Recharts**

Recharts es la librería más adecuada para este proyecto por varias razones:

- **Ya está disponible en el prototipo** — el entorno de Claude Artifacts incluye Recharts, así que el prototipo podría adaptarse fácilmente
- **Composable** — se construye con componentes React individuales, fácil de personalizar al nivel de detalle que requiere este diseño
- **Buena documentación** y mantenida activamente
- Soporta todos los tipos necesarios: `BarChart`, `LineChart`, `ComposedChart` (para las barras dobles con fantasmas YoY)

Las alternativas y por qué no:

| Librería | Pros | Contras para este proyecto |
|---|---|---|
| **Recharts** ✅ | Composable, React-first, flexible | — |
| **Tremor** | Muy rápido de implementar, buen diseño | Poca flexibilidad para el donut interactivo con iconos externos |
| **Chart.js / react-chartjs-2** | Potente, muchos tipos | API basada en canvas, menos control sobre elementos SVG custom |
| **D3.js** | Máximo control | Curva de aprendizaje alta, verboso, overkill para este scope |
| **Nivo** | Diseño cuidado, muchos tipos | Bundle grande, algo rígido en customización |
| **Victory** | React-first | Menos popular, documentación más escasa |

**Casos especiales:**
- **Donut con iconos externos y selección** → implementar en SVG puro como en el prototipo. Recharts no soporta iconos externos en los arcos del donut sin mucho hackeo.
- **Sparkline del balance** → implementar en SVG puro (es un path simple de 30 puntos, no merece una librería).
- **Barras dobles con ghost bars YoY** → usar `ComposedChart` de Recharts con `Bar` para actuales y `Bar` con opacidad reducida para el año anterior.
- **Línea de patrimonio neto** → `LineChart` de Recharts con `Area` para el gradiente.

#### Componentes UI — Recomendación: **shadcn/ui**

Para los componentes de interfaz (no gráficas): botones, inputs, modales, badges, etc.

- **shadcn/ui** es la elección correcta: no es una librería de dependencias, es código que se copia directamente al proyecto y se puede modificar libremente. Tailwind-based, excelente calidad visual.
- Los bottom sheets (modales) del prototipo son custom y deben implementarse a mano — shadcn tiene `Sheet` y `Dialog` como base.
- Para el date picker del modal de nuevo movimiento: usar el componente `Calendar` de shadcn/ui + `Popover`.

#### Iconos — Recomendación: **Lucide React**

Los iconos del prototipo son paths SVG inline. En la app real usar **Lucide React** — es la librería de iconos que usa shadcn/ui, tree-shakeable, y tiene todos los iconos necesarios (`CreditCard`, `Home`, `ShoppingBag`, `Car`, `Coffee`, etc.).

#### Resumen de dependencias principales

```json
{
  "dependencies": {
    "next": "^16.x",
    "react": "^19.x",
    "react-dom": "^19.x",
    "@supabase/supabase-js": "^2.x",
    "@supabase/ssr": "^0.x",
    "recharts": "^2.x",
    "lucide-react": "^0.x",
    "tailwindcss": "^4.x",
    "class-variance-authority": "^0.x",
    "clsx": "^2.x",
    "tailwind-merge": "^2.x"
  }
}
```

shadcn/ui no va en `package.json` directamente — se instala con `npx shadcn@latest add [componente]`.

### 4.3 Estructura del proyecto

```
finanzas-app/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    → Dashboard
│   ├── movimientos/
│   │   └── page.tsx
│   ├── cuentas/
│   │   └── page.tsx
│   ├── analisis/
│   │   └── page.tsx
│   └── api/
│       ├── accounts/
│       │   └── route.ts            → GET cuentas + saldos
│       ├── transactions/
│       │   ├── route.ts            → GET lista + POST nueva
│       │   └── [id]/
│       │       └── route.ts        → PATCH categoría + DELETE
│       ├── sync/
│       │   └── enablebanking/
│       │       └── route.ts        → POST sincronizar Enable Banking
│       └── edenred/
│           └── route.ts            → POST recibir datos del scraper
├── components/
│   ├── ui/                         → Primitivos: Button, Card, Modal, Badge
│   ├── charts/
│   │   ├── DualBarChart.tsx        → Gráfica de barras dobles con navegación
│   │   ├── DonutChart.tsx          → Donut interactivo con iconos externos
│   │   ├── Sparkline.tsx           → Mini gráfica de línea para balance
│   │   └── PatrimonioChart.tsx     → Línea patrimonio neto 12 meses
│   ├── transactions/
│   │   ├── TxRow.tsx               → Fila de movimiento con swipe
│   │   ├── TxModal.tsx             → Modal detalle/edición (campos unificados)
│   │   ├── AddTxModal.tsx          → Modal nuevo movimiento
│   │   ├── CategoryPicker.tsx      → Grid 3×3 de categorías
│   │   └── AccountFilter.tsx       → Bottom sheet filtro por cuenta
│   ├── accounts/
│   │   └── AccountCard.tsx         → Card de cuenta con saldo y fuente
│   └── analytics/
│       ├── KpiCard.tsx             → Card KPI con deltas y YoY
│       ├── CategoryBreakdown.tsx   → Donut + barras integrados
│       └── GranPicker.tsx          → Selector de granularidad temporal
├── lib/
│   ├── supabase.ts                 → Cliente Supabase (server + client)
│   ├── enablebanking.ts            → Cliente Enable Banking API
│   ├── categories.ts               → Definición y helpers de categorías
│   ├── formatting.ts               → fmt(), formatDate(), etc.
│   └── analytics.ts                → Lógica de agregación de datos por período
├── hooks/
│   ├── useTransactions.ts          → SWR/React Query para transacciones
│   ├── useAccounts.ts              → SWR para cuentas y saldos
│   └── useAnalytics.ts             → Datos agregados para la pantalla de análisis
└── .github/
    └── workflows/
        └── edenred-scraper.yml     → Cron job diario 07:00 (Europe/Madrid)
```

### 4.4 Flujo de sincronización bancaria (Enable Banking)

```
1. Usuario pulsa "Conectar banco" en Onboarding o Cuentas
2. Next.js API route llama a Enable Banking API para crear una sesión con redirect URL
3. Enable Banking redirige al usuario al banco (OAuth/PSD2 del banco)
4. Usuario autoriza en su banco y vuelve a la app
5. Enable Banking callback → Next.js guarda el session_id en Supabase
6. Cron semanal (o manual) llama a GET /accounts/{id}/transactions
7. Se normalizan y guardan en tabla transactions (external_id evita duplicados)
8. Se actualiza el saldo en tabla accounts
```

**Variables de entorno necesarias:**
```
ENABLEBANKING_APP_ID=
ENABLEBANKING_SECRET_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
EDENRED_WEBHOOK_SECRET=      # para autenticar llamadas del scraper
```

### 4.5 Flujo Edenred (scraping vía GitHub Actions)

```
GitHub Actions (cron: 0 7 * * * Europe/Madrid)
  └── Node.js script con Playwright
        ├── Login en edenred.es con credenciales (GitHub Secrets)
        ├── Extrae saldo actual y últimos movimientos
        └── POST a /api/edenred con Authorization: Bearer {EDENRED_WEBHOOK_SECRET}
              └── Next.js guarda en transactions con source='scraper', is_computable=false
                  y actualiza balance en accounts
```

**GitHub Secrets necesarios para el workflow:**
```
EDENRED_USER=
EDENRED_PASS=
APP_URL=                     # URL de producción en Vercel
EDENRED_WEBHOOK_SECRET=
```

**Archivo `.github/workflows/edenred-scraper.yml`:**
```yaml
name: Edenred Scraper
on:
  schedule:
    - cron: '0 6 * * *'   # 07:00 Europe/Madrid (UTC+1)
  workflow_dispatch:         # Permite ejecución manual

jobs:
  scrape:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx playwright install chromium --with-deps
      - run: node scripts/scrape-edenred.js
        env:
          EDENRED_USER: ${{ secrets.EDENRED_USER }}
          EDENRED_PASS: ${{ secrets.EDENRED_PASS }}
          APP_URL: ${{ secrets.APP_URL }}
          EDENRED_WEBHOOK_SECRET: ${{ secrets.EDENRED_WEBHOOK_SECRET }}
```

---

## 5. Lógica de análisis y agregación

### 5.1 Granularidades

| Granularidad | Período que muestra | Historial en gráfica |
|---|---|---|
| Semana | Semana en curso (lun–dom) | Últimas 9 semanas |
| Mes | Mes en curso | Últimos 12 meses |
| Trimestre | Trimestre en curso | Últimos 10 trimestres |
| Año | Año en curso | Últimos 8 años |

### 5.2 Comparativa vs año anterior

Para cada período, calcular el mismo período pero del año -1:
```typescript
// Ejemplo: mes actual = Abril 2025
// Año anterior = Abril 2024
// Delta = (valor_actual - valor_anterior) / valor_anterior * 100

const yoyDelta = (current: number, previous: number): string => {
  if (previous === 0) return 'N/A'
  const pct = ((current - previous) / previous) * 100
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(0)}%`
}
```

**Representación visual en la gráfica de barras:**

En lugar de barras fantasma adicionales (que añaden ruido visual), se usa una **línea horizontal de referencia** dentro de cada barra indicando el nivel del año anterior:
- Línea verde con ticks verticales en ambos extremos → referencia de ingresos del año anterior
- Línea morada con ticks verticales en ambos extremos → referencia de gastos del año anterior
- Si la barra actual **supera** la línea: mejor que el año anterior
- Si la barra actual **queda por debajo**: peor que el año anterior
- Activable con el toggle "vs año ant." en la card de la gráfica

### 5.3 Categorización automática

Al importar transacciones de Enable Banking, aplicar reglas de categorización basadas en la descripción:

```typescript
const AUTO_RULES = [
  { pattern: /mercadona|carrefour|lidl|aldi|dia\b|eroski/i, category: 'Supermercado' },
  { pattern: /netflix|spotify|hbo|disney|amazon prime/i,    category: 'Ocio' },
  { pattern: /repsol|cepsa|bp\b|galp|campsa/i,              category: 'Transporte' },
  { pattern: /farmacia|clinica|hospital|sanitas|adeslas/i,  category: 'Salud' },
  { pattern: /nomina|salario|payroll/i,                     category: 'Ingresos' },
  // ...añadir más según uso real
]

const categorize = (description: string): string => {
  for (const rule of AUTO_RULES) {
    if (rule.pattern.test(description)) return rule.category
  }
  return 'Otros'
}
```

Si el usuario ha establecido `category_manual`, esa tiene prioridad sobre la automática.

### 5.4 Estrategia de agregación SQL

Las agregaciones por período (KPIs, donut, barras) son consultas frecuentes y potencialmente pesadas con histórico grande. Se implementan así:

**Vista materializada para agregados mensuales:**

```sql
CREATE MATERIALIZED VIEW transactions_monthly_summary AS
SELECT
  user_id,
  account_id,
  DATE_TRUNC('month', date)::date AS month,
  COALESCE(category_manual, category) AS effective_category,
  SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) AS ingresos,
  SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END) AS gastos,
  COUNT(*) AS tx_count
FROM transactions
WHERE is_computable = true AND is_internal_transfer = false
GROUP BY user_id, account_id, DATE_TRUNC('month', date), effective_category;

CREATE INDEX idx_monthly_user_month ON transactions_monthly_summary(user_id, month DESC);
```

Esta vista se refresca tras cada sincronización con:
```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY transactions_monthly_summary;
```

**Función SQL reutilizable para datos de período:**

```sql
CREATE OR REPLACE FUNCTION get_period_data(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
) RETURNS TABLE (
  ingresos DECIMAL,
  gastos DECIMAL,
  ahorro DECIMAL,
  by_category JSONB
) AS $$
  -- Implementación: agrega desde transactions filtrando por user_id, fecha y is_computable
$$ LANGUAGE plpgsql STABLE;
```

Las API routes de Next.js llaman a esta función vía Supabase RPC para Mes/Trimestre/Año/YTD.

### 5.5 Cálculo del patrimonio neto

```typescript
// Patrimonio neto = activos - pasivos
const patrimonio_neto =
  accounts.filter(a => !a.is_liability).reduce((s, a) => s + a.balance, 0) -
  Math.abs(accounts.filter(a => a.is_liability).reduce((s, a) => s + a.balance, 0))
```

- **Activos** (`is_liability = false`): cuentas corrientes, ahorro, efectivo, Edenred
- **Pasivos** (`is_liability = true`): tarjetas de crédito con saldo pendiente, préstamos

El **Balance total** del Dashboard muestra el patrimonio neto, no la suma bruta de saldos.

### 5.6 Conciliación entre tarjeta y cuenta corriente

Problema: cuando Enable Banking sincroniza tanto la cuenta como la tarjeta, una compra de 50€ con la tarjeta aparece dos veces:
- En la tarjeta: el día de la compra (50€)
- En la cuenta corriente: el día del cargo mensual de la tarjeta (cargo agregado)

**Solución:** detectar el cargo agregado de la tarjeta y marcarlo como `is_internal_transfer = true` para que no compute en gastos:

```typescript
const RECONCILIATION_RULES = [
  // Patrón típico: "LIQUIDACION TARJETA", "CARGO TARJETA VISA"
  { pattern: /liquidacion\s+tarjeta|cargo\s+tarjeta/i, mark: 'internal_transfer' },
  // Bizum o transferencia entre cuentas propias del mismo titular
  { pattern: /traspaso\s+entre\s+cuentas/i, mark: 'internal_transfer' },
]
```

Idealmente el usuario debería poder confirmar/rechazar la conciliación en la UI (futura mejora).

### 5.7 Comparativa YoY con histórico insuficiente

Enable Banking provee por defecto el histórico que permite el banco bajo PSD2 (habitualmente 90 días). La comparativa "vs año anterior" simplemente no tiene datos durante el primer año.

**Comportamiento esperado:**
- Si no hay transacciones del período del año anterior → mostrar `—` en lugar del %
- Si hay menos del 80% de los días con datos → mostrar el % con badge "datos parciales"
- En la primera conexión, solicitar el máximo histórico disponible (algunos bancos permiten hasta 24 meses según sus condiciones PSD2)

---

## 6. Sistema de diseño

El prototipo `finanzas-app.jsx` define los tokens de diseño que deben respetarse en la implementación:

### 6.1 Colores (Light Mode por defecto)

```typescript
const theme = {
  bg:        '#f5f5f7',   // fondo general
  surface:   '#ffffff',   // cards y modales
  surface2:  '#f0f0f5',   // inputs y elementos secundarios
  border:    'rgba(0,0,0,0.08)',
  text:      '#0f0f14',
  textMuted: 'rgba(15,15,20,0.45)',
  accent:    '#6366f1',   // índigo — color principal
  accentLight: 'rgba(99,102,241,0.1)',
  positive:  '#22c55e',   // verde — ingresos
  negative:  '#ef4444',   // rojo — gastos negativos
}
```

Dark mode invertido (activable por el usuario).

### 6.2 Tipografía

**Fuente:** DM Sans (Google Fonts)  
**Pesos usados:** 400, 500, 600, 700, 800

Jerarquía:
- Importes principales: 44–48px, weight 800, letter-spacing -2px
- Títulos de sección: 20px, weight 700
- Títulos de card: 15px, weight 700
- Cuerpo: 13–14px, weight 500–600
- Labels/badges: 10–12px, weight 600–700

### 6.3 Componentes base

| Componente | Border radius | Padding |
|---|---|---|
| Cards principales | 20px | 20px |
| Modales (bottom sheet) | 28px 28px 0 0 | 20px |
| Filas de campo (FieldRow) | 16px | 13px 16px |
| Botones principales | 16px | 15px |
| Pills / badges | 20px | 3px 10px |
| Iconos en cards | 10–14px | — |

### 6.4 Navegación

Bottom tab bar con 4 pestañas:
1. **Inicio** — Dashboard
2. **Movimientos** — Lista y búsqueda
3. **Cuentas** — Gestión de cuentas
4. **Análisis** — Gráficas y KPIs

La pantalla **Detalle de categoría** es una sub-pantalla de Análisis — el bottom nav se oculta y se navega con un botón "‹ Atrás" en el header.

### 6.5 Consideraciones CSS críticas

**`overflow: clip` en el contenedor raíz** — el contenedor principal de la app debe usar `overflow: clip` en lugar de `overflow: hidden`. Ambos recortan el contenido visualmente, pero `overflow: hidden` crea un nuevo contexto de scroll que rompe `position: sticky` en los hijos. `overflow: clip` no tiene este efecto secundario.

```css
/* ✅ Correcto — sticky funciona */
.app-container { overflow: clip; }

/* ❌ Incorrecto — rompe position:sticky en hijos */
.app-container { overflow: hidden; }
```

**`transform` en contenedores con hijos fixed** — cualquier elemento con `transform` (incluso `translateY(0)`) crea un nuevo stacking context que convierte a ese elemento en el "viewport" de los `position: fixed` hijos. Por esto, las transiciones de navegación entre pantallas usan solo `opacity`, nunca `transform`.

---

## 7. Experiencia móvil (PWA)

El prototipo está diseñado para móvil (max-width 420px, bottom nav, bottom sheets). Para que la app se sienta nativa al instalarla en el móvil, debe configurarse como PWA.

### 7.1 Manifest

Crear `app/manifest.ts` en Next.js:

```typescript
import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Finanzas Personales',
    short_name: 'Finanzas',
    description: 'Gestiona y analiza tus finanzas personales',
    start_url: '/',
    display: 'standalone',
    background_color: '#f5f5f7',
    theme_color: '#6366f1',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
```

### 7.2 Viewport y safe areas

En `app/layout.tsx`:

```typescript
export const viewport: Viewport = {
  themeColor: '#6366f1',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover', // necesario para iPhone con notch
}
```

CSS para respetar safe areas (notch, home indicator):

```css
.bottom-nav { padding-bottom: env(safe-area-inset-bottom); }
.header     { padding-top:    env(safe-area-inset-top); }
```

### 7.3 Service Worker (offline)

Implementar con `next-pwa` o manualmente. Estrategia:
- **Cache first** para assets estáticos (JS, CSS, fuentes)
- **Network first con fallback a cache** para datos de Supabase
- Permitir visualizar el último estado sincronizado cuando no hay red

### 7.4 Iconos PWA

Crear iconos en al menos 3 resoluciones: 192×192, 512×512 y 512×512 maskable.

---

## 8. Estados de carga y error

El spec describe el "happy path" pero la app debe gestionar varios estados degradados.

### 8.1 Estados de carga

| Caso | UI |
|---|---|
| Primera carga del Dashboard | Skeleton cards con shimmer animation |
| Sincronizando Enable Banking | Banner superior "Sincronizando…" con spinner pequeño |
| Cambiando de período en Análisis | Crossfade suave (200ms) entre datos antiguos y nuevos |
| Lista de movimientos cargando | 5 filas skeleton con la misma altura que TxRow |

### 8.2 Estados de error

| Error | UI esperada |
|---|---|
| Enable Banking caído / timeout | Banner amarillo: "No pudimos sincronizar. Reintentar →". Mostrar últimos datos disponibles |
| Sesión Enable Banking expirada | Banner rojo en Cuentas: "Reconecta tu banco para seguir sincronizando" + CTA |
| Scraper Edenred falló | Card de Edenred muestra "Sincronizado hace 3 días" en ámbar (>2 días = warning) |
| Sin conexión a internet | Banner offline arriba: "Sin conexión. Mostrando datos guardados". UI sigue funcionando con datos cacheados |
| Error inesperado | Toast tipo "Algo salió mal. [Reintentar]" + log a consola |

### 8.3 Indicadores de "última sincronización"

Cada card de cuenta en la pantalla de Cuentas muestra:
- ✓ Verde: sincronizada en las últimas 24h
- ⚠ Ámbar: 24-72h sin sincronizar
- ✗ Rojo: >72h sin sincronizar (algo va mal, debe avisar)

---

## 9. Renovación de la conexión PSD2

Por ley europea, la autorización PSD2 caduca cada **90-180 días** (depende del banco). El usuario debe re-autorizar mediante un flujo OAuth idéntico al de la conexión inicial.

### 9.1 Tracking de la caducidad

Cuando se crea la sesión en Enable Banking, se guarda `consent_expires_at` en la tabla `accounts`. El campo se calcula a partir de la respuesta de Enable Banking al crear la sesión (depende del banco y del período de acceso solicitado).

### 9.2 Avisos al usuario

| Tiempo restante | UI |
|---|---|
| > 14 días | Sin aviso |
| 7-14 días | Badge ámbar discreto en la cuenta: "Caduca en X días" |
| < 7 días | Banner persistente arriba: "Tu conexión con [Banco] caduca el [fecha]. Renovar →" |
| Caducada | Banner rojo + cuenta con saldo gris + bloqueo de sincronización |

### 9.3 Cron de verificación

Un GitHub Action diario (mismo workflow del scraper Edenred o aparte) revisa todas las cuentas y dispara una notificación si alguna está cerca de caducar. Para una app personal, "notificación" puede ser simplemente un email vía Resend o un mensaje en Telegram a través de un bot.

### 9.4 Flujo de renovación

Idéntico al onboarding:
1. Usuario pulsa "Renovar conexión" → llamada a Enable Banking API para crear nueva sesión
2. Redirección al banco
3. Usuario re-autoriza
4. Callback actualiza `session_id` y `consent_expires_at` en `accounts`
5. Sincronización inmediata para cubrir cualquier hueco temporal

---

## 10. Referencia del prototipo JSX

El fichero `finanzas-app.jsx` es un componente React standalone que contiene:

| Elemento | Descripción |
|---|---|
| `mockTransactions` | 8 transacciones de ejemplo con fechas reales |
| `mockAccounts` | 3 cuentas: BBVA, Visa, Edenred |
| `CATEGORIES` | 9 categorías con icono SVG path, nombre y color |
| `dataByGran` | Datos mock para las 4 granularidades con barras dobles, `prevIngresos`/`prevGastos` para YoY (líneas de referencia), y cats por barra |
| `patrimonioData` | 12 puntos mensuales para la gráfica de patrimonio neto |
| `gran` / `showPicker` | Estado de período **compartido a nivel de App** entre Análisis y Detalle de categoría |
| `DualBarChart` | Barras dobles, navegación, selección externa, líneas horizontales YoY con ticks |
| `DonutDynamic` | Donut interactivo con iconos externos, selección de segmento, centro dinámico |
| `BarChart` | Gráfica simple de un color (solo para Dashboard y Detalle de categoría) |
| `Sparkline` | Mini gráfica de línea calculada inline para el balance card del Dashboard |
| `TxRow` | Fila de transacción con soporte de swipe (touch events) para recategorizar |
| `FieldRow` | Componente de campo reutilizable para los modales (Detalle y Nuevo movimiento) |
| `AddModal` | Modal nuevo movimiento con importe grande, toggle gasto/ingreso, grid de categorías inline |
| `TxDetail` | Modal detalle con categoría editable, confirmación de borrado en 2 pasos |
| `CategoryPicker` | Bottom sheet grid 3×3 de categorías predefinidas |
| `CategoryDetailScreen` | Sub-pantalla de Análisis: header sticky con back + selector período, gráfica de barras por categoría, lista de movimientos filtrada |
| `OnboardingScreen` | Pantalla de primera vez accesible desde el avatar de usuario |
| `GranPicker` | Bottom sheet selector de granularidad (Semana/Mes/Trimestre/Año) dentro de AnalyticsScreen |
| `AccountPicker` | Bottom sheet selector múltiple de cuentas en Movimientos |

**Estado de navegación:**
- `screen` — pantalla activa: `"dashboard"` `"transactions"` `"accounts"` `"analytics"` `"category-detail"`
- `activeTab` — tab activa en el bottom nav (no cambia al entrar en `category-detail`)
- `drilldownCat` — categoría activa en `CategoryDetailScreen`: `{ name, color, icon, gran }`
- `gran` / `showPicker` — a nivel de App, compartidos por Análisis y Detalle de categoría

**Cómo usar el prototipo:**
1. Copiar `finanzas-app.jsx` al proyecto Next.js como componente de referencia visual
2. Extraer cada sección en sus componentes definitivos
3. Sustituir los datos mock por llamadas a la API real de Supabase
4. Mantener los tokens de color, tipografía y border-radius definidos en el prototipo

---

## 11. Orden de implementación recomendado

### Fase 1 — Infraestructura base (semana 1)
1. Crear proyecto Next.js 16 con TypeScript y Tailwind (`npx create-next-app@latest`)
2. Configurar Supabase: tablas, RLS policies, cliente server/client
3. Deploy inicial en Vercel con variables de entorno
4. Página de login/auth con Supabase Auth (magic link)
5. Layout base con bottom navigation y dark/light mode

### Fase 2 — Conexión bancaria (semana 2)
1. Integración Enable Banking: flujo de autorización, callback de sesión
2. API route de sincronización de transacciones
3. Categorización automática al importar
4. Pantalla de Cuentas con datos reales
5. Pantalla de Movimientos básica (lista + búsqueda)

### Fase 3 — Dashboard y funcionalidad core (semana 3)
1. Dashboard con balance real, sparkline, grid de cuentas
2. Modal de detalle de movimiento (con recategorización)
3. Modal de nuevo movimiento manual
4. Swipe to recategorize en la lista
5. Patrimonio neto (cálculo y gráfica)

### Fase 4 — Análisis (semana 4)
1. Gráfica de barras dobles con navegación e interactividad
2. Donut interactivo con selección y drilldown
3. KPIs con deltas y comparativa YoY
4. Toggle YTD para Mes y Trimestre
5. Toggle "vs año anterior" en la gráfica

### Fase 5 — Edenred + pulido (semana 5)
1. Script Playwright de scraping Edenred
2. GitHub Actions workflow con cron job
3. API route para recibir datos del scraper
4. Onboarding con conexión real de banco
5. Configuración PWA: manifest, viewport, service worker básico, iconos

### Fase 6 — Robustez y mantenimiento (semana 6)
1. Estados de carga (skeletons) y de error en todas las pantallas
2. Banner de sincronización y manejo de timeouts
3. Tracking de caducidad PSD2 + flujo de renovación
4. Cron diario de aviso de caducidad
5. Tests unitarios para lógica de agregación analytics

---

## 12. Consideraciones de seguridad

- **Supabase RLS:** todas las tablas con Row Level Security activado. El usuario solo puede leer/escribir sus propios datos
- **Enable Banking:** solo lectura (AISP). No se almacenan credenciales bancarias
- **Edenred:** credenciales solo en GitHub Secrets, nunca en el código ni en Supabase
- **Webhook secret:** el endpoint `/api/edenred` valida el header `Authorization: Bearer {secret}` antes de procesar datos
- **HTTPS:** Vercel provee TLS automáticamente
- **Variables de entorno:** separar `NEXT_PUBLIC_` (cliente) de las variables de servidor

---

## 13. Notas para Claude Code

Al trabajar con este proyecto:

1. **El prototipo es la verdad visual.** Cualquier discrepancia entre este spec y el JSX, prevalece el JSX para decisiones de UI/UX.

2. **Supabase primero.** Antes de implementar cualquier pantalla, verificar que el schema de base de datos soporta los datos necesarios.

3. **No hardcodear datos.** Todo lo que en el prototipo son arrays mock (`mockTransactions`, `mockAccounts`, etc.) debe venir de Supabase.

4. **Server Components por defecto** en Next.js App Router. Solo usar Client Components cuando se necesite estado o interactividad (charts, modales, swipe).

5. **La lógica de análisis es costosa.** Las agregaciones por período, YTD y YoY deben calcularse en el servidor (API route o server component) y pasarse como props, nunca en el cliente.

6. **fmt() es crítico.** El formateador de números español (punto de miles, coma decimal) está definido en el prototipo y debe replicarse exactamente:
   ```typescript
   export const fmt = (n: number, decimals = 0): string => {
     const abs = Math.abs(n)
     const sign = n < 0 ? '-' : ''
     const [intPart, decPart] = abs.toFixed(decimals).split('.')
     const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
     return sign + intFormatted + (decPart !== undefined ? ',' + decPart : '')
   }
   ```

7. **Swipe en móvil.** El `TxRow` usa `onTouchStart`/`onTouchEnd` para detectar el swipe. En Next.js esto requiere `'use client'`.

8. **Enable Banking tokens.** Los access tokens tienen una caducidad limitada. Implementar renovación automática antes de cada llamada a la API.

9. **Patrimonio neto vs balance bruto.** Las cuentas con `is_liability = true` (tarjetas de crédito) deben restarse del patrimonio neto, no sumarse. La pantalla de Cuentas las muestra agrupadas separando "Activos" de "Deudas".

10. **Conciliación.** Antes de mostrar gastos en Análisis, filtrar `is_internal_transfer = true`. Las reglas de conciliación se aplican al sincronizar, no al renderizar.

11. **`overflow: clip` obligatorio.** El contenedor raíz de la app debe usar `overflow: clip`, no `overflow: hidden`. Ver §6.5 para la explicación completa. Sin esto, los headers sticky no funcionan.

12. **Estado `gran` compartido.** El período de análisis (`gran`) vive a nivel de App, no dentro de `AnalyticsScreen`. Al implementar, asegurarse de que `CategoryDetailScreen` lee y modifica el mismo estado. No duplicar este estado en cada pantalla.

13. **YTD eliminado.** El modo YTD fue implementado en el prototipo y retirado por complejidad de UX. No reimplementar sin discutirlo. Está documentado en §14 como futura mejora si se decide retomar.

---

## 14. Futuras mejoras

Funcionalidades fuera del MVP pero documentadas para no perderlas. Cada una es independiente y puede implementarse en orden de prioridad según el uso real de la app.

### 14.1 Categorización inteligente

**Reglas persistentes en base de datos.** Cuando el usuario recategoriza un movimiento, la app pregunta:
> "¿Quieres aplicar 'Restaurante' a todas las transacciones futuras que contengan 'Bizum a Juan'?"

Si acepta, se crea una regla en una nueva tabla:

```sql
categorization_rules (
  id          UUID PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id),
  pattern     TEXT NOT NULL,           -- texto a buscar en description
  category    TEXT NOT NULL,
  priority    INTEGER DEFAULT 0,        -- mayor prioridad sobreescribe a menor
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
```

Las reglas del usuario se aplican antes que las hardcodeadas y se gestionan desde Settings.

### 14.2 Pantalla de Settings

Ahora mismo no existe. Debería incluir:
- Renombrar cuentas
- Ocultar cuentas inactivas (sin borrarlas, mantienen histórico)
- Editar/desactivar reglas de categorización
- Cambiar día de inicio del período mensual (algunos cobran el 25)
- Exportar todos los datos a CSV/JSON
- Logout
- Acceso al Onboarding desde aquí, no desde el avatar

### 14.3 Detección de duplicados entre fuentes

Más allá del `external_id` único, detectar:
- Compras que aparecen tanto en cuenta como en tarjeta
- Bizum entre cuentas propias del mismo titular
- Devoluciones (tx negativa que cancela otra positiva del mismo importe)

UI: una transacción candidata a duplicado se muestra con un badge "Posible duplicado" y un botón para confirmar/descartar.

### 14.4 Suscripciones recurrentes

Detectar automáticamente pagos recurrentes (Netflix, alquiler, gimnasio) analizando frecuencia y descripción. Mostrar una vista dedicada con:
- Total mensual en suscripciones
- Cambios de precio detectados ("Spotify subió de 9,99€ a 11,99€")
- Suscripciones inactivas (no se cobraron este mes pero sí los anteriores)

### 14.5 Multi-divisa

Cuentas en GBP, USD u otras. Decisiones a tomar:
- ¿Conversión al sincronizar (snapshot) o al renderizar (tasa actual)?
- ¿Qué API de tipos de cambio usar? Frankfurter (gratuita, BCE) es suficiente
- Mostrar saldo en divisa nativa pero los KPIs siempre en divisa principal

### 14.6 Objetivos y metas de ahorro

"Quiero 5.000€ para vacaciones en agosto." La app calcula cuánto ahorrar/mes y trackea progreso. Tabla nueva `goals` con `target_amount`, `target_date`, `current_amount`, vinculada a una cuenta o cálculo automático.

### 14.7 Insights automáticos con IA

Aprovechar Claude API para generar insights mensuales:
- "Notamos que gastas 30% más en restaurantes los viernes"
- "Tu suscripción de X subió 20%"
- "Podrías ahorrar 45€/mes cancelando suscripciones que no usas"

Implementación: cron mensual que envía resumen de transacciones a Claude con un prompt estructurado y guarda el resultado en una tabla `insights`.

### 14.8 Backup automático

Cron semanal que:
1. Exporta todos los datos del usuario a JSON
2. Los sube a una bucket de Supabase Storage privada
3. Mantiene los últimos 12 backups
4. Permite descarga desde Settings

### 14.9 Performance con histórico grande

A 5+ años de uso con 10.000+ transacciones:
- Paginación o virtual scrolling en la lista de Movimientos
- Índices adicionales en Supabase (compuestos por user_id + date + category)
- Refresco incremental de la vista materializada (solo el último mes)

### 14.10 Tests

La lógica más crítica para testear:
- `fmt()` y formateadores de fecha
- Función SQL `get_period_data()` con casos edge (período sin transacciones, mes con 1 día)
- Cálculos de YTD, YoY y delta vs período anterior
- Lógica de patrimonio neto con cuentas pasivo
- Reglas de conciliación (cargo agregado de tarjeta no se duplica)

Stack recomendado: **Vitest** para unit tests, **Playwright** para E2E del flujo de onboarding.

### 14.11 Internacionalización

Si en algún momento se quisiera abrir a inglés u otros idiomas, refactorizar usando **next-intl**. No urgente para uso personal, pero estructurar los textos en un solo lugar (`lib/i18n/es.ts`) facilita la migración futura.

### 14.12 Notificaciones push

Avisos de eventos importantes:
- Caducidad PSD2 cercana
- Ingreso recibido (nómina)
- Gasto inusualmente alto detectado
- Sincronización completada con cambios

Implementación con Web Push API + service worker.

### 14.13 Dashboard configurable

Permitir al usuario reordenar y mostrar/ocultar las cards del Dashboard (balance, patrimonio, cuentas, gastos mensuales, categorías, últimos movimientos) según sus preferencias.

### 14.14 Modo "Familia / Pareja"

El schema ya soporta `user_id` en todas las tablas, así que invitar a otra persona a ver/editar las mismas cuentas es viable. Necesitaría una tabla intermedia `account_shares` con permisos read/write y una capa de UI para gestionar invitaciones.

### 14.15 Modo YTD (acumulado anual)

Fue implementado y retirado por resultar confuso en UX. La idea: un toggle en Mes y Trimestre que muestra el acumulado desde el 1 de enero:
- **Mes YTD:** Ene → mes actual
- **Trimestre YTD:** acumulado creciente (Q2 = Ene–Jun, Q3 = Ene–Sep…)

Para reimplementarlo, ver el historial del prototipo. Requiere datos mock separados por granularidad y un toggle claramente explicado al usuario con el rango de fechas exacto visible en todo momento.
