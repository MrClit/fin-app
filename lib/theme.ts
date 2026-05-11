import {
  ShoppingCart, UtensilsCrossed, Car, Home, Gamepad2, ShoppingBag,
  HeartPulse, TrendingUp, MoreHorizontal, CircleHelp, Fuel, ParkingCircle, Wrench,
  Building2, Users, Zap, Flame, Droplets, Wifi, Shirt, Laptop,
  Stethoscope, Pill, Dumbbell, Repeat2, Plane, BookOpen, Shield,
  Sparkles, Gift, Heart, Users2, Receipt, CreditCard, Banknote,
  Landmark, BarChart3, RotateCcw, CirclePlus, PiggyBank, ArrowLeftRight,
  Wallet, Bus,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { CategoryId, CategoryType } from '@/types'

interface ThemeColors {
  bg: string
  surface: string
  surface2: string
  border: string
  text: string
  textMuted: string
  card: string
  accent: string
  accentLight: string
  positive: string
  negative: string
}

export const lightTheme: ThemeColors = {
  bg: '#f5f5f7',
  surface: '#ffffff',
  surface2: '#f0f0f5',
  border: 'rgba(0,0,0,0.08)',
  text: '#0f0f14',
  textMuted: 'rgba(15,15,20,0.45)',
  card: 'rgba(0,0,0,0.03)',
  accent: '#6366f1',
  accentLight: 'rgba(99,102,241,0.1)',
  positive: '#22c55e',
  negative: '#ef4444',
}

export const darkTheme: ThemeColors = {
  bg: '#0f0f14',
  surface: '#1a1a24',
  surface2: '#22222f',
  border: 'rgba(255,255,255,0.07)',
  text: '#f0f0f5',
  textMuted: 'rgba(240,240,245,0.45)',
  card: 'rgba(255,255,255,0.04)',
  accent: '#6366f1',
  accentLight: 'rgba(99,102,241,0.15)',
  positive: '#22c55e',
  negative: '#ef4444',
}

export const CATEGORY_COLORS: Record<CategoryId, string> = {
  // Gastos
  groceries:      '#22c55e',
  restaurant:     '#f59e0b',
  transport:      '#8b5cf6',
  fuel:           '#7c3aed',
  parking:        '#6d28d9',
  vehicle:        '#5b21b6',
  mortgage:       '#0284c7',
  community_fees: '#0369a1',
  electricity:    '#f59e0b',
  gas:            '#d97706',
  water:          '#06b6d4',
  internet:       '#0891b2',
  home:           '#0e7490',
  clothing:       '#ec4899',
  shopping:       '#db2777',
  electronics:    '#9333ea',
  health:         '#10b981',
  pharmacy:       '#059669',
  leisure:        '#ef4444',
  sports:         '#dc2626',
  subscriptions:  '#f97316',
  travel:         '#0ea5e9',
  education:      '#a855f7',
  insurance:      '#84cc16',
  beauty:         '#f472b6',
  gifts:          '#fb7185',
  charity:        '#4ade80',
  memberships:    '#a3e635',
  taxes:          '#facc15',
  loans:          '#fb923c',
  cash:           '#a8a29e',
  fees:           '#94a3b8',
  other:          '#64748b',
  // Ingresos
  income:         '#3b82f6',
  returns:        '#0284c7',
  reimbursement:  '#16a34a',
  other_income:   '#6366f1',
  // No Computable
  investment:     '#059669',
  savings:        '#0d9488',
  transfer:       '#78716c',
  loan_payment:   '#b45309',
}

interface CategoryMeta {
  label: string
  color: string
  type: CategoryType
  Icon: LucideIcon
}

export const CATEGORY_META: Record<CategoryId, CategoryMeta> = {
  // ── Gastos ──────────────────────────────────────────────────────────────────
  groceries:      { label: 'Supermercado',         color: '#22c55e', type: 'expense',         Icon: ShoppingCart    },
  restaurant:     { label: 'Restaurantes',          color: '#f59e0b', type: 'expense',         Icon: UtensilsCrossed },
  transport:      { label: 'Transporte público',    color: '#8b5cf6', type: 'expense',         Icon: Bus             },
  fuel:           { label: 'Gasolina',              color: '#7c3aed', type: 'expense',         Icon: Fuel            },
  parking:        { label: 'Parking y Peaje',       color: '#6d28d9', type: 'expense',         Icon: ParkingCircle   },
  vehicle:        { label: 'Vehículo',              color: '#5b21b6', type: 'expense',         Icon: Wrench          },
  mortgage:       { label: 'Hipoteca / Alquiler',   color: '#0284c7', type: 'expense',         Icon: Building2       },
  community_fees: { label: 'Comunidad de vecinos',  color: '#0369a1', type: 'expense',         Icon: Users           },
  electricity:    { label: 'Electricidad',          color: '#f59e0b', type: 'expense',         Icon: Zap             },
  gas:            { label: 'Gas natural',           color: '#d97706', type: 'expense',         Icon: Flame           },
  water:          { label: 'Agua',                  color: '#06b6d4', type: 'expense',         Icon: Droplets        },
  internet:       { label: 'Internet / Telefonía',  color: '#0891b2', type: 'expense',         Icon: Wifi            },
  home:           { label: 'Hogar',                 color: '#0e7490', type: 'expense',         Icon: Home            },
  clothing:       { label: 'Ropa y calzado',        color: '#ec4899', type: 'expense',         Icon: Shirt           },
  shopping:       { label: 'Compras',               color: '#db2777', type: 'expense',         Icon: ShoppingBag     },
  electronics:    { label: 'Electrónica',           color: '#9333ea', type: 'expense',         Icon: Laptop          },
  health:         { label: 'Salud',                 color: '#10b981', type: 'expense',         Icon: Stethoscope     },
  pharmacy:       { label: 'Farmacia',              color: '#059669', type: 'expense',         Icon: Pill            },
  leisure:        { label: 'Ocio',                  color: '#ef4444', type: 'expense',         Icon: Gamepad2        },
  sports:         { label: 'Deporte',               color: '#dc2626', type: 'expense',         Icon: Dumbbell        },
  subscriptions:  { label: 'Suscripciones',         color: '#f97316', type: 'expense',         Icon: Repeat2         },
  travel:         { label: 'Viajes',                color: '#0ea5e9', type: 'expense',         Icon: Plane           },
  education:      { label: 'Educación',             color: '#a855f7', type: 'expense',         Icon: BookOpen        },
  insurance:      { label: 'Seguros',               color: '#84cc16', type: 'expense',         Icon: Shield          },
  beauty:         { label: 'Cuidado personal',      color: '#f472b6', type: 'expense',         Icon: Sparkles        },
  gifts:          { label: 'Regalos',               color: '#fb7185', type: 'expense',         Icon: Gift            },
  charity:        { label: 'Solidaridad',           color: '#4ade80', type: 'expense',         Icon: Heart           },
  memberships:    { label: 'Asociaciones',          color: '#a3e635', type: 'expense',         Icon: Users2          },
  taxes:          { label: 'Impuestos',             color: '#facc15', type: 'expense',         Icon: Receipt         },
  loans:          { label: 'Préstamos',             color: '#fb923c', type: 'expense',         Icon: CreditCard      },
  cash:           { label: 'Efectivo',              color: '#a8a29e', type: 'expense',         Icon: Banknote        },
  fees:           { label: 'Comisiones',            color: '#94a3b8', type: 'expense',         Icon: Landmark        },
  other:          { label: 'Otros gastos',          color: '#64748b', type: 'expense',         Icon: MoreHorizontal  },
  // ── Ingresos ────────────────────────────────────────────────────────────────
  income:         { label: 'Nómina',                color: '#3b82f6', type: 'income',          Icon: TrendingUp      },
  returns:        { label: 'Rendimientos',          color: '#0284c7', type: 'income',          Icon: BarChart3       },
  reimbursement:  { label: 'Reembolso',             color: '#16a34a', type: 'income',          Icon: RotateCcw       },
  other_income:   { label: 'Otros ingresos',        color: '#6366f1', type: 'income',          Icon: CirclePlus      },
  // ── No Computable ───────────────────────────────────────────────────────────
  investment:     { label: 'Inversión',             color: '#059669', type: 'non_computable',  Icon: BarChart3       },
  savings:        { label: 'Ahorro',                color: '#0d9488', type: 'non_computable',  Icon: PiggyBank       },
  transfer:       { label: 'Transferencia interna', color: '#78716c', type: 'non_computable',  Icon: ArrowLeftRight  },
  loan_payment:   { label: 'Amortización',          color: '#b45309', type: 'non_computable',  Icon: Wallet          },
}

export const SIN_CATEGORIA = {
  label: 'Sin categoría',
  color: '#94a3b8',
  Icon: CircleHelp,
} as const satisfies { label: string; color: string; Icon: LucideIcon }

export const GRADIENTS = {
  netWorth: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
  income: 'linear-gradient(180deg, #4ade80, #22c55e)',
  expenses: 'linear-gradient(180deg, #818cf8, #6366f1)',
  investments: 'linear-gradient(135deg, #059669, #10b981)',
}
