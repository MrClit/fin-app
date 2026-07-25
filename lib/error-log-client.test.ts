import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { callAt } from '@/tests/helpers'

import { createRejectionReporter, reportClientError } from './error-log-client'

// El helper corre en el navegador: simulamos `fetch`, la ruta actual y el entorno
// que se adjunta como contexto (#387).
const fetchMock = vi.fn()

// Lo que `environmentContext()` deriva de los globals simulados aquí abajo.
const ENV_CONTEXT = {
  online: true,
  ua: 'Safari/iOS',
  swController: true,
  visibility: 'visible',
  standalone: true,
}

beforeEach(() => {
  fetchMock.mockReset()
  fetchMock.mockResolvedValue(new Response('{}'))
  vi.stubGlobal('fetch', fetchMock)
  vi.stubGlobal('window', {
    location: { pathname: '/analisis' },
    matchMedia: () => ({ matches: true }),
  })
  vi.stubGlobal('navigator', {
    onLine: true,
    userAgent: 'Safari/iOS',
    serviceWorker: { controller: {} },
  })
  vi.stubGlobal('document', { visibilityState: 'visible' })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function sentBody(i = 0) {
  const [, init] = callAt(fetchMock, i) as [string, RequestInit]
  return JSON.parse(init.body as string)
}

describe('reportClientError', () => {
  it('postea el error con la ruta actual, el digest y el entorno en el contexto', () => {
    const error = Object.assign(new Error('boom'), { digest: 'abc123', stack: 'at foo' })

    reportClientError(error)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(callAt(fetchMock, 0)[0]).toBe('/api/error-log')
    expect(sentBody()).toEqual({
      message: 'boom',
      stack: 'at foo',
      route: '/analisis',
      context: { name: 'Error', digest: 'abc123', ...ENV_CONTEXT },
    })
  })

  it('fusiona el contexto extra: así `global-error` marca su scope', () => {
    const error = Object.assign(new Error('boom'), { digest: 'abc123' })

    reportClientError(error, { scope: 'global' })

    expect(sentBody().context).toEqual({
      name: 'Error',
      digest: 'abc123',
      ...ENV_CONTEXT,
      scope: 'global',
    })
  })

  it('el contexto del llamante pisa el del entorno', () => {
    reportClientError(new Error('boom'), { online: false })

    expect(sentBody().context.online).toBe(false)
  })

  it('es best-effort: un fetch que falla no propaga la excepción', async () => {
    fetchMock.mockRejectedValue(new Error('offline'))

    expect(() => reportClientError(new Error('boom'))).not.toThrow()
    // Deja que el rechazo se resuelva: no debe quedar una promesa sin manejar.
    await Promise.resolve()
  })
})

describe('createRejectionReporter', () => {
  it('reporta el rechazo marcando su scope', () => {
    createRejectionReporter()(new TypeError('Load failed'))

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(sentBody()).toMatchObject({
      message: 'Load failed',
      context: { name: 'TypeError', scope: 'unhandledrejection' },
    })
  })

  it('deduplica por mensaje: una ráfaga del mismo fallo es un solo aviso', () => {
    const report = createRejectionReporter()

    report(new TypeError('Load failed'))
    report(new TypeError('Load failed'))
    report(new TypeError('otro fallo'))

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(sentBody(1).message).toBe('otro fallo')
  })

  it('topa los avisos por carga de página', () => {
    const report = createRejectionReporter()

    for (let i = 0; i < 8; i++) report(new Error(`fallo ${i}`))

    expect(fetchMock).toHaveBeenCalledTimes(5)
  })

  it('cada instancia lleva su propio tope y dedupe', () => {
    createRejectionReporter()(new Error('boom'))
    createRejectionReporter()(new Error('boom'))

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('normaliza un rechazo que no es Error', () => {
    createRejectionReporter()('se cayó la red')

    expect(sentBody().message).toBe('se cayó la red')
  })
})
