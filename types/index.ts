export type AccountType = 'bank' | 'card' | 'edenred' | 'cash'
export type DataSource = 'enablebanking' | 'scraper' | 'manual'
export type CategoryType = 'expense' | 'income' | 'non_computable'

export type CategoryId =
  // Gastos
  | 'groceries'
  | 'restaurant'
  | 'transport'
  | 'fuel'
  | 'parking'
  | 'vehicle'
  | 'mortgage'
  | 'community_fees'
  | 'electricity'
  | 'gas'
  | 'water'
  | 'internet'
  | 'home'
  | 'clothing'
  | 'shopping'
  | 'electronics'
  | 'health'
  | 'pharmacy'
  | 'leisure'
  | 'sports'
  | 'subscriptions'
  | 'travel'
  | 'education'
  | 'insurance'
  | 'beauty'
  | 'gifts'
  | 'charity'
  | 'memberships'
  | 'taxes'
  | 'loans'
  | 'cash'
  | 'fees'
  | 'other'
  // Ingresos
  | 'income'
  | 'returns'
  | 'reimbursement'
  | 'other_income'
  // No Computable
  | 'investment'
  | 'savings'
  | 'transfer'
  | 'loan_payment'

export interface Account {
  id: string
  user_id: string
  name: string
  type: AccountType
  source: DataSource
  is_liability: boolean
  balance: number | null
  number: string | null
  color: string | null
  currency: string
  external_id: string | null
  session_id: string | null
  consent_expires_at: string | null
  last_synced: string | null
  is_active: boolean
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  account_id: string
  date: string
  amount: number
  description: string
  category: string | null
  category_manual: string | null
  source: DataSource
  external_id: string | null
  is_computable: boolean
  is_internal_transfer: boolean
  notes: string | null
  created_at: string
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

export interface UserConfig {
  user_id: string
  primary_currency: string
  month_start_day: number
  created_at: string
  updated_at: string
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
  ingresos: number
  gastos: number
  ahorro: number
  byCategory: CategoryBreakdown[]
  yoyIngresos: number | null  // null si no hay histórico suficiente (§5.7)
  yoyGastos: number | null
}

export interface AnalyticsResponse {
  gran: Granularity
  periods: PeriodData[]
}

export interface CategoryPeriodData {
  label: string
  start: string
  end: string
  amount: number
}

export interface CategoryAnalyticsResponse {
  gran: Granularity
  categoryId: CategoryId
  periods: CategoryPeriodData[]
}
