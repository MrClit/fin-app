import { describe, expect, it } from 'vitest'
import { categorize } from './rules'
import type { CategoryId } from './catalog'

// Casos positivos: una fila por cada categoría cubierta por AUTO_RULES.
// Añadir una regla nueva ⇒ añadir una fila aquí.
const positiveCases: ReadonlyArray<readonly [string, CategoryId]> = [
  ['Compra Mercadona 23/05', 'groceries'],
  ['McDonalds Madrid Centro', 'restaurant'],
  ['Pedido Glovo', 'restaurant'],
  ['Renfe AVE Barcelona', 'transport'],
  ['Gasolinera Repsol A-2', 'fuel'],
  ['Parking SABA Centro', 'parking'],
  ['Taller mecánico Pepe', 'vehicle'],
  ['Pago hipoteca mensual', 'mortgage'],
  ['Cuota prestamo coche', 'loan_payment'],
  ['Comunidad de propietarios mayo', 'community_fees'],
  ['Recibo Iberdrola luz', 'electricity'],
  ['Recibo Gas Natural Fenosa', 'gas'],
  ['Canal de Isabel II', 'water'],
  ['Movistar Fusion fibra', 'internet'],
  ['IKEA Alcorcon muebles', 'home'],
  ['Zara Centro compra', 'clothing'],
  ['MediaMarkt television', 'electronics'],
  ['Amazon EU SARL pedido', 'shopping'],
  ['Clinica Dental Madrid', 'health'],
  ['Farmacia Centro', 'pharmacy'],
  ['Peluqueria Lola', 'beauty'],
  ['Cine Yelmo Plaza Norte', 'leisure'],
  ['Decathlon material padel', 'sports'],
  ['Pago Netflix.com', 'subscriptions'],
  ['Booking.com reserva hotel', 'travel'],
  ['Udemy curso online', 'education'],
  ['Recibo Sanitas cuota salud', 'insurance_health'],
  ['Seguro hogar Mapfre anual', 'insurance_home'],
  ['Seguro auto Linea Directa', 'insurance_auto'],
  ['Recibo varios 23/05', 'fees'],
  ['Pago hacienda IRPF', 'taxes'],
  ['Nomina mayo empresa', 'payroll'],
  ['Devolucion compra online', 'reimbursement'],
  ['Transferencia propia entre cuentas', 'transfer'],
  ['Cajero ATM Banco', 'cash'],
  ['Bizum a Juan', 'other'],
  ['MyInvestor compra fondo', 'investment'],
  ['Prestamos adeudo cuota N.123', 'loans'],
  ['Aportacion periodica plan ahorro', 'savings'],
  ['Donacion Cruz Roja', 'charity'],
  ['Cuota asociacion de vecinos', 'memberships'],
  ['Tarjeta credito Victor Sales Barbera', 'card_payment'],
]

