import { CircleHelp } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// Derivados del catálogo único (lib/categories/catalog.ts) — issue #175.
export { CATEGORY_COLORS, CATEGORY_META } from '@/lib/categories/catalog'
export type { CategoryMeta } from '@/lib/categories/catalog'

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
}

export const UNCATEGORIZED = {
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
