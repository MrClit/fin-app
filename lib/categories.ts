import type { CategoryId } from '@/types'

type RuleField = 'description' | 'merchant'

export const AUTO_RULES: { pattern: RegExp; category: CategoryId; field?: RuleField }[] = [
  // Supermercado
  { pattern: /mercadona|carrefour|lidl|aldi|dia\b|eroski|alcampo|hipercor|consum|ahorramas|supercor/i, category: 'groceries' },
  // Restaurantes
  { pattern: /restaurante|mcdonalds|burger.?king|kfc|telepizza|dominos|pizzer|sushi|kebab|cafeter/i, category: 'restaurant' },
  // Comida a domicilio
  { pattern: /glovo|deliveroo|just.?eat|uber.?eats/i, category: 'restaurant' },
  // Transporte público
  { pattern: /renfe|metro|emt\b|avlo|ouigo|blablacar|cabify|uber\b|bolt\b|transporte/i, category: 'transport' },
  // Gasolina
  { pattern: /repsol|cepsa|bp\b|galp|campsa|shell\b|gasolinera|carburante/i, category: 'fuel' },
  // Parking y Peaje
  { pattern: /parking|aparcamiento|peaje|autopista|via\.t|telepeaje/i, category: 'parking' },
  // Vehículo
  { pattern: /taller|itv\b|neumatico|concesionario|mapfre auto|adeslas auto|midas|norauto/i, category: 'vehicle' },
  // Hipoteca / Alquiler
  { pattern: /hipoteca|prestamo hipotecario|alquiler|arrendamiento/i, category: 'mortgage' },
  // Amortización de préstamo
  { pattern: /cuota prestamo|cuota credito|amortizacion prestamo|pago prestamo/i, category: 'loan_payment' },
  // Comunidad de propietarios
  { pattern: /comunidad de propietarios|comunidad vecinos|administrador fincas/i, category: 'community_fees' },
  // Electricidad
  { pattern: /endesa|iberdrola|naturgy|holaluz|octopus energy|luz\b|electricidad/i, category: 'electricity' },
  // Gas natural
  { pattern: /naturgy gas|gas natural|repsol gas\b|madrile.a de gas/i, category: 'gas' },
  // Agua
  { pattern: /canal de isabel|aguas de|abastecimiento|suministro agua/i, category: 'water' },
  // Internet / Telefonía
  { pattern: /movistar|vodafone|orange\b|jazztel|masmovil|pepephone|digi\b|yoigo|simyo|telefonica|internet/i, category: 'internet' },
  // Hogar (reformas, muebles)
  { pattern: /ikea|leroy merlin|brico|amazon home|el corte ingles hogar|zara home/i, category: 'home' },
  // Ropa
  { pattern: /zara\b|mango\b|hm\b|h&m|pull.and.bear|bershka|stradivarius|primark|lefties|el corte ingles moda/i, category: 'clothing' },
  // Electrónica
  { pattern: /apple store|fnac|mediamarkt|pccomponentes|worten|samsung store/i, category: 'electronics' },
  // Compras generales (Amazon, El Corte Inglés, paquetería)
  { pattern: /amazon\b|el corte ingles|correos\b|mrw\b|seur\b|ups\b|dhl\b/i, category: 'shopping' },
  // Salud
  { pattern: /clinica|hospital|sanitas|adeslas|quironsalud|dentista|oculista|optica|medico/i, category: 'health' },
  // Farmacia
  { pattern: /farmacia|parafarmacia|farmacor/i, category: 'pharmacy' },
  // Belleza y cuidado personal
  { pattern: /peluquer|barberia|estetica|manicura|beauty/i, category: 'beauty' },
  // Ocio
  { pattern: /cine|teatro|concierto|entradas|ticketmaster|eventbrite|amazon prime video|disney\+|hbo/i, category: 'leisure' },
  // Deporte
  { pattern: /gimnasio|gym\b|decathlon|intersport|padel|tenis|natacion/i, category: 'sports' },
  // Suscripciones
  { pattern: /netflix|spotify|apple\.com\/bill|google one|microsoft 365|adobe|youtube premium|hbo max|paramount/i, category: 'subscriptions' },
  // Viajes
  { pattern: /booking\.com|airbnb|ryanair|vueling|iberia\b|iberia express|easyjet|aena|hotel|hostal|alojamiento/i, category: 'travel' },
  // Educación
  { pattern: /udemy|coursera|openwebinars|universidad|escuela|academia|fnac libros/i, category: 'education' },
  // Recibo de seguro (antes que recibo genérico)
  { pattern: /recibo\s+(?:seguro|axa|mapfre|allianz|mutua|linea directa|generali)/i, category: 'insurance' },
  // Seguros (descripción o comercio)
  { pattern: /seguros|mutua madrilena|linea directa|axa\b|allianz|generali|mapfre seguro/i, category: 'insurance' },
  // Recibo genérico (domiciliaciones)
  { pattern: /recibo\b/i, category: 'fees' },
  // Impuestos y tasas
  { pattern: /hacienda|agencia tributaria|aeat\b|impuesto|ivtm|ibi\b|tasa\b/i, category: 'taxes' },
  // Nómina e ingresos laborales
  { pattern: /nomina|salario|payroll|haberes|retribucion/i, category: 'income' },
  // Reembolso / Devolución (antes que hacienda genérico)
  { pattern: /devolucion|reembolso|reintegro/i, category: 'reimbursement' },
  // Transferencia entre cuentas propias
  { pattern: /transferencia propia|traspaso propio|traspaso entre cuentas/i, category: 'transfer' },
  // Retirada de efectivo
  { pattern: /cajero|reintegro efectivo|retirada efectivo|withdrawal/i, category: 'cash' },
  // Bizum (demasiado genérico para categorizar con precisión)
  { pattern: /bizum/i, category: 'other' },
  // Inversión
  { pattern: /degiro|myinvestor|indexa capital|openbroker|interactive brokers|trading212|etf\b|fondo de inversion/i, category: 'investment' },
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
