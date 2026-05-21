import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { createServiceClient } from '@/lib/supabase/service'
import { getAccountTransactions } from '@/lib/enablebanking'
import { categorizeWithRules, type DbCategorizationRule } from '@/lib/categories'

function safeBearerMatch(header: string | null, secret: string): boolean {
  if (!header) return false
  const expected = `Bearer ${secret}`
  const a = Buffer.from(header)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export async function POST(req: Request) {
  const secret = process.env.ENABLEBANKING_WEBHOOK_SECRET
  if (!secret) {
    console.error('[sync/eb/cron] ENABLEBANKING_WEBHOOK_SECRET no configurado')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  if (!safeBearerMatch(req.headers.get('authorization'), secret)) {
    return new NextResponse(null, { status: 401 })
  }

  const db = createServiceClient()

  const { data: accounts, error: accountsError } = await db
    .from('accounts')
    .select('id, user_id, external_id, session_id, last_synced, consent_expires_at')
    .eq('source', 'enablebanking')
    .eq('is_active', true)

  if (accountsError) {
    console.error('[sync/eb/cron] fetch accounts:', accountsError)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  if (!accounts || accounts.length === 0) {
    return NextResponse.json({ synced: 0, accounts: 0, skipped: [], failed: [] })
  }

  // Caducidad PSD2: se saltan las conexiones caducadas (o sin fecha) y se
  // refleja el motivo en la respuesta del cron (issue #78).
  const nowMs = Date.now()
  const skipped: { account_id: string; reason: string }[] = []
  const syncable = accounts.filter(account => {
    const expiry = account.consent_expires_at
      ? new Date(account.consent_expires_at as string).getTime()
      : 0
    if (!expiry || expiry <= nowMs) {
      skipped.push({ account_id: account.id as string, reason: 'consent_expired' })
      return false
    }
    return true
  })

  const userIds = Array.from(new Set(syncable.map(a => a.user_id as string)))
  const { data: rulesData, error: rulesError } = await db
    .from('categorization_rules')
    .select('user_id, pattern, field, category_id')
    .in('user_id', userIds)
    .eq('is_active', true)
    .order('priority', { ascending: false })

  if (rulesError) {
    console.error('[sync/eb/cron] fetch rules:', rulesError)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  const rulesByUser = new Map<string, DbCategorizationRule[]>()
  for (const row of rulesData ?? []) {
    const userId = (row as { user_id: string }).user_id
    const rule: DbCategorizationRule = {
      pattern: (row as { pattern: string }).pattern,
      field: (row as { field: DbCategorizationRule['field'] }).field,
      category_id: (row as { category_id: string }).category_id,
    }
    const list = rulesByUser.get(userId)
    if (list) list.push(rule)
    else rulesByUser.set(userId, [rule])
  }

  let totalSynced = 0
  const failed: { account_id: string; error: string }[] = []

  for (const account of syncable) {
    if (!account.external_id || !account.session_id) continue

    const userId = account.user_id as string
    const dbRules = rulesByUser.get(userId) ?? []
    const dateFrom = account.last_synced
      ? (account.last_synced as string).slice(0, 10)
      : undefined

    let ebTransactions
    try {
      ebTransactions = await getAccountTransactions(
        account.external_id,
        account.session_id,
        dateFrom
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`[sync/eb/cron] getTransactions ${account.external_id}:`, message)
      failed.push({ account_id: account.id as string, error: message })
      continue
    }

    if (ebTransactions.length > 0) {
      const rows = ebTransactions.map(tx => {
        const externalId = tx.entry_reference ?? tx.transaction_id
        const description =
          tx.remittance_information?.[0]?.trim() ||
          tx.creditor?.name ||
          tx.debtor?.name ||
          'Sin descripción'
        const merchant = tx.creditor?.name ?? tx.debtor?.name ?? undefined
        const sign = tx.credit_debit_indicator === 'DBIT' ? -1 : 1
        const amount = parseFloat(tx.transaction_amount.amount) * sign

        return {
          user_id:     userId,
          account_id:  account.id,
          date:        tx.booking_date,
          amount,
          description,
          category:    categorizeWithRules(dbRules, description, merchant ?? undefined),
          source:      'enablebanking' as const,
          external_id: externalId,
        }
      })

      const { error: upsertError } = await db
        .from('transactions')
        .upsert(rows, { onConflict: 'user_id,external_id', ignoreDuplicates: true })

      if (upsertError) {
        console.error(`[sync/eb/cron] upsert ${account.external_id}:`, upsertError)
        failed.push({ account_id: account.id as string, error: upsertError.message })
        continue
      }

      totalSynced += rows.length
    }

    const lastTx = ebTransactions.at(-1)
    const balance = lastTx?.balance_after_transaction
      ? parseFloat(lastTx.balance_after_transaction.amount)
      : null
    await db
      .from('accounts')
      .update({ ...(balance !== null && { balance }), last_synced: new Date().toISOString() })
      .eq('id', account.id)
  }

  const { error: refreshError } = await db.rpc('refresh_monthly_summary')
  if (refreshError) console.error('[sync/eb/cron] refresh_monthly_summary:', refreshError)

  return NextResponse.json({
    synced: totalSynced,
    accounts: syncable.length,
    skipped,
    failed,
  })
}
