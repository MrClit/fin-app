import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { createServiceClient } from '@/lib/supabase/service'
import { categorizeWithRules, type DbCategorizationRule } from '@/lib/categories'

type SabadellTx = {
  external_id: string
  amount: number
  description: string
  transaction_date: string
}

type SabadellCard = {
  // Identidad estable de la tarjeta: PAN enmascarado (p.ej. "4106________4014").
  // Las dos tarjetas comparten descripción ("VISA CLASSIC BSAB"), así que el
  // número es lo único que las distingue. Se usa como accounts.external_id.
  card_id: string
  name: string
  number?: string
  // Saldo de la cuenta de tarjeta (pasivo): deuda pendiente en negativo.
  balance: number
  transactions: SabadellTx[]
}

type SabadellPayload = {
  last_synced_at: string
  cards: SabadellCard[]
}

function isValidTx(tx: unknown): tx is SabadellTx {
  if (!tx || typeof tx !== 'object') return false
  const t = tx as SabadellTx
  if (typeof t.external_id !== 'string' || t.external_id === '') return false
  if (typeof t.amount !== 'number' || !Number.isFinite(t.amount)) return false
  if (typeof t.description !== 'string') return false
  if (typeof t.transaction_date !== 'string') return false
  return true
}

function isValidPayload(data: unknown): data is SabadellPayload {
  if (!data || typeof data !== 'object') return false
  const p = data as Record<string, unknown>
  if (typeof p.last_synced_at !== 'string') return false
  if (!Array.isArray(p.cards)) return false
  return p.cards.every(card => {
    if (!card || typeof card !== 'object') return false
    const c = card as SabadellCard
    if (typeof c.card_id !== 'string' || c.card_id === '') return false
    if (typeof c.name !== 'string') return false
    if (c.number !== undefined && typeof c.number !== 'string') return false
    if (typeof c.balance !== 'number' || !Number.isFinite(c.balance)) return false
    if (!Array.isArray(c.transactions)) return false
    return c.transactions.every(isValidTx)
  })
}

function safeBearerMatch(header: string | null, secret: string): boolean {
  if (!header) return false
  const expected = `Bearer ${secret}`
  const a = Buffer.from(header)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export async function POST(req: Request) {
  const secret = process.env.SABADELL_WEBHOOK_SECRET
  if (!secret) {
    console.error('[sabadell] SABADELL_WEBHOOK_SECRET no configurado')
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
  // creador/auditoría) leyendo el único registro de user_config. App personal
  // con un único hogar (mismo patrón que /api/edenred).
  const { data: userRow, error: userErr } = await db
    .from('user_config')
    .select('user_id, household_id')
    .limit(1)
    .maybeSingle()
  if (userErr || !userRow || !userRow.household_id) {
    console.error('[sabadell] no user_config/household:', userErr)
    return NextResponse.json({ error: 'No user configured' }, { status: 500 })
  }
  const userId = userRow.user_id as string
  const householdId = userRow.household_id as string

  // Reglas de categorización del hogar (mismo criterio que la sync de Enable
  // Banking): las tarjetas de crédito son compras en comercios variados, así que
  // se auto-categoriza por descripción en vez de un valor fijo como Edenred.
  const { data: rulesData } = await db
    .from('categorization_rules')
    .select('pattern, field, category_id')
    .eq('household_id', householdId)
    .eq('is_active', true)
    .order('priority', { ascending: false })
  const dbRules: DbCategorizationRule[] = (rulesData ?? []) as DbCategorizationRule[]

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
      console.error('[sabadell] select account:', accSelErr)
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }

    let accountId: string
    if (existingAccount) {
      accountId = existingAccount.id as string
      const { error: updErr } = await db
        .from('accounts')
        .update({ balance: card.balance, last_synced: payload.last_synced_at, name: card.name })
        .eq('id', accountId)
      if (updErr) {
        console.error('[sabadell] update account:', updErr)
        return NextResponse.json({ error: 'DB error' }, { status: 500 })
      }
    } else {
      const { data: inserted, error: insErr } = await db
        .from('accounts')
        .insert({
          user_id: userId,
          household_id: householdId,
          name: card.name,
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
        console.error('[sabadell] insert account:', insErr)
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
      console.error('[sabadell] upsert transactions:', upsertErr)
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }
    upserted = txRows.length

    // Refresca la matview de analítica (CONCURRENTLY) para que los gastos de
    // tarjeta entren en las agregaciones sin esperar a la sync de Enable Banking.
    const { error: refreshError } = await db.rpc('refresh_monthly_summary')
    if (refreshError) console.error('[sabadell] refresh_monthly_summary:', refreshError)
  }

  return NextResponse.json({ cards: payload.cards.length, created_accounts: createdAccounts, upserted })
}
