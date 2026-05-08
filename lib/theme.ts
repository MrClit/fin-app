import { ShoppingCart, UtensilsCrossed, Car, Home, Gamepad2, ShoppingBag, HeartPulse, TrendingUp, MoreHorizontal } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { CategoryId } from '@/types'

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
  groceries: '#22c55e',
  restaurant: '#f59e0b',
  transport: '#8b5cf6',
  home: '#06b6d4',
  leisure: '#ef4444',
  shopping: '#ec4899',
  health: '#10b981',
  income: '#3b82f6',
  other: '#64748b',
}

interface CategoryMeta {
  label: string
  color: string
  Icon: LucideIcon
}

export const CATEGORY_META: Record<CategoryId, CategoryMeta> = {
  groceries:  { label: 'Supermercado', color: '#22c55e', Icon: ShoppingCart    },
  restaurant: { label: 'Restaurante',  color: '#f59e0b', Icon: UtensilsCrossed },
  transport:  { label: 'Transporte',   color: '#8b5cf6', Icon: Car             },
  home:       { label: 'Hogar',        color: '#06b6d4', Icon: Home            },
  leisure:    { label: 'Ocio',         color: '#ef4444', Icon: Gamepad2        },
  shopping:   { label: 'Compras',      color: '#ec4899', Icon: ShoppingBag     },
  health:     { label: 'Salud',        color: '#10b981', Icon: HeartPulse      },
  income:     { label: 'Ingresos',     color: '#3b82f6', Icon: TrendingUp      },
  other:      { label: 'Otros',        color: '#64748b', Icon: MoreHorizontal  },
}

export const GRADIENTS = {
  netWorth: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
  income: 'linear-gradient(180deg, #4ade80, #22c55e)',
  expenses: 'linear-gradient(180deg, #818cf8, #6366f1)',
  investments: 'linear-gradient(135deg, #059669, #10b981)',
}
