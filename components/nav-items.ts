import { Home, List, Wallet, BarChart2 } from 'lucide-react'

/**
 * Los 4 destinos de la navegación principal, compartidos por las dos formas que
 * toma según el ancho (#364): `BottomNav` en móvil y `SideNav` —rail en `md`,
 * sidebar en `xl`— a partir de 768px. Nunca están visibles a la vez.
 */
export const NAV_ITEMS = [
  { href: '/',             label: 'Inicio',      Icon: Home },
  { href: '/transactions', label: 'Movimientos', Icon: List },
  { href: '/accounts',     label: 'Cuentas',     Icon: Wallet },
  { href: '/analytics',    label: 'Análisis',    Icon: BarChart2 },
] as const
