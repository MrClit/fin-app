// Tipos de dominio derivados del esquema real (lib/supabase/database.types.ts,
// issue #241). La forma de las tablas es fuente única de verdad: regenerar con
// `pnpm gen:types` tras un cambio de esquema. Se sobreescriben sólo las columnas
// con una unión de negocio que la BD guarda como TEXT libre (`type`, `source`).
import type { Tables } from '@/lib/supabase/database.types'

export type AccountType = 'bank' | 'card' | 'edenred' | 'cash'
export type DataSource = 'enablebanking' | 'scraper' | 'manual'

// Derivados del catálogo único (lib/categories/catalog.ts) — issue #175.
import type { CategoryId, CategoryType } from '@/lib/categories/catalog'
export type { CategoryId, CategoryType }

export type Household = Tables<'households'>
export type HouseholdMember = Tables<'household_members'>
export type UserConfig = Tables<'user_config'>

export type Account = Omit<Tables<'accounts'>, 'type' | 'source'> & {
  type: AccountType
  source: DataSource
}

export type Transaction = Omit<Tables<'transactions'>, 'source'> & {
  source: DataSource
}

export interface Category {
  id: CategoryId
  name: string
  color: string
  type: CategoryType
}

export interface TransactionWithAccount extends Transaction {
  account: Pick<Account, 'id' | 'name' | 'color'>
}

export type Granularity = 'week' | 'month' | 'quarter' | 'year'

export interface CategoryBreakdown {
  category: CategoryId | null
  amount: number
}

export interface PeriodData {
  label: string
  start: string        // 'YYYY-MM-DD'
  end: string          // 'YYYY-MM-DD'
  income: number
  expense: number
  savings: number
  byCategory: CategoryBreakdown[]
  yoyIncome: number | null  // null si no hay histórico suficiente (§5.7)
  yoyExpense: number | null
}

export interface AnalyticsResponse {
  granularity: Granularity
  periods: PeriodData[]
}

export interface CategoryPeriodData {
  label: string
  start: string
  end: string
  amount: number
}

export interface CategoryAnalyticsResponse {
  granularity: Granularity
  categoryId: CategoryId
  periods: CategoryPeriodData[]
}
