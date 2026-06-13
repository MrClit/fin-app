import type { CategoryId } from './catalog'

type RuleField = 'description' | 'merchant'

// IMPORTANTE: el orden importa — se devuelve la PRIMERA regla que casa. Las reglas
// específicas van primero y los catch-all genéricos (`recibo`, `bizum`) van al FINAL.
export const AUTO_RULES: { pattern: RegExp; category: CategoryId; field?: RuleField }[] = [
  // Supermercado (incluye cadenas locales catalanas, panaderías y carnicerías)
  { pattern: /mercadona|carrefour|lidl|aldi|dia\b|eroski|alcampo|hipercor|consum|ahorramas|supercor|caprabo|bonpreu|esclat|condis|sorli|ametller|la sirena|prat supermercat|superverd|supermercat|supermercado|granier|\bfornet\b|panet|turris|pastisseri|carniceri|xarcuteri|xarcobel|cooperativa agricola|bon area|bonarea|\bcarref|peroy|vicsoni|verge montserrat|charter/i, category: 'groceries' },
  // Restaurantes, bares y cafeterías
  { pattern: /restaurante|mcdonalds|burger.?king|kfc|telepizza|dominos|pizzer|sushi|kebab|cafeter|\bbar\b|\bcafe\b|barbacoa|braseri|\bgranja\b|tapeo|catering|sodexo|green pay|green caf|boncafe|equilibrium/i, category: 'restaurant' },
  // Comida a domicilio
  { pattern: /glovo|deliveroo|just.?eat|uber.?eats/i, category: 'restaurant' },
  // Gasolina (E.S. = estación de servicio)
  { pattern: /repsol|cepsa|bp\b|galp|campsa|shell\b|gasolinera|carburante|e\.s\.|cedipsa|estacion de servicio/i, category: 'fuel' },
  // Transporte público
  { pattern: /renfe|metro|emt\b|avlo|ouigo|blablacar|cabify|uber\b|bolt\b|transporte|\btaxi\b|t.?mobilitat|freenow|free.?now/i, category: 'transport' },
  // Parking y Peaje
  { pattern: /parking|aparcamiento|peaje|autopista|via\.t|telepeaje/i, category: 'parking' },
  // Vehículo (taller, ITV…)
  { pattern: /taller|itv\b|neumatico|concesionario|midas|norauto|deltaprat/i, category: 'vehicle' },
  // Hipoteca / Alquiler
  { pattern: /hipoteca|prestamo hipotecario|alquiler|arrendamiento/i, category: 'mortgage' },
  // Amortización de préstamo
  { pattern: /amortizacion prestamo|cuota prestamo|cuota credito|pago prestamo/i, category: 'loan_payment' },
  // Préstamos / financiación (financieras, adeudo de cuotas)
  { pattern: /prestamos adeudo|adeudo cuota|cetelem|cofidis|financiera\b/i, category: 'loans' },
  // Comunidad de propietarios (CDAD = comunidad)
  { pattern: /comunidad de propietarios|comunidad vecinos|administrador fincas|cdad\b/i, category: 'community_fees' },
  // Gas natural (antes que electricidad: "naturgy gas" debe ganar a "naturgy")
  { pattern: /gas natural|naturgy gas|repsol gas\b|madrile.a de gas/i, category: 'gas' },
  // Electricidad
  { pattern: /endesa|iberdrola|naturgy|holaluz|octopus energy|luz\b|electricidad/i, category: 'electricity' },
  // Agua
  { pattern: /canal de isabel|aguas de|abastecimiento|suministro agua|aigues|aigües/i, category: 'water' },
  // Internet / Telefonía
  { pattern: /movistar|vodafone|orange\b|jazztel|masmovil|pepephone|digi\b|yoigo|simyo|telefonica|internet/i, category: 'internet' },
  // Seguro salud
  { pattern: /sanitas|adeslas|asisa|\bdkv\b|cigna|caser salud|mapfre salud|seguro salud/i, category: 'insurance_health' },
  // Seguro hogar (fiatc: multirramo ambiguo → mejor conjetura)
  { pattern: /seguro hogar|mapfre hogar|fiatc/i, category: 'insurance_home' },
  // Seguro auto
  { pattern: /seguro auto|seguro coche|linea directa|mutua madrilena|mapfre auto/i, category: 'insurance_auto' },
  // Hogar (reformas, muebles)
  { pattern: /ikea|leroy merlin|brico|amazon home|el corte ingles hogar|zara home|reformes|reforma/i, category: 'home' },
  // Ropa
  { pattern: /zara\b|mango\b|h&m|pull.and.bear|bershka|stradivarius|primark|lefties|el corte ingles moda|zeeman|\bmoda\b|uniformes/i, category: 'clothing' },
  // Electrónica
  { pattern: /apple store|fnac|mediamarkt|pccomponentes|worten|samsung store|vadeaudio/i, category: 'electronics' },
  // Suscripciones (antes que el "amazon" genérico de Compras)
  { pattern: /netflix|spotify|apple\.com\/bill|amzn\.com\/bill|google one|microsoft 365|adobe|youtube premium|hbo max|paramount|prime video|primevideo|amazon prime|filmin|dazn|disney\+|claude|twitch/i, category: 'subscriptions' },
  // Ocio (cine, espectáculos, loterías, parques temáticos)
  { pattern: /\bcines?\b|cinesa|multicines|teatro|concierto|entradas|ticketmaster|eventbrite|port.?aventura|euro disney|disneyland|tibidabo|loteri|tulotero|espectacul/i, category: 'leisure' },
  // Deporte (esports = deportes en catalán)
  { pattern: /gimnasio|gym\b|decathlon|intersport|padel|tenis|natacion|esports\b/i, category: 'sports' },
  // Viajes
  { pattern: /booking\.com|airbnb|ryanair|vueling|iberia\b|iberia express|easyjet|aena|hotel|hostal|alojamiento|viajes halcon|halcon viajes/i, category: 'travel' },
  // Educación (collegi/colegio, estudios reglados)
  { pattern: /udemy|coursera|openwebinars|universidad|escuela|academia|fnac libros|colleg|colegi|colegio|estudios reglados|fundacio cultural|matricula/i, category: 'education' },
  // Salud
  { pattern: /clinica|hospital|quironsalud|dentista|oculista|optica|medico|fisio|reedufisio|podolog|psicolog/i, category: 'health' },
  // Farmacia
  { pattern: /farmacia|parafarmacia|farmacor|farmablava/i, category: 'pharmacy' },
  // Belleza y cuidado personal (perruquers = peluquería en catalán)
  { pattern: /peluquer|perruqu|barberia|estetica|manicura|beauty/i, category: 'beauty' },
  // Pago / liquidación de tarjeta de crédito (no computable: las compras ya se computan en la cuenta de la tarjeta)
  { pattern: /tarjeta credito\b|liquidacion tarjeta|pago tarjeta credito/i, category: 'card_payment' },
  // Ahorro (planes de ahorro, aportaciones periódicas)
  { pattern: /plan ahorro|plan de ahorro|aportacion periodica/i, category: 'savings' },
  // Inversión
  { pattern: /degiro|myinvestor|indexa capital|openbroker|interactive brokers|trading212|etf\b|fondo de inversion|gvc gaesco|gaesco/i, category: 'investment' },
  // Nómina e ingresos laborales
  { pattern: /nomina|salario|payroll|haberes|retribucion/i, category: 'payroll' },
  // Reembolso / Devolución (antes que impuestos: "devoluciones tributarias" es una devolución)
  { pattern: /devolucion|reembolso|devoluciones tributarias/i, category: 'reimbursement' },
  // Impuestos y tasas (ayuntamiento / organisme tributari)
  { pattern: /hacienda|agencia tributaria|aeat\b|impuesto|ivtm|ibi\b|tasa\b|ajuntament|ayuntamiento|organisme tributari|\baj\.\s|sancion/i, category: 'taxes' },
  // Transferencia entre cuentas propias
  { pattern: /transferencia propia|traspaso propio|traspaso entre cuentas/i, category: 'transfer' },
  // Retirada de efectivo (captura "reintegro cajero" antes que el reembolso genérico)
  { pattern: /cajero|reintegro efectivo|reintegro cajero|retirada efectivo|withdrawal/i, category: 'cash' },
  // Compras generales (Amazon, El Corte Inglés, paquetería) — genérico, tras lo específico
  { pattern: /amazon\b|amzn\b|el corte ingles|correos\b|mrw\b|seur\b|ups\b|dhl\b|aliexpress|temu|shein|pandora|privalia/i, category: 'shopping' },
  // Solidaridad (ONG y donaciones; antes que "asociacion" genérico)
  { pattern: /cruz roja|unicef|oxfam|intermon|\baecc\b|asociacion espanola contra|\bong\b|parroquia|donacion|esplai/i, category: 'charity' },
  // Asociaciones (cuotas de socio)
  { pattern: /asociacion\b|federacion/i, category: 'memberships' },
  // Comisiones e intereses bancarios (antes del recibo genérico)
  { pattern: /comision|intereses/i, category: 'fees' },
  // ── FALLBACKS genéricos (deben ir al final) ──
  // Recibo genérico (domiciliaciones sin emisor reconocido)
  { pattern: /recibo\b/i, category: 'fees' },
  // Bizum (demasiado genérico para categorizar con precisión)
  { pattern: /bizum/i, category: 'other' },
]

