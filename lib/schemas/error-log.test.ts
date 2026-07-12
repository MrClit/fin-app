import { describe, expect, it } from 'vitest'
import { errorLogSchema } from './error-log'

describe('errorLogSchema', () => {
  it('acepta el error completo', () => {
    const body = {
      message: 'Cannot read properties of null',
      stack: 'Error: ...\n  at Foo',
      route: '/movimientos',
      context: { digest: 'abc' },
    }
    expect(errorLogSchema.parse(body)).toEqual(body)
  })

  it('acepta un error con solo el mensaje', () => {
    expect(errorLogSchema.parse({ message: 'boom' })).toEqual({
      message: 'boom',
      stack: null,
      route: null,
      context: null,
    })
  })

  it('tolera los campos de diagnóstico mal formados en vez de perder el error', () => {
    expect(errorLogSchema.parse({ message: 'boom', stack: 42, route: [], context: 'x' })).toEqual({
      message: 'boom',
      stack: null,
      route: null,
      context: null,
    })
  })

  it.each([
    ['no viene el mensaje', {}],
    ['el mensaje está vacío', { message: '   ' }],
    ['el mensaje no es un string', { message: 42 }],
  ])('rechaza el error si %s', (_label, payload) => {
    expect(errorLogSchema.safeParse(payload).success).toBe(false)
  })
})
