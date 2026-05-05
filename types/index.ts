export type AccountType = 'bank' | 'card' | 'edenred' | 'cash'
export type DataSource = 'enablebanking' | 'scraper' | 'manual'
export type CategoryId =
  | 'supermercado'
  | 'restaurante'
  | 'transporte'
  | 'hogar'
  | 'ocio'
  | 'compras'
  | 'salud'
  | 'ingresos'
  | 'otros'

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
}

export interface UserConfig {
  user_id: string
  has_onboarded: boolean
  primary_currency: string
  month_start_day: number
  created_at: string
  updated_at: string
}
