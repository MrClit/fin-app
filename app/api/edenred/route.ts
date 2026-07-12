import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getDefaultHouseholdOwner } from '@/lib/household'
import { safeBearerMatch } from '@/lib/http/bearer'
import { badRequest, readJson } from '@/lib/http/validation'
import { edenredPayloadSchema } from '@/lib/schemas/scrapers'

export async function POST(req: Request) {
  const secret = process.env.EDENRED_WEBHOOK_SECRET
  if (!secret) {
    console.error('[edenred] EDENRED_WEBHOOK_SECRET no configurado')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  if (!safeBearerMatch(req.headers.get('authorization'), secret)) {
    return new NextResponse(null, { status: 401 })
  }

  const parsed = edenredPayloadSchema.safeParse(await readJson(req))
  if (!parsed.success) return badRequest(parsed.error)
  const payload = parsed.data

  const db = createServiceClient()

  // El webhook no tiene sesión: se resuelve el hogar (y un user_id de
  // creador/auditoría) de forma determinista a partir del owner del hogar
  // (household_members.role = 'owner', el más antiguo). Issue #196.
  const owner = await getDefaultHouseholdOwner(db)
  if (!owner) {
    console.error('[edenred] no household owner')
    return NextResponse.json({ error: 'No user configured' }, { status: 500 })
  }
  const { householdId, userId } = owner

  const { data: existingAccount, error: accSelErr } = await db
    .from('accounts')
    .select('id')
    .eq('household_id', householdId)
    .eq('source', 'scraper')
    .eq('name', 'Edenred')
    .maybeSingle()
  if (accSelErr) {
    console.error('[edenred] select account:', accSelErr)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  let accountId: string
  let createdAccount = false
  if (existingAccount) {
    accountId = existingAccount.id as string
    const { error: updErr } = await db
      .from('accounts')
      .update({ balance: payload.balance, last_synced: payload.last_synced_at })
      .eq('id', accountId)
    if (updErr) {
      console.error('[edenred] update account:', updErr)
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }
  } else {
    const { data: inserted, error: insErr } = await db
      .from('accounts')
      .insert({
        user_id: userId,
        household_id: householdId,
        name: 'Edenred',
        type: 'edenred',
        source: 'scraper',
        is_liability: false,
        balance: payload.balance,
        last_synced: payload.last_synced_at,
        currency: 'EUR',
      })
      .select('id')
      .single()
    if (insErr || !inserted) {
      console.error('[edenred] insert account:', insErr)
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }
    accountId = inserted.id as string
    createdAccount = true
  }

  let upserted = 0
  if (payload.transactions.length > 0) {
    // `category` debe coincidir con un `id` de la tabla `categories` (datos de
    // referencia compartidos, seed en
    // supabase/migrations/20260509000000_categories_type.sql). `transactions.category`
    // tiene FK a `categories.id` (#174), así que un `id` desconocido haría fallar el
    // insert; además la analítica (`get_period_data`) hace LEFT JOIN sobre `categories`
    // y dejaría la tx sin metadatos de categoría. El scraper sólo emite 'restaurant' y
    // 'payroll', y el fallback de aquí es 'restaurant'; ambos están garantizados por
    // ese seed. Ver issue #101.
    // `is_read` se omite a propósito (issue #149): los inserts nuevos toman el
    // DEFAULT false (nacen "no leídos"), y como el upsert usa
    // `ignoreDuplicates: false` (actualiza filas existentes), NO incluirlo evita
    // que un re-sync reescriba el estado de lectura de un movimiento ya leído.
    const rows = payload.transactions.map(tx => ({
      user_id: userId,
      household_id: householdId,
      account_id: accountId,
      date: tx.transaction_date,
      amount: tx.amount,
      description: tx.description,
      category: tx.category ?? 'restaurant',
      source: 'scraper' as const,
      external_id: tx.external_id,
    }))

    const { error: upsertErr } = await db
      .from('transactions')
      .upsert(rows, { onConflict: 'household_id,external_id', ignoreDuplicates: false })
    if (upsertErr) {
      console.error('[edenred] upsert transactions:', upsertErr)
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }
    upserted = rows.length
  }

  return NextResponse.json({ created_account: createdAccount, upserted })
}
