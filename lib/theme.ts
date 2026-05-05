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
  supermercado: '#22c55e',
  restaurante: '#f59e0b',
  transporte: '#8b5cf6',
  hogar: '#06b6d4',
  ocio: '#ef4444',
  compras: '#ec4899',
  salud: '#10b981',
  ingresos: '#3b82f6',
  otros: '#64748b',
}

export const GRADIENTS = {
  patrimonio: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
  ingresos: 'linear-gradient(180deg, #4ade80, #22c55e)',
  gastos: 'linear-gradient(180deg, #818cf8, #6366f1)',
  inversiones: 'linear-gradient(135deg, #059669, #10b981)',
}
