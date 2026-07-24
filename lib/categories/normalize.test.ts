import { describe, expect, it } from 'vitest'
import { descriptionKey, descriptionKeyRoot, descriptionKeys, KEY_STOPLIST } from './normalize'

// Los descriptores de los casos son de la forma que emiten los orígenes reales:
// Sabadell VISA («COMERCIO (POBLACIÓN)»), los recibos domiciliados de la cuenta y
// la cascada de campos de Enable Banking.

describe('descriptionKey', () => {
  describe('minúsculas y acentos', () => {
    it('pasa a minúsculas y quita los diacríticos', () => {
      expect(descriptionKey('FARMÀCIA MONTSERRAT')).toBe('farmacia montserrat')
    })

    it('agrupa el mismo comercio escrito con y sin acento', () => {
      expect(descriptionKey('Cafetería Aróztegui')).toBe(descriptionKey('CAFETERIA AROZTEGUI'))
    })
  })

  describe('puntuación', () => {
    it('parte por la puntuación en vez de pegar tokens', () => {
      expect(descriptionKey('MERCADONA (SANT BOI)')).toBe('mercadona sant boi')
    })

    it('separa los marcadores de los agregadores de pago', () => {
      expect(descriptionKey('AMZN*MKTP ES')).toBe('amzn mktp es')
    })
  })

  describe('tokens con dígitos', () => {
    it('quita el número de tarjeta', () => {
      expect(descriptionKey('COMPRA TARJ. 4106 GLOVO')).toBe('glovo')
    })

    it('quita la fecha de la operación', () => {
      expect(descriptionKey('MERCADONA 12/03')).toBe('mercadona')
    })

    it('quita el importe', () => {
      expect(descriptionKey('GLOVO APP 45,90')).toBe('glovo app')
    })

    it('quita los códigos de referencia', () => {
      expect(descriptionKey('DECATHLON REF 2Y8KJ31')).toBe('decathlon ref')
    })

    it('da la misma clave a dos cobros del mismo comercio en fechas distintas', () => {
      expect(descriptionKey('COMPRA TARJ. 4106 MERCADONA (SANT BOI) 12/03')).toBe(
        descriptionKey('COMPRA TARJ. 4106 MERCADONA (SANT BOI) 03/04')
      )
    })
  })

  describe('prefijos de trámite', () => {
    it('quita "COMPRA TARJ"', () => {
      expect(descriptionKey('COMPRA TARJ MERCADONA')).toBe('mercadona')
    })

    it('quita "RECIBO"', () => {
      expect(descriptionKey('RECIBO ENDESA ENERGIA')).toBe('endesa energia')
    })

    it('quita "ADEUDO DOMICILIADO"', () => {
      expect(descriptionKey('ADEUDO DOMICILIADO NATURGY')).toBe('naturgy')
    })

    it('quita "TRANSFERENCIA A FAVOR DE"', () => {
      expect(descriptionKey('TRANSFERENCIA A FAVOR DE ANA LOPEZ')).toBe('ana lopez')
    })

    it('quita "BIZUM DE" y conserva a la persona', () => {
      expect(descriptionKey('BIZUM DE JUAN GARCIA')).toBe('juan garcia')
    })

    it('NO quita la palabra de trámite cuando no encabeza (forma parte del nombre)', () => {
      expect(descriptionKey('BAZAR COMPRA FACIL')).toBe('bazar compra facil')
    })
  })

  describe('palabras vacías y sufijos societarios', () => {
    it('quita el sufijo societario', () => {
      expect(descriptionKey('ENDESA ENERGIA S.A.')).toBe('endesa energia')
    })

    it('da la misma clave con y sin sufijo societario', () => {
      expect(descriptionKey('REFORMES BADIA S.L.')).toBe(descriptionKey('REFORMES BADIA'))
    })

    it('quita los artículos en cualquier posición', () => {
      expect(descriptionKey('EL CORTE INGLES')).toBe('corte ingles')
    })
  })

  describe('recorte', () => {
    it('se queda con los primeros tokens con señal', () => {
      expect(descriptionKey('AJ. EL PRAT DE LLOBREGAT TASA RESIDUOS URBANOS')).toBe(
        'aj prat llobregat tasa'
      )
    })
  })

  describe('descriptores sin señal', () => {
    it.each([
      ['TRANSFERENCIA'],
      ['RECIBO'],
      ['BIZUM'],
      ['TRASPASO'],
      ['COMPRA TARJ. 4106'],
      ['PAGO 12/03 45,90'],
      ['Sin descripción'],
      ['REINTEGRO EFECTIVO'],
      ['VARIOS'],
      ['   '],
    ])('«%s» → null', descriptor => {
      expect(descriptionKey(descriptor)).toBeNull()
    })

    it('toda clave de la stoplist se resuelve a null', () => {
      for (const key of KEY_STOPLIST) expect(descriptionKey(key)).toBeNull()
    })
  })
})

describe('descriptionKeyRoot', () => {
  it('es el primer token de la clave', () => {
    expect(descriptionKeyRoot('mercadona sant boi')).toBe('mercadona')
  })

  it('agrupa el mismo comercio en ciudades distintas', () => {
    const boi = descriptionKeys('COMPRA TARJ. 4106 MERCADONA (SANT BOI)')
    const bcn = descriptionKeys('COMPRA TARJ. 4106 MERCADONA (BARCELONA)')
    expect(boi.key).not.toBe(bcn.key)
    expect(boi.root).toBe('mercadona')
    expect(bcn.root).toBe('mercadona')
  })

  it('null si la clave es de un solo token (no aporta segundo nivel)', () => {
    expect(descriptionKeyRoot('glovo')).toBeNull()
  })

  it('null si la raíz no predice categoría', () => {
    expect(descriptionKeyRoot('centro comercial gavamar')).toBeNull()
    expect(descriptionKeyRoot('casa pepe')).toBeNull()
    expect(descriptionKeyRoot('sant boi comerç')).toBeNull()
    // Determinante del nombre comercial, no el comercio (`MY SCHOOL ENGLISH…`).
    expect(descriptionKeyRoot('my school english centre')).toBeNull()
  })

  it('conserva los nombres de tipo, que sí predicen categoría', () => {
    // Todas las farmacias van a Farmacia y todos los bares a Restaurante: agrupar
    // por el tipo acierta, aunque el token sea comunísimo.
    expect(descriptionKeyRoot('farmacia montserrat')).toBe('farmacia')
    expect(descriptionKeyRoot('bar pepe')).toBe('bar')
    expect(descriptionKeyRoot('taller germans prat')).toBe('taller')
  })

  it('null si no hay clave', () => {
    expect(descriptionKeyRoot(null)).toBeNull()
  })
})

describe('descriptionKeys', () => {
  it('devuelve ambos niveles de un descriptor real', () => {
    expect(descriptionKeys('COMPRA TARJ. 4106 MERCADONA (SANT BOI) 12/03')).toEqual({
      key: 'mercadona sant boi',
      root: 'mercadona',
    })
  })

  it('devuelve ambos a null cuando el descriptor no tiene señal', () => {
    expect(descriptionKeys('TRANSFERENCIA')).toEqual({ key: null, root: null })
  })
})