export interface DbCategorizationRule {
  pattern: string
  field: 'description' | 'merchant' | 'iban'
  category_id: string
}

// Longitud máxima de un patrón de regla. Debe mantenerse sincronizada con el
// CHECK de la tabla `categorization_rules` (migración pattern_length).
export const MAX_PATTERN_LENGTH = 200
// Las descripciones bancarias son cortas; acotamos la cadena objetivo como cota
// defensiva extra para el peor caso de backtracking.
const MAX_TARGET_LENGTH = 500

export type PatternValidation = { ok: true } | { ok: false; reason: string }

// ¿hay un cuantificador no acotado (`+`, `*`, `{n,}`) "vivo" en el texto?
// Ignora los escapados (`\+`, `\*`) y los que están dentro de una clase `[...]`.
function containsUnboundedQuantifier(s: string): boolean {
  let inClass = false
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (ch === '\\') { i++; continue }
    if (inClass) { if (ch === ']') inClass = false; continue }
    if (ch === '[') { inClass = true; continue }
    if (ch === '+' || ch === '*') return true
    if (ch === '{') {
      const close = s.indexOf('}', i)
      if (close !== -1 && /^\d+,$/.test(s.slice(i + 1, close))) return true
    }
  }
  return false
}

// Detecta repetición anidada no acotada (star-height > 1), el patrón canónico del
// backtracking exponencial: un grupo `(...)` seguido de un cuantificador no acotado
// (`+`, `*`, `{n,}`) cuyo contenido contiene a su vez otro cuantificador no acotado.
// P.ej. (a+)+, (a*)*, (a+)*, ((a)+)+ … Escanea con una pila respetando escapes y
// clases de caracteres. Heurística conservadora: el cap de longitud es el backstop
// duro si esto tiene un falso negativo; un falso positivo solo omite una regla.
function hasNestedUnboundedQuantifier(pattern: string): boolean {
  const stack: number[] = []
  let inClass = false
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i]
    if (ch === '\\') { i++; continue }
    if (inClass) { if (ch === ']') inClass = false; continue }
    if (ch === '[') { inClass = true; continue }
    if (ch === '(') {
      stack.push(i)
    } else if (ch === ')') {
      const open = stack.pop()
      if (open === undefined) continue
      const next = pattern[i + 1]
      let unbounded = next === '+' || next === '*'
      if (next === '{') {
        const close = pattern.indexOf('}', i + 1)
        if (close !== -1 && /^\d+,$/.test(pattern.slice(i + 2, close))) unbounded = true
      }
      if (unbounded && containsUnboundedQuantifier(pattern.slice(open + 1, i))) return true
    }
  }
  return false
}