describe('categorize', () => {
  describe('casos positivos por categoría', () => {
    it.each(positiveCases)('clasifica %j como %s', (description, expected) => {
      expect(categorize(description)).toBe(expected)
    })
  })

  describe('alternativas dentro de una misma regla', () => {
    it.each([
      ['Mercadona', 'groceries'],
      ['Lidl', 'groceries'],
      ['Carrefour', 'groceries'],
      ['Dia 23/05', 'groceries'],
      ['Eroski', 'groceries'],
      ['Panet Av.Montserrat', 'groceries'],
      ['BON AREA Prat', 'groceries'],
      ['CARREF PRAT', 'groceries'],
      ['XARCOBEL-BARCELONA', 'groceries'],
      ['J.M.PEROY-PRAT DE LLOBR', 'groceries'],
      ['VICSONI GESTION', 'groceries'],
      ['VERGE MONTSERRAT-BARCELONA', 'groceries'],
    ] as const)('groceries matchea %j', (description, expected) => {
      expect(categorize(description)).toBe(expected)
    })

    it.each([
      ['McDonalds', 'restaurant'],
      ['Bar Stadium', 'restaurant'],
      ['Gumen Catering', 'restaurant'],
      ['SODEXO EDIFICIO GREEN CAF', 'restaurant'],
      ['EQUILIBRIUM PRAT', 'restaurant'],
    ] as const)('restaurant matchea %j', (description, expected) => {
      expect(categorize(description)).toBe(expected)
    })

    it.each([
      ['AIGUES DEL PRAT', 'water'],
      ['CINES CAPRI', 'leisure'],
      ['EURO DISNEY ASSOCIES', 'leisure'],
      ['INTERESES Y/O COMISIONES CUENTA', 'fees'],
      ['BONIFIC. COMISION MANT. CUENTA', 'fees'],
      ['PRIVALIA', 'shopping'],
      ['AMZN Mktp ES*RU72J4404', 'shopping'],
      ['CLAUDE.AI SUBSCRIPTION', 'subscriptions'],
      ['HELP.TWITCH.TV', 'subscriptions'],
      ['DELTAPRAT', 'vehicle'],
      ['FLAMINGO MODA', 'clothing'],
      ['COLEX UNIFORMES SL', 'clothing'],
      ['CHARTER AV DEL CANAL', 'groceries'],
      ['FREENOW* CT99OM-2', 'transport'],
      ['GENCAT SCT SANCIONS', 'taxes'],
    ] as const)('reglas nuevas del histórico: %j', (description, expected) => {
      expect(categorize(description)).toBe(expected)
    })

    it.each([
      ['Renfe', 'transport'],
      ['Metro Madrid', 'transport'],
      ['EMT bus', 'transport'],
      ['Cabify viaje', 'transport'],
      ['Uber ', 'transport'],
    ] as const)('transport matchea %j', (description, expected) => {
      expect(categorize(description)).toBe(expected)
    })

    it.each([
      ['Netflix', 'subscriptions'],
      ['Spotify Premium', 'subscriptions'],
      ['apple.com/bill', 'subscriptions'],
      ['Adobe Creative Cloud', 'subscriptions'],
    ] as const)('subscriptions matchea %j', (description, expected) => {
      expect(categorize(description)).toBe(expected)
    })
  })

  describe('case-insensitive', () => {
    it.each([
      'MERCADONA',
      'mercadona',
      'Mercadona',
      'MeRcAdOnA',
    ])('clasifica %j como groceries', description => {
      expect(categorize(description)).toBe('groceries')
    })
  })

  describe('caracteres especiales y separadores', () => {
    it('matchea con prefijo "cafeter" aunque haya acento al final ("cafetería")', () => {
      expect(categorize('Cafeteria La Plaza')).toBe('restaurant')
      expect(categorize('Cafetería La Plaza')).toBe('restaurant')
    })

    it('matchea con guion largo y otros separadores', () => {
      expect(categorize('Pago Mercadona — 23/05')).toBe('groceries')
      expect(categorize('MERCADONA*RIVAS  /  23-05')).toBe('groceries')
    })

    it('no matchea cuando el patrón sin acento aparece sólo en su forma acentuada', () => {
      // Las regex no normalizan acentos: "amortización" no contiene "amortizacion".
      // Documenta la limitación actual; si en el futuro se normaliza, ajustar.
      expect(categorize('Amortización préstamo coche')).toBeNull()
    })
  })

  describe('prioridad de orden', () => {
    it('"ADEUDO RECIBO AJ. EL PRAT" → taxes (las específicas preceden al recibo genérico)', () => {
      expect(categorize('ADEUDO RECIBO AJ. EL PRAT DE LLOBREGAT')).toBe('taxes')
    })

    it('"ADEUDO RECIBO CDAD GENERAL Y PARQUING" → community_fees (precede al recibo genérico)', () => {
      expect(categorize('ADEUDO RECIBO CDAD GENERAL Y PARQUING')).toBe('community_fees')
    })

    it('"REINTEGRO CAJERO AUTOMATICO" → cash (precede al reembolso por "reintegro")', () => {
      expect(categorize('REINTEGRO CAJERO AUTOMATICO 5402XXXXXXXX2017')).toBe('cash')
    })

    it('"Recibo Gas Natural" → gas (precede a electricidad por "naturgy")', () => {
      expect(categorize('Recibo Gas Natural distribucion')).toBe('gas')
    })

    it('"Prime Video" → subscriptions (precede al amazon genérico de Compras)', () => {
      expect(categorize('Prime Video *LV9MI3ZH5')).toBe('subscriptions')
    })

    it('"El Corte Ingles hogar muebles" → home (precede a shopping)', () => {
      expect(categorize('El Corte Ingles hogar muebles')).toBe('home')
    })

    it('"El Corte Ingles moda primavera" → clothing (precede a shopping)', () => {
      expect(categorize('El Corte Ingles moda primavera')).toBe('clothing')
    })

    it('"Compra Amazon Home utensilios" → home (precede a shopping)', () => {
      expect(categorize('Compra Amazon Home utensilios')).toBe('home')
    })
  })

  describe('campo merchant', () => {
    // Ninguna regla actual usa field: 'merchant'. Este test fija el contrato:
    // merchant se ignora salvo que una regla lo declare explícitamente.
    it('ignora merchant cuando ninguna regla lo declara', () => {
      expect(categorize('pago varios', 'Mercadona')).toBeNull()
    })

    it('sigue clasificando por description aunque haya merchant', () => {
      expect(categorize('Compra Mercadona', 'Otro Comercio')).toBe('groceries')
    })
  })

  describe('casos negativos', () => {
    it('devuelve null para descripción sin match', () => {
      expect(categorize('pago xyz desconocido')).toBeNull()
    })

    it('devuelve null para descripción vacía', () => {
      expect(categorize('')).toBeNull()
    })
  })
})
