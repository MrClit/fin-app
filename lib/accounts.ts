import type { Account } from '@/types'

/**
 * Estado de caducidad del consentimiento PSD2 de una cuenta (spec §9.2).
 * - `ok`       — más de 14 días para caducar
 * - `warning`  — entre 7 y 14 días
 * - `critical` — menos de 7 días
 * - `expired`  — ya caducada o sin fecha de caducidad
 */
export type ConsentStatus = 'ok' | 'warning' | 'critical' | 'expired'

export interface ConsentInfo {
  status: ConsentStatus
  /** Días enteros restantes (redondeo al alza). 0 si caducada o sin fecha. */
  daysLeft: number
}

const DAY_MS = 86_400_000

/**
 * Clasifica la caducidad del consentimiento PSD2 a partir de `consent_expires_at`.
 * Una fecha ausente o inválida se trata como `expired` (spec §9.2).
 */
export function getConsentStatus(consentExpiresAt: string | null): ConsentInfo {
  if (!consentExpiresAt) return { status: 'expired', daysLeft: 0 }
  const expiry = new Date(consentExpiresAt).getTime()
  if (Number.isNaN(expiry)) return { status: 'expired', daysLeft: 0 }

  const msLeft = expiry - Date.now()
  if (msLeft <= 0) return { status: 'expired', daysLeft: 0 }

  const daysLeft = Math.ceil(msLeft / DAY_MS)
  if (daysLeft > 14) return { status: 'ok', daysLeft }
  if (daysLeft >= 7) return { status: 'warning', daysLeft }
  return { status: 'critical', daysLeft }
}

export interface ConsentBannerData {
  /** Nº de conexiones PSD2 en estado `critical` o `expired`. */
  count: number
  /** Datos de la única conexión afectada; solo poblado cuando `count === 1`. */
  only: { name: string; status: 'critical' | 'expired'; expiresAt: string | null } | null
}

type ConsentAccount = Pick<Account, 'name' | 'source' | 'consent_expires_at'>

/**
 * Resume las conexiones PSD2 que requieren acción (caducan pronto o ya
 * caducaron) para el banner global. Solo considera cuentas `enablebanking`.
 * Devuelve `null` cuando no hay nada que avisar.
 */
export function getConsentBannerData(accounts: ConsentAccount[]): ConsentBannerData | null {
  const atRisk = accounts
    .filter(a => a.source === 'enablebanking')
    .map(a => ({ account: a, consent: getConsentStatus(a.consent_expires_at) }))
    .filter(({ consent }) => consent.status === 'critical' || consent.status === 'expired')

  if (atRisk.length === 0) return null

  if (atRisk.length === 1) {
    const { account, consent } = atRisk[0]
    return {
      count: 1,
      only: {
        name: account.name,
        status: consent.status as 'critical' | 'expired',
        expiresAt: account.consent_expires_at,
      },
    }
  }

  return { count: atRisk.length, only: null }
}
