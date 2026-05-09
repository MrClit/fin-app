import type { CategoryId } from '@/types'

export const AUTO_RULES: { pattern: RegExp; category: CategoryId }[] = [
  // Supermercado
  { pattern: /mercadona|carrefour|lidl|aldi|dia\b|eroski|alcampo|hipercor|consum|ahorramas|supercor/i, category: 'groceries' },
  // Restaurantes
  { pattern: /restaurante|mcdonalds|burger king|kfc|telepizza|dominos|pizzer|sushi|kebab|cafeter/i, category: 'restaurant' },
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
  // Comunidad
  { pattern: /comunidad de propietarios|comunidad vecinos|administrador fincas/i, category: 'community_fees' },
  // Electricidad
  { pattern: /endesa|iberdrola|naturgy|holaluz|octopus energy|luz\b|electricidad/i, category: 'electricity' },
  // Gas natural
  { pattern: /naturgy gas|gas natural|repsol gas\b|madrileña de gas/i, category: 'gas' },
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
  // Salud
  { pattern: /clinica|hospital|sanitas|adeslas|quironsalud|dentista|oculista|optica|medico/i, category: 'health' },
  // Farmacia
  { pattern: /farmacia|parafarmacia|farmacor/i, category: 'pharmacy' },
  // Ocio
  { pattern: /cine|teatro|concierto|entradas|ticketmaster|eventbrite|amazon prime video|disney\+|hbo/i, category: 'leisure' },
  // Deporte
  { pattern: /gimnasio|gym\b|decathlon|intersport|just eat sport|padel|tenis|natacion/i, category: 'sports' },
  // Suscripciones
  { pattern: /netflix|spotify|apple\.com\/bill|google one|microsoft 365|adobe|youtube premium|hbo max|paramount/i, category: 'subscriptions' },
  // Viajes
  { pattern: /booking\.com|airbnb|ryanair|vueling|iberia|aena|hotel|hostal|alojamiento/i, category: 'travel' },
  // Educación
  { pattern: /udemy|coursera|openwebinars|universidad|escuela|academia|fnac libros/i, category: 'education' },
  // Seguros
  { pattern: /seguros|mutua madrilena|linea directa|axa\b|allianz|generali|mapfre seguro/i, category: 'insurance' },
  // Nómina
  { pattern: /nomina|salario|payroll|haberes/i, category: 'income' },
  // Reembolso
  { pattern: /devolucion|reembolso|hacienda|agencia tributaria|reintegro/i, category: 'reimbursement' },
  // Inversión
  { pattern: /degiro|myinvestor|indexa capital|openbroker|interactive brokers|trading212|etf\b|fondo de inversion/i, category: 'investment' },
]

export function categorize(description: string): CategoryId | null {
  for (const rule of AUTO_RULES) {
    if (rule.pattern.test(description)) return rule.category
  }
  return null
}
