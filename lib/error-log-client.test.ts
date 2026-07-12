import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

import { reportClientError } from './error-log-client'

// El helper corre en el navegador: simulamos `fetch` y la ruta actual.
const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  fetchMock.mockResolvedValue(new Response('{}'))
  vi.stubGlobal('fetch', fetchMock)
  vi.stubGlobal('window', { location: { pathname: '/analisis' } })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function sentBody() {
  const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
  return JSON.parse(init.body as string)
}

describe('reportClientError', () => {
  it('postea el error con la ruta actual y el digest en el contexto', () => {
    const error = Object.assign(new Error('boom'), { digest: 'abc123', stack: 'at foo' })

    reportClientError(error)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/error-log')
    expect(sentBody()).toEqual({
      message: 'boom',
      stack: 'at foo',
      route: '/analisis',
      context: { digest: 'abc123' },
    })
  })

  it('fusiona el contexto extra: así `global-error` marca su scope', () => {
    const error = Object.assign(new Error('boom'), { digest: 'abc123' })

    reportClientError(error, { scope: 'global' })

    expect(sentBody().context).toEqual({ digest: 'abc123', scope: 'global' })
  })

  it('es best-effort: un fetch que falla no propaga la excepción', async () => {
    fetchMock.mockRejectedValue(new Error('offline'))

    expect(() => reportClientError(new Error('boom'))).not.toThrow()
    // Deja que el rechazo se resuelva: no debe quedar una promesa sin manejar.
    await Promise.resolve()
  })
})
