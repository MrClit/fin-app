// Selectores específicos del plan de ahorro (Bansabadell Vida), capturados en la
// Fase 0 de #197. El login, el perfil y la anti-detección son comunes y viven en
// ../sabadell-shared/config.mjs.

// Navegación: desde la posición global (PAGlobalPosition), el enlace de menú
// VISIBLE "Ahorro e inversión" lleva a la lista "Mis planes de ahorro", que
// contiene el tile del plan. Ese enlace visible es SVProductFinancing; existe otro
// "Ahorro e inversión" con href SVFinancingHeader pero está display:none en la
// posición global (dentro de un td mostrarBSOP_OCULTARMENU) y NO se debe clicar.
// El deep-link directo está bloqueado por el WAF; se llega clicando el enlace. El
// `key=` de la URL es de sesión, por eso se casa solo el nombre estable de la acción.
export const SAVINGS_MENU_HREF = 'a[href*="SVProductFinancing.init.bs"]'

// Tile del plan en la lista; al clicarlo se abre la ficha con saldo y movimientos.
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
