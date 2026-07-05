import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getDefaultHouseholdOwner } from '@/lib/household'
import { safeBearerMatch } from '@/lib/http/bearer'
import { categorizeSavingsMovement } from './categories'

// Webhook de datos del scraper del plan de ahorro Sabadell (Bansabadell Vida,
// #197). Molde de /api/edenred (una sola cuenta con balance + transacciones),
// pero con identidad por `external_id` (como /api/sabadell-visa) y tipo 'savings'.

type SavingsTx = {
  external_id: string
  amount: number
  description: string
  transaction_date: string
}

type SavingsAccount = {
  // Identidad estable del plan: `productCode` normalizado (Fase 0), p.ej.
  // "32000007181690". Se usa como accounts.external_id para tolerar renombrados.
  account_id: string
  name: string
  number?: string
  // Saldo acumulado del plan (activo → positivo).
  balance: number
  transactions: SavingsTx[]
}

type SavingsPayload = {
  last_synced_at: string
  account: SavingsAccount
}

// sort_order del plan de ahorro: tras la cuenta corriente (bank=10) y antes de
// las tarjetas (20/30). Ver 20260607000000_accounts_sort_order.sql. Sólo se fija
// en el INSERT: un re-sync no pisa un reordenamiento manual posterior.
const SAVINGS_SORT_ORDER = 15

function isValidTx(tx: unknown): tx is SavingsTx {
  if (!tx || typeof tx !== 'object') return false
  const t = tx as SavingsTx
  if (typeof t.external_id !== 'string' || t.external_id === '') return false
  if (typeof t.amount !== 'number' || !Number.isFinite(t.amount)) return false
  if (typeof t.description !== 'string') return false
  if (typeof t.transaction_date !== 'string') return false
  return true
}

function isValidPayload(data: unknown): data is SavingsPayload {
  if (!data || typeof data !== 'object') return false
  const p = data as Record<string, unknown>
  if (typeof p.last_synced_at !== 'string') return false
  const a = p.account as SavingsAccount | undefined
  if (!a || typeof a !== 'object') return false
  if (typeof a.account_id !== 'string' || a.account_id === '') return false
  if (typeof a.name !== 'string') return false
  if (a.number !== undefined && typeof a.number !== 'string') return false
  if (typeof a.balance !== 'number' || !Number.isFinite(a.balance)) return false
  if (!Array.isArray(a.transactions)) return false
  return a.transactions.every(isValidTx)
}

export async function POST(req: Request) {
  const secret = process.env.SABADELL_SAVINGS_WEBHOOK_SECRET
  if (!secret) {
    console.error('[sabadell-savings] SABADELL_SAVINGS_WEBHOOK_SECRET no configurado')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  if (!safeBearerMatch(req.headers.get('authorization'), secret)) {
    return new NextResponse(null, { status: 401 })
  }

  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  if (!isValidPayload(payload)) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const db = createServiceClient()

  // El webhook no tiene sesión: se resuelve el hogar (y un user_id de
  // creador/auditoría) de forma determinista a partir del owner del hogar.
  // Mismo patrón que /api/edenred y /api/sabadell-visa. Issue #196.
  const owner = await getDefaultHouseholdOwner(db)
  if (!owner) {
    console.error('[sabadell-savings] no household owner')
    return NextResponse.json({ error: 'No user configured' }, { status: 500 })
  }
  const { householdId, userId } = owner

  const account = payload.account

  // Identidad por external_id (no por nombre), para tolerar renombrados.
  const { data: existingAccount, error: accSelErr } = await db
    .from('accounts')
    .select('id')
    .eq('household_id', householdId)
    .eq('source', 'scraper')
    .eq('external_id', account.account_id)
    .maybeSingle()
  if (accSelErr) {
    console.error('[sabadell-savings] select account:', accSelErr)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  let accountId: string
  let createdAccount = false
  if (existingAccount) {
    accountId = existingAccount.id as string
    const { error: updErr } = await db
      .from('accounts')
      .update({ balance: account.balance, last_synced: payload.last_synced_at, name: account.name })
      .eq('id', accountId)
    if (updErr) {
      console.error('[sabadell-savings] update account:', updErr)
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }
  } else {
    const { data: inserted, error: insErr } = await db
      .from('accounts')
      .insert({
        user_id: userId,
        household_id: householdId,
        name: account.name,
        type: 'savings',
        source: 'scraper',
        is_liability: false,
        balance: account.balance,
        number: account.number ?? null,
        external_id: account.account_id,
        last_synced: payload.last_synced_at,
        sort_order: SAVINGS_SORT_ORDER,
        currency: 'EUR',
      })
      .select('id')
      .single()
    if (insErr || !inserted) {
      console.error('[sabadell-savings] insert account:', insErr)
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }
    accountId = inserted.id as string
    createdAccount = true
  }

  let upserted = 0
  if (account.transactions.length > 0) {
    // Categorización determinista por concepto (REVALORIZACION → returns; resto →
    // savings). `is_read` se omite a propósito (igual que Edenred/visa, #149): los
    // inserts nuevos toman el DEFAULT false y, como el upsert usa
    // `ignoreDuplicates: false`, un re-sync NO reescribe el estado de lectura.
    const rows = account.transactions.map(tx => ({
      user_id: userId,
      household_id: householdId,
      account_id: accountId,
      date: tx.transaction_date,
      amount: tx.amount,
      description: tx.description,
      category: categorizeSavingsMovement(tx.description),
      source: 'scraper' as const,
      external_id: tx.external_id,
    }))

    const { error: upsertErr } = await db
      .from('transactions')
      .upsert(rows, { onConflict: 'household_id,external_id', ignoreDuplicates: false })
    if (upsertErr) {
      console.error('[sabadell-savings] upsert transactions:', upsertErr)
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }
    upserted = rows.length
  }

  return NextResponse.json({ created_account: createdAccount, upserted })
}