// Valida un patrón de regla antes de compilarlo/ejecutarlo. Fuente única de verdad,
// reutilizable por la futura UI de gestión de reglas (§14.1/§14.2 del spec).
export function validateRulePattern(pattern: string): PatternValidation {
  if (!pattern) return { ok: false, reason: 'empty' }
  if (pattern.length > MAX_PATTERN_LENGTH) return { ok: false, reason: 'too_long' }
  try {
    new RegExp(pattern, 'i')
  } catch {
    return { ok: false, reason: 'invalid_syntax' }
  }
  if (hasNestedUnboundedQuantifier(pattern)) return { ok: false, reason: 'unsafe_complexity' }
  return { ok: true }
}

export function categorize(description: string, merchant?: string): CategoryId | null {
  for (const rule of AUTO_RULES) {
    const target = rule.field === 'merchant' ? (merchant ?? '') : description
    if (target && rule.pattern.test(target)) return rule.category
  }
  return null
}

export function categorizeWithRules(
  dbRules: DbCategorizationRule[],
  description: string,
  merchant?: string
): CategoryId | null {
  for (const rule of dbRules) {
    // Tolerante a fallo: una regla inválida o con riesgo de ReDoS se OMITE en vez
    // de colgar el sync (ver issue #182). La validez/complejidad se comprueba con el
    // mismo validador que usará la UI de gestión de reglas.
    const validation = validateRulePattern(rule.pattern)
    if (!validation.ok) {
      console.warn(`[categorizeWithRules] regla omitida (${validation.reason})`)
      continue
    }
    const rawTarget = rule.field === 'merchant' ? (merchant ?? '') : description
    const target = rawTarget.slice(0, MAX_TARGET_LENGTH)
    if (target && new RegExp(rule.pattern, 'i').test(target)) {
      return rule.category_id as CategoryId
    }
  }
  return categorize(description, merchant)
}
