// Catálogo de categorías — FUENTE ÚNICA DE VERDAD (issue #175).
//
// Todo lo demás se deriva de aquí: `CategoryId`, `CATEGORY_META`,
// `CATEGORY_COLORS`, `VALID_CATEGORIES` y el seed de la tabla `categories`
// (regenerar con `pnpm seed:categories` y ejecutar el SQL resultante en el
// Supabase SQL Editor). Retirar o renombrar un id requiere además una
// migración de repunte de `transactions` y `categorization_rules`
// (patrón alta→repunte→baja, ver #151 y #174): la FK de `transactions`
// hará fallar el DELETE del seed si quedan referencias.
//
// Este módulo es autocontenido (sin alias `@/`) para que el generador de
// seed pueda importarlo directamente con Node (type stripping).

import {
  ShoppingCart, UtensilsCrossed, Home, Gamepad2, ShoppingBag,
  TrendingUp, MoreHorizontal, Fuel, ParkingCircle, Wrench,
  Building2, Users, Zap, Flame, Droplets, Wifi, Shirt, Laptop,
  Stethoscope, Pill, Dumbbell, Repeat2, Plane, BookOpen,
  Sparkles, Gift, Heart, Users2, Receipt, CreditCard, Banknote,
  Landmark, BarChart3, RotateCcw, CirclePlus, PiggyBank, ArrowLeftRight,
  Wallet, Bus, SprayCan, ShieldPlus, Umbrella, Car, WalletCards,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type CategoryType = 'expense' | 'income' | 'non_computable'

interface CategoryDef {
  id: string
  label: string
  color: string
  type: CategoryType
  Icon: LucideIcon
  sortOrder: number
}

export const CATEGORIES = [
  // ── Gastos ──────────────────────────────────────────────────────────────────
  { id: 'groceries',        label: 'Supermercado',          color: '#22c55e', type: 'expense',        Icon: ShoppingCart,    sortOrder: 1 },
  { id: 'restaurant',       label: 'Restaurantes',          color: '#f59e0b', type: 'expense',        Icon: UtensilsCrossed, sortOrder: 2 },
  { id: 'transport',        label: 'Transporte público',    color: '#8b5cf6', type: 'expense',        Icon: Bus,             sortOrder: 3 },
  { id: 'fuel',             label: 'Gasolina',              color: '#7c3aed', type: 'expense',        Icon: Fuel,            sortOrder: 4 },
  { id: 'parking',          label: 'Parking y Peaje',       color: '#6d28d9', type: 'expense',        Icon: ParkingCircle,   sortOrder: 5 },
  { id: 'vehicle',          label: 'Vehículo',              color: '#5b21b6', type: 'expense',        Icon: Wrench,          sortOrder: 6 },
  { id: 'mortgage',         label: 'Hipoteca / Alquiler',   color: '#0284c7', type: 'expense',        Icon: Building2,       sortOrder: 7 },
  { id: 'community_fees',   label: 'Comunidad de vecinos',  color: '#0369a1', type: 'expense',        Icon: Users,           sortOrder: 8 },
  { id: 'electricity',      label: 'Electricidad',          color: '#f59e0b', type: 'expense',        Icon: Zap,             sortOrder: 9 },
  { id: 'gas',              label: 'Gas natural',           color: '#d97706', type: 'expense',        Icon: Flame,           sortOrder: 10 },
  { id: 'water',            label: 'Agua',                  color: '#06b6d4', type: 'expense',        Icon: Droplets,        sortOrder: 11 },
  { id: 'internet',         label: 'Internet / Telefonía',  color: '#0891b2', type: 'expense',        Icon: Wifi,            sortOrder: 12 },
  { id: 'home',             label: 'Hogar',                 color: '#0e7490', type: 'expense',        Icon: Home,            sortOrder: 13 },
  { id: 'clothing',         label: 'Ropa y calzado',        color: '#ec4899', type: 'expense',        Icon: Shirt,           sortOrder: 14 },
  { id: 'shopping',         label: 'Compras',               color: '#db2777', type: 'expense',        Icon: ShoppingBag,     sortOrder: 15 },
  { id: 'electronics',      label: 'Electrónica',           color: '#9333ea', type: 'expense',        Icon: Laptop,          sortOrder: 16 },
  { id: 'health',           label: 'Salud',                 color: '#10b981', type: 'expense',        Icon: Stethoscope,     sortOrder: 17 },
  { id: 'pharmacy',         label: 'Farmacia',              color: '#059669', type: 'expense',        Icon: Pill,            sortOrder: 18 },
  { id: 'leisure',          label: 'Ocio',                  color: '#ef4444', type: 'expense',        Icon: Gamepad2,        sortOrder: 19 },
  { id: 'sports',           label: 'Deporte',               color: '#dc2626', type: 'expense',        Icon: Dumbbell,        sortOrder: 20 },
  { id: 'subscriptions',    label: 'Suscripciones',         color: '#f97316', type: 'expense',        Icon: Repeat2,         sortOrder: 21 },
  { id: 'travel',           label: 'Viajes',                color: '#0ea5e9', type: 'expense',        Icon: Plane,           sortOrder: 22 },
  { id: 'education',        label: 'Educación',             color: '#a855f7', type: 'expense',        Icon: BookOpen,        sortOrder: 23 },
  { id: 'insurance_health', label: 'Seguro salud',          color: '#84cc16', type: 'expense',        Icon: ShieldPlus,      sortOrder: 24 },
  { id: 'insurance_home',   label: 'Seguro hogar',          color: '#0d9488', type: 'expense',        Icon: Umbrella,        sortOrder: 25 },
  { id: 'insurance_auto',   label: 'Seguro auto',           color: '#65a30d', type: 'expense',        Icon: Car,             sortOrder: 26 },
  { id: 'domestic_help',    label: 'Servicio doméstico',    color: '#14b8a6', type: 'expense',        Icon: SprayCan,        sortOrder: 27 },
  { id: 'beauty',           label: 'Cuidado personal',      color: '#f472b6', type: 'expense',        Icon: Sparkles,        sortOrder: 28 },
  { id: 'gifts',            label: 'Regalos',               color: '#fb7185', type: 'expense',        Icon: Gift,            sortOrder: 29 },
  { id: 'charity',          label: 'Solidaridad',           color: '#4ade80', type: 'expense',        Icon: Heart,           sortOrder: 30 },
  { id: 'memberships',      label: 'Asociaciones',          color: '#a3e635', type: 'expense',        Icon: Users2,          sortOrder: 31 },
  { id: 'taxes',            label: 'Impuestos',             color: '#facc15', type: 'expense',        Icon: Receipt,         sortOrder: 32 },
  { id: 'loans',            label: 'Préstamos',             color: '#fb923c', type: 'expense',        Icon: CreditCard,      sortOrder: 33 },
  { id: 'cash',             label: 'Efectivo',              color: '#a8a29e', type: 'expense',        Icon: Banknote,        sortOrder: 34 },
  { id: 'fees',             label: 'Comisiones',            color: '#94a3b8', type: 'expense',        Icon: Landmark,        sortOrder: 35 },
  { id: 'other',            label: 'Otros gastos',          color: '#64748b', type: 'expense',        Icon: MoreHorizontal,  sortOrder: 36 },
  // ── Ingresos ────────────────────────────────────────────────────────────────
  { id: 'payroll',          label: 'Nómina',                color: '#3b82f6', type: 'income',         Icon: TrendingUp,      sortOrder: 37 },
  { id: 'returns',          label: 'Rendimientos',          color: '#0284c7', type: 'income',         Icon: BarChart3,       sortOrder: 38 },
  { id: 'reimbursement',    label: 'Reembolso',             color: '#16a34a', type: 'income',         Icon: RotateCcw,       sortOrder: 39 },
  { id: 'other_income',     label: 'Otros ingresos',        color: '#6366f1', type: 'income',         Icon: CirclePlus,      sortOrder: 40 },
  // ── No Computable ───────────────────────────────────────────────────────────
  { id: 'investment',       label: 'Inversión',             color: '#059669', type: 'non_computable', Icon: BarChart3,       sortOrder: 41 },
  { id: 'savings',          label: 'Ahorro',                color: '#0d9488', type: 'non_computable', Icon: PiggyBank,       sortOrder: 42 },
  { id: 'transfer',         label: 'Transferencia interna', color: '#78716c', type: 'non_computable', Icon: ArrowLeftRight,  sortOrder: 43 },
  { id: 'loan_payment',     label: 'Amortización',          color: '#b45309', type: 'non_computable', Icon: Wallet,          sortOrder: 44 },
  { id: 'card_payment',     label: 'Pago tarjeta crédito',  color: '#a8a29e', type: 'non_computable', Icon: WalletCards,     sortOrder: 45 },
] as const satisfies readonly CategoryDef[]

export type CategoryId = (typeof CATEGORIES)[number]['id']

export interface CategoryMeta {
  label: string
  color: string
  type: CategoryType
  Icon: LucideIcon
}

export const CATEGORY_META = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, { label: c.label, color: c.color, type: c.type, Icon: c.Icon }])
) as Record<CategoryId, CategoryMeta>

export const CATEGORY_COLORS = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c.color])
) as Record<CategoryId, string>

export const VALID_CATEGORIES: readonly CategoryId[] = CATEGORIES.map((c) => c.id)
