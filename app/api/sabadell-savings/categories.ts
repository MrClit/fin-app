import type { CategoryId } from '@/lib/categories/catalog'

/**
 * Categoriza un movimiento del plan de ahorro Sabadell (Bansabadell Vida) por su
 * CONCEPTO, capturado en la Fase 0 de #197. Determinista y account-aware: NO pasa
 * por `categorizeWithRules` a propósito, para evitar el fallback genérico de
 * `AUTO_RULES` (`/comision|intereses/ → fees`), que mandaría el rendimiento del
 * plan a "comisiones".
 *
 * Conceptos observados en la ficha del plan:
 *   - `REVALORIZACION`  → `returns` (income): el rendimiento real del plan.
 *   - `APORT.PERIODICA` (y cualquier otro: rescates…) → `savings` (non_computable,
 *     patrimonio-neutro; la aportación es un traspaso desde la cuenta corriente).
 */
export function categorizeSavingsMovement(description: string): CategoryId {
  return /revaloriza/i.test(description) ? 'returns' : 'savings'
}
