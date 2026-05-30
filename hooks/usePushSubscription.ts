'use client'

import { useCallback, useEffect, useState } from 'react'
import { urlBase64ToUint8Array } from '@/lib/push-client'

/**
 * Gestiona la suscripción a notificaciones push del navegador (issue #115).
 *
 * - `support`: 'loading' mientras se comprueba, 'supported' o 'unsupported'.
 *   No soportado típico: Safari iOS sin instalar la PWA (requiere iOS 16.4+ y
 *   "Añadir a pantalla de inicio").
 * - `enabled`: hay una suscripción activa para este navegador.
 * - `subscribe`/`unsubscribe`: solo deben llamarse desde una interacción
 *   explícita del usuario (pedir permiso al cargar es mal patrón).
 */
export type PushSupport = 'loading' | 'supported' | 'unsupported'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

export function usePushSubscription() {
  const [support, setSupport] = useState<PushSupport>('loading')
  const [enabled, setEnabled] = useState(false)
  const [busy, setBusy] = useState(false)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    let cancelled = false

    // La detección de soporte y el estado de la suscripción se resuelven en una
    // única actualización asíncrona (evita setState síncrono dentro del effect).
    async function detect() {
      const supported =
        typeof window !== 'undefined' &&
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window &&
        Boolean(VAPID_PUBLIC_KEY)

      if (!supported) return { support: 'unsupported' as const, enabled: false, denied: false }

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription().catch(() => null)
      return {
        support: 'supported' as const,
        enabled: Boolean(sub),
        denied: Notification.permission === 'denied',
      }
    }

    detect().then(state => {
      if (cancelled) return
      setSupport(state.support)
      setEnabled(state.enabled)
      setDenied(state.denied)
    })

    return () => {
      cancelled = true
    }
  }, [])

  const subscribe = useCallback(async () => {
    if (support !== 'supported' || !VAPID_PUBLIC_KEY) return
    setBusy(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setDenied(permission === 'denied')
        return
      }

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      const json = sub.toJSON()
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      })
      if (!res.ok) {
        await sub.unsubscribe()
        throw new Error('No se pudo guardar la suscripción')
      }
      setEnabled(true)
    } finally {
      setBusy(false)
    }
  }, [support])

  const unsubscribe = useCallback(async () => {
    if (support !== 'supported') return
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setEnabled(false)
    } finally {
      setBusy(false)
    }
  }, [support])

  return { support, enabled, busy, denied, subscribe, unsubscribe }
}
