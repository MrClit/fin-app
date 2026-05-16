import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { createServiceClient } from '@/lib/supabase/service'

type EdenredTx = {
  external_id: string
  amount: number
  description: string
  transaction_date: string
}

type EdenredPayload = {
  balance: number
  last_synced_at: string
  transactions: EdenredTx[]
}

function isValidPayload(data: unknown): data is EdenredPayload {
  if (!data || typeof data !== 'object') return false
  const p = data as Record<string, unknown>
  if (typeof p.balance !== 'number') return false
  if (typeof p.last_synced_at !== 'string') return false
  if (!Array.isArray(p.transactions)) return false
  return p.transactions.every(tx =>
    tx
    && typeof tx === 'object'
    && typeof (tx as EdenredTx).external_id === 'string'
    && typeof (tx as EdenredTx).amount === 'number'
    && typeof (tx as EdenredTx).description === 'string'
    && typeof (tx as EdenredTx).transaction_date === 'string'
  )
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
  const secret = process.env.EDENRED_WEBHOOK_SECRET
  if (!secret) {
    console.error('[edenred] EDENRED_WEBHOOK_SECRET no configurado')
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

  // App de usuario único: el webhook no tiene sesión, así que el user_id se
  // resuelve leyendo el único registro de user_config (decisión documentada
  // en el plan de #53).
  const { data: userRow, error: userErr } = await db
    .from('user_config')
    .select('user_id')
    .limit(1)
    .maybeSingle()
  if (userErr || !userRow) {
    console.error('[edenred] no user_config:', userErr)
    return NextResponse.json({ error: 'No user configured' }, { status: 500 })
  }
  const userId = userRow.user_id as string

  const { data: existingAccount, error: accSelErr } = await db
    .from('accounts')
    .select('id')
    .eq('user_id', userId)
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
    const rows = payload.transactions.map(tx => ({
      user_id: userId,
      account_id: accountId,
      date: tx.transaction_date,
      amount: tx.amount,
      description: tx.description,
      category: 'restaurant',
      source: 'scraper' as const,
      external_id: tx.external_id,
      is_computable: false,
      is_internal_transfer: false,
    }))

    const { error: upsertErr } = await db
      .from('transactions')
      .upsert(rows, { onConflict: 'user_id,external_id', ignoreDuplicates: false })
    if (upsertErr) {
      console.error('[edenred] upsert transactions:', upsertErr)
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }
    upserted = rows.length
  }

  return NextResponse.json({ created_account: createdAccount, upserted })
}
