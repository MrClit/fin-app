import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { ingestErrorResponse, webhookGuard } from './webhook'

const SECRET = 'test-secret'
const schema = z.object({ balance: z.number() })

function callGuard(
  options: { auth?: string | null; secret?: string | undefined; rawBody?: string } = {}
) {
  const headers: Record<string, string> = {}
  if (options.auth !== null) headers.authorization = options.auth ?? `Bearer ${SECRET}`

  const request = new Request('http://test/api/whatever', {
    method: 'POST',
    headers,
    body: options.rawBody ?? JSON.stringify({ balance: 12.34 }),
  })

  return webhookGuard(request, {
    source: 'test',
    secretName: 'TEST_WEBHOOK_SECRET',
    secret: 'secret' in options ? options.secret : SECRET,
    schema,
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('webhookGuard', () => {
  it('devuelve 500 "Server misconfigured" si el secreto no está configurado', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})

    const guard = await callGuard({ secret: undefined })

    expect(guard.ok).toBe(false)
    if (guard.ok) return
    expect(guard.response.status).toBe(500)
    expect(await guard.response.json()).toEqual({ error: 'Server misconfigured' })
    expect(log).toHaveBeenCalledWith('[test] TEST_WEBHOOK_SECRET no configurado')
  })

  it('devuelve 401 con body vacío si falta el header Authorization', async () => {
    const guard = await callGuard({ auth: null })

    expect(guard.ok).toBe(false)
    if (guard.ok) return
    expect(guard.response.status).toBe(401)
    expect(await guard.response.text()).toBe('')
  })

  it('devuelve 401 con body vacío si el Bearer es incorrecto', async () => {
    const guard = await callGuard({ auth: 'Bearer wrong-secret' })

    expect(guard.ok).toBe(false)
    if (guard.ok) return
    expect(guard.response.status).toBe(401)
    expect(await guard.response.text()).toBe('')
  })

  it('devuelve 400 con el detalle por campo si el body no cumple el esquema', async () => {
    const guard = await callGuard({ rawBody: JSON.stringify({ balance: 'mal' }) })

    expect(guard.ok).toBe(false)
    if (guard.ok) return
    expect(guard.response.status).toBe(400)
    expect(await guard.response.json()).toMatchObject({
      error: 'Invalid body',
      issues: [{ path: 'balance' }],
    })
  })

  it('devuelve 400 si el body no es JSON parseable', async () => {
    const guard = await callGuard({ rawBody: 'not-a-json{' })

    expect(guard.ok).toBe(false)
    if (guard.ok) return
    expect(guard.response.status).toBe(400)
  })

  it('devuelve el payload tipado en el camino feliz', async () => {
    const guard = await callGuard()

    expect(guard).toEqual({ ok: true, payload: { balance: 12.34 } })
  })
})

describe('ingestErrorResponse', () => {
  it('traduce no_owner a 500 "No user configured"', async () => {
    const res = ingestErrorResponse({ code: 'no_owner' })
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'No user configured' })
  })

  it('traduce db_error a 500 "DB error"', async () => {
    const res = ingestErrorResponse({ code: 'db_error' })
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'DB error' })
  })
})
