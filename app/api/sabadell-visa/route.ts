import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getDefaultHouseholdOwner } from '@/lib/household'
import { categorizeWithRules, type DbCategorizationRule } from '@/lib/categories'
import { safeBearerMatch } from '@/lib/http/bearer'
import { badRequest, readJson } from '@/lib/http/validation'
import { sabadellVisaPayloadSchema, type SabadellCard } from '@/lib/schemas/scrapers'

// Nombre de presentación por tarjeta (clave = últimos 4 dígitos del card_id).
// Ambas VISAs comparten descripción en el banco, así que el scraper envía nombres
// genéricos ("Sabadell VISA •••• NNNN"); aquí se fija el nombre real del titular.
// Una tarjeta no listada conserva el nombre que venga del webhook.
const CARD_DISPLAY_NAMES: Record<string, string> = {
  '5011': 'Sabadell VISA Víctor',
  '4014': 'Sabadell VISA Mesalina',
}

function resolveCardName(card: SabadellCard): string {
  return CARD_DISPLAY_NAMES[card.card_id.slice(-4)] ?? card.name
}

export async function POST(req: Request) {
  const secret = process.env.SABADELL_VISA_WEBHOOK_SECRET
  if (!secret) {
    console.error('[sabadell-visa] SABADELL_VISA_WEBHOOK_SECRET no configurado')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  if (!safeBearerMatch(req.headers.get('authorization'), secret)) {
    return new NextResponse(null, { status: 401 })
  }

  const parsed = sabadellVisaPayloadSchema.safeParse(await readJson(req))
  if (!parsed.success) return badRequest(parsed.error)
  const payload = parsed.data

  const db = createServiceClient()

  // El webhook no tiene sesión: se resuelve el hogar (y un user_id de
  // creador/auditoría) de forma determinista a partir del owner del hogar
  // (household_members.role = 'owner', el más antiguo). Mismo patrón que
  // /api/edenred. Issue #196.
  const owner = await getDefaultHouseholdOwner(db)
  if (!owner) {
    console.error('[sabadell-visa] no household owner')
    return NextResponse.json({ error: 'No user configured' }, { status: 500 })
  }
  const { householdId, userId } = owner

  // Reglas de categorización del hogar (mismo criterio que la sync de Enable
  // Banking): las tarjetas de crédito son compras en comercios variados, así que
  // se auto-categoriza por descripción en vez de un valor fijo como Edenred.
  const { data: rulesData } = await db
    .from('categorization_rules')
    .select('pattern, field, category_id')
    .eq('household_id', householdId)
    .eq('is_active', true)
    .order('priority', { ascending: false })
  const dbRules: DbCategorizationRule[] = rulesData ?? []

  let createdAccounts = 0
  // Una sola tabla de filas con las transacciones de todas las tarjetas; cada
  // fila lleva su account_id resuelto. Se hace un único upsert al final.
  const txRows: Array<{
    user_id: string
    household_id: string
    account_id: string
    date: string
    amount: number
    description: string
    category: string | null
    source: 'scraper'
    external_id: string
  }> = []

  for (const card of payload.cards) {
    // Identidad de la cuenta por external_id (no por nombre), para tolerar
    // renombrados y porque ambas tarjetas comparten descripción.
    const { data: existingAccount, error: accSelErr } = await db
      .from('accounts')
      .select('id')
      .eq('household_id', householdId)
      .eq('source', 'scraper')
      .eq('external_id', card.card_id)
      .maybeSingle()
    if (accSelErr) {
      console.error('[sabadell-visa] select account:', accSelErr)
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }

    let accountId: string
    if (existingAccount) {
      accountId = existingAccount.id as string
      const { error: updErr } = await db
        .from('accounts')
        .update({ balance: card.balance, last_synced: payload.last_synced_at, name: resolveCardName(card) })
        .eq('id', accountId)
      if (updErr) {
        console.error('[sabadell-visa] update account:', updErr)
        return NextResponse.json({ error: 'DB error' }, { status: 500 })
      }
    } else {
      const { data: inserted, error: insErr } = await db
        .from('accounts')
        .insert({
          user_id: userId,
          household_id: householdId,
          name: resolveCardName(card),
          type: 'card',
          source: 'scraper',
          is_liability: true,
          balance: card.balance,
          number: card.number ?? null,
          external_id: card.card_id,
          last_synced: payload.last_synced_at,
          currency: 'EUR',
        })
        .select('id')
        .single()
      if (insErr || !inserted) {
        console.error('[sabadell-visa] insert account:', insErr)
        return NextResponse.json({ error: 'DB error' }, { status: 500 })
      }
      accountId = inserted.id as string
      createdAccounts++
    }

    for (const tx of card.transactions) {
      txRows.push({
        user_id: userId,
        household_id: householdId,
        account_id: accountId,
        date: tx.transaction_date,
        amount: tx.amount,
        description: tx.description,
        category: categorizeWithRules(dbRules, tx.description),
        source: 'scraper',
        external_id: tx.external_id,
      })
    }
  }

  let upserted = 0
  if (txRows.length > 0) {
    // `is_read` se omite a propósito (igual que Edenred, issue #149): los inserts
    // nuevos toman el DEFAULT false (nacen "no leídos") y, como el upsert usa
    // `ignoreDuplicates: false`, un re-sync NO reescribe el estado de lectura.
    const { error: upsertErr } = await db
      .from('transactions')
      .upsert(txRows, { onConflict: 'household_id,external_id', ignoreDuplicates: false })
    if (upsertErr) {
      console.error('[sabadell-visa] upsert transactions:', upsertErr)
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }
    upserted = txRows.length
  }

  return NextResponse.json({ cards: payload.cards.length, created_accounts: createdAccounts, upserted })
}
