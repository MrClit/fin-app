import type { CategoryId } from '@/types'

type RuleField = 'description' | 'merchant'

// IMPORTANTE: el orden importa — se devuelve la PRIMERA regla que casa. Las reglas
// específicas van primero y los catch-all genéricos (`recibo`, `bizum`) van al FINAL.
export const AUTO_RULES: { pattern: RegExp; category: CategoryId; field?: RuleField }[] = [
  // Supermercado (incluye cadenas locales catalanas, panaderías y carnicerías)
  { pattern: /mercadona|carrefour|lidl|aldi|dia\b|eroski|alcampo|hipercor|consum|ahorramas|supercor|caprabo|bonpreu|esclat|condis|sorli|ametller|la sirena|prat supermercat|superverd|supermercat|supermercado|granier|\bfornet\b|pastisseri|carniceri|cooperativa agricola/i, category: 'groceries' },
  // Restaurantes, bares y cafeterías
  { pattern: /restaurante|mcdonalds|burger.?king|kfc|telepizza|dominos|pizzer|sushi|kebab|cafeter|\bbar\b|\bcafe\b|barbacoa|braseri|\bgranja\b|tapeo/i, category: 'restaurant' },
  // Comida a domicilio
  { pattern: /glovo|deliveroo|just.?eat|uber.?eats/i, category: 'restaurant' },
  // Gasolina (E.S. = estación de servicio)
  { pattern: /repsol|cepsa|bp\b|galp|campsa|shell\b|gasolinera|carburante|e\.s\.|cedipsa|estacion de servicio/i, category: 'fuel' },
  // Transporte público
  { pattern: /renfe|metro|emt\b|avlo|ouigo|blablacar|cabify|uber\b|bolt\b|transporte|\btaxi\b|t.?mobilitat/i, category: 'transport' },
  // Parking y Peaje
  { pattern: /parking|aparcamiento|peaje|autopista|via\.t|telepeaje/i, category: 'parking' },
  // Vehículo (taller, ITV…)
  { pattern: /taller|itv\b|neumatico|concesionario|midas|norauto/i, category: 'vehicle' },
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
  { pattern: /canal de isabel|aguas de|abastecimiento|suministro agua/i, category: 'water' },
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
  { pattern: /zara\b|mango\b|h&m|pull.and.bear|bershka|stradivarius|primark|lefties|el corte ingles moda|zeeman/i, category: 'clothing' },
  // Electrónica
  { pattern: /apple store|fnac|mediamarkt|pccomponentes|worten|samsung store|vadeaudio/i, category: 'electronics' },
  // Suscripciones (antes que el "amazon" genérico de Compras)
  { pattern: /netflix|spotify|apple\.com\/bill|amzn\.com\/bill|google one|microsoft 365|adobe|youtube premium|hbo max|paramount|prime video|primevideo|amazon prime|filmin|dazn|disney\+/i, category: 'subscriptions' },
  // Ocio (cine, espectáculos, loterías, parques temáticos)
  { pattern: /\bcine\b|cinesa|multicines|teatro|concierto|entradas|ticketmaster|eventbrite|port.?aventura|tibidabo|loteri|tulotero|espectacul/i, category: 'leisure' },
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
  { pattern: /nomina|salario|payroll|haberes|retribucion/i, category: 'income' },
  // Reembolso / Devolución (antes que impuestos: "devoluciones tributarias" es una devolución)
  { pattern: /devolucion|reembolso|devoluciones tributarias/i, category: 'reimbursement' },
  // Impuestos y tasas (ayuntamiento / organisme tributari)
  { pattern: /hacienda|agencia tributaria|aeat\b|impuesto|ivtm|ibi\b|tasa\b|ajuntament|ayuntamiento|organisme tributari|\baj\.\s/i, category: 'taxes' },
  // Transferencia entre cuentas propias
  { pattern: /transferencia propia|traspaso propio|traspaso entre cuentas/i, category: 'transfer' },
  // Retirada de efectivo (captura "reintegro cajero" antes que el reembolso genérico)
  { pattern: /cajero|reintegro efectivo|reintegro cajero|retirada efectivo|withdrawal/i, category: 'cash' },
  // Compras generales (Amazon, El Corte Inglés, paquetería) — genérico, tras lo específico
  { pattern: /amazon\b|el corte ingles|correos\b|mrw\b|seur\b|ups\b|dhl\b|aliexpress|temu|shein|pandora/i, category: 'shopping' },
  // Solidaridad (ONG y donaciones; antes que "asociacion" genérico)
  { pattern: /cruz roja|unicef|oxfam|intermon|\baecc\b|asociacion espanola contra|\bong\b|parroquia|donacion|esplai/i, category: 'charity' },
  // Asociaciones (cuotas de socio)
  { pattern: /asociacion\b|federacion/i, category: 'memberships' },
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
    const target = rule.field === 'merchant' ? (merchant ?? '') : description
    if (target && new RegExp(rule.pattern, 'i').test(target)) {
      return rule.category_id as CategoryId
    }
  }
  return categorize(description, merchant)
}
