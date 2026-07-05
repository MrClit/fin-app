// Selectores específicos del plan de ahorro (Bansabadell Vida), capturados en la
// Fase 0 de #197. El login, el perfil y la anti-detección son comunes y viven en
// ../sabadell-shared/config.mjs.

// Navegación (confirmada en el recon conjunto de Fase 0): el plan aparece
// DIRECTAMENTE en la posición global (PAGlobalPosition.init), como un tile
// desplegable. NO cuelga del menú "Ahorro e inversión" (SVProductFinancing es el
// catálogo de productos, sin el plan). Al clicar el tile, la posición global se
// recarga a PAGlobalPosition.initInfo y despliega los movimientos del plan inline.
export const SAVINGS_TILE = '#planSavingEntity'

export const SAVINGS_SELECTORS = {
  // Ficha de detalle.
  balance: '#amountAcum',        // "21.462,28 €" (saldo acumulado → activo)
  productCode: '#productCode',   // "32000007 181690" (id estable; se normaliza sin espacios)
  desc: '#desc',                 // "Plan Ahorro Trimestral" (nombre)
  // Movimientos: cada fila en un tbody .bs-latest-movements__table-body con 3
  // celdas td.bs-latest-movements__table-cell (Fecha DD/MM/YYYY · Concepto · Importe).
  movementsContainer: '.bs-latest-movements',
  movementRow: '.bs-latest-movements__table-body tr',
  cell: 'td.bs-latest-movements__table-cell',
  // "Ver más movimientos" (paginación); oculto cuando ya está todo cargado.
  showMore: '.bso-vermas a',
}
