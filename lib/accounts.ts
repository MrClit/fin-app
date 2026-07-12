import { Landmark, CreditCard, UtensilsCrossed, Banknote, PiggyBank } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import { unwrap } from '@/lib/http/route-error'
import { narrowUnions } from '@/lib/supabase/rows'
import type { Account, AccountType } from '@/types'

type Db = SupabaseClient<Database>

/**
 * Icono Lucide que representa cada tipo de cuenta en los badges de la UI.
 * `Banknote` (no `Wallet`) para `cash`, ya que `Wallet` identifica la sección
 * "Cuentas" en la barra de navegación.
 */
export const accountTypeIcon: Record<AccountType, LucideIcon> = {
  bank:    Landmark,
  card:    CreditCard,
  edenred: UtensilsCrossed,
  cash:    Banknote,
  savings: PiggyBank,
}

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

// ─── Acceso a datos ──────────────────────────────────────────────────────────
//
// Cliente Supabase por parámetro, como en `lib/transactions.ts` (issue #306). El
// orden canónico de cuentas vive sólo aquí: `sort_order` explícito (#159) y
// `created_at` como desempate estable.

/**
 * Cuentas activas del hogar, en el orden canónico de la UI.
 *
 * Devuelve la fila completa: es el único shape de cuenta de la app. Los
 * consumidores que sólo necesitan unas columnas (el filtro de la lista de
 * movimientos, el banner PSD2) reciben un superconjunto, que sus `Pick<Account, …>`
 * aceptan sin conversión.
 */
export async function getActiveAccounts(supabase: Db, householdId: string): Promise<Account[]> {
  const rows = unwrap(
    await supabase
      .from('accounts')
      .select('*')
      .eq('household_id', householdId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    { op: 'list' }
  )

  return (rows ?? []).map(narrowUnions)
}

/**
 * `id` de la cuenta «Manual» del hogar, destino por defecto de los movimientos que el
 * usuario da de alta a mano.
 *
 * Es solo lectura: la fila la crea el bootstrap del hogar (trigger
 * `trg_household_manual_account` sobre `household_members`, más el backfill de la
 * migración `20260712000000`, issue #307), no la pantalla que la consume. Devuelve
 * `null` si el hogar no la tiene — una anomalía de datos, no un caso normal.
 */
export async function getManualAccountId(
  supabase: Db,
  householdId: string
): Promise<string | null> {
  const rows = unwrap(
    await supabase
      .from('accounts')
      .select('id')
      .eq('household_id', householdId)
      .eq('source', 'manual')
      .order('created_at', { ascending: true })
      .limit(1),
    { op: 'find-manual' }
  )

  return rows?.[0]?.id ?? null
}
