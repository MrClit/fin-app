import { CATEGORY_META, VALID_CATEGORIES, type CategoryId, type CategoryMeta, type CategoryType } from './catalog'

/**
 * Categoría efectiva de una transacción: COALESCE(category_manual, category),
 * validada contra el catálogo. Devuelve null si no hay categoría o el id no es
 * válido (p. ej. un id renombrado durante una migración alta→repunte→baja).
 */
export function getEffectiveCategory(
  tx: { category: string | null; category_manual: string | null }
): CategoryId | null {
  const raw = tx.category_manual ?? tx.category
  return raw && (VALID_CATEGORIES as readonly string[]).includes(raw)
    ? (raw as CategoryId)
    : null
}

/**
 * Tipo efectivo de una transacción (income / expense / non_computable), derivado
 * del `type` de su categoría efectiva. Devuelve null si no tiene categoría válida.
 * La clasificación va siempre por categoría, nunca por el signo del importe.
 */
export function getEffectiveType(
  tx: { category: string | null; category_manual: string | null }
): CategoryType | null {
  const cat = getEffectiveCategory(tx)
  return cat ? CATEGORY_META[cat].type : null
}

/**
 * Acceso tolerante a los metadatos de una categoría: degrada a 'other' ante un
 * id desconocido o ausente en vez de asumir que existe en CATEGORY_META.
 */
export function getCategoryMeta(id: string | null | undefined): CategoryMeta {
  return (id != null && CATEGORY_META[id as CategoryId]) || CATEGORY_META.other
}
