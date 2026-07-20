import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { BadRequest, badRequest, parseBody, readJson } from './validation'

const schema = z.object({ name: z.string().min(1), age: z.number() })

function post(body: string): Request {
  return new Request('http://test/api/thing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
}

describe('readJson', () => {
  it('devuelve el JSON parseado', async () => {
    expect(await readJson(post('{"a":1}'))).toEqual({ a: 1 })
  })

  it('resuelve a undefined si el body no es JSON válido', async () => {
    expect(await readJson(post('no-json'))).toBeUndefined()
  })

  it('resuelve a undefined si el body está vacío', async () => {
    expect(await readJson(new Request('http://test/api/thing', { method: 'POST' }))).toBeUndefined()
  })
})

describe('parseBody', () => {
  it('devuelve los datos validados', async () => {
    const data = await parseBody(post('{"name":"Ana","age":40}'), schema)
    expect(data).toEqual({ name: 'Ana', age: 40 })
  })

  it('lanza BadRequest si el body no cumple el esquema', async () => {
    await expect(parseBody(post('{"name":"","age":"x"}'), schema)).rejects.toBeInstanceOf(BadRequest)
  })

  it('lanza BadRequest si el body no es JSON válido', async () => {
    await expect(parseBody(post('no-json'), schema)).rejects.toBeInstanceOf(BadRequest)
  })

  it('acepta un body ausente si el esquema lo admite', async () => {
    const optional = z.object({ id: z.string().optional() }).nullish().transform(b => b ?? {})
    const data = await parseBody(new Request('http://test/api/thing', { method: 'POST' }), optional)
    expect(data).toEqual({})
  })
})

describe('badRequest', () => {
  it('responde 400 con el detalle por campo', async () => {
    const result = schema.safeParse({ name: '', age: 'x' })
    const res = badRequest(result.success ? undefined : result.error)

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({
      error: 'Invalid body',
      issues: [
        { path: 'name', message: expect.any(String) },
        { path: 'age', message: expect.any(String) },
      ],
    })
  })

  it('responde 400 sin `issues` cuando no hay error de Zod', async () => {
    const res = badRequest()

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Invalid body' })
  })
})
