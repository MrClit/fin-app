import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getDefaultHouseholdOwner } from '@/lib/household'
import { safeBearerMatch } from '@/lib/http/bearer'
import { badRequest, readJson } from '@/lib/http/validation'
import { sabadellSavingsPayloadSchema } from '@/lib/schemas/scrapers'
import { categorizeSavingsMovement } from './categories'

// Webhook de datos del scraper del plan de ahorro Sabadell (Bansabadell Vida,
// #197). Molde de /api/edenred (una sola cuenta con balance + transacciones),
// pero con identidad por `external_id` (como /api/sabadell-visa) y tipo 'savings'.

// sort_order del plan de ahorro: tras la cuenta corriente (bank=10) y antes de
// las tarjetas (20/30). Ver 20260607000000_accounts_sort_order.sql. Sólo se fija
// en el INSERT: un re-sync no pisa un reordenamiento manual posterior.
const SAVINGS_SORT_ORDER = 15

export async function POST(req: Request) {
  const secret = process.env.SABADELL_SAVINGS_WEBHOOK_SECRET
  if (!secret) {
    console.error('[sabadell-savings] SABADELL_SAVINGS_WEBHOOK_SECRET no configurado')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  if (!safeBearerMatch(req.headers.get('authorization'), secret)) {
    return new NextResponse(null, { status: 401 })
  }

  const parsed = sabadellSavingsPayloadSchema.safeParse(await readJson(req))
  if (!parsed.success) return badRequest(parsed.error)
  const payload = parsed.data

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
