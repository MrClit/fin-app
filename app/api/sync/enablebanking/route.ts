import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getAccountTransactions, getAccountBalance } from '@/lib/enablebanking'
import { categorize } from '@/lib/categories'

export async function POST() {
  // Auth: verify user via cookie client
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // All DB writes via service client (bypasses RLS)
  const db = createServiceClient()

  const { data: accounts, error: accError } = await db
    .from('accounts')
    .select('id, external_id, session_id, last_synced')
    .eq('user_id', user.id)
    .eq('source', 'enablebanking')
    .eq('is_active', true)

  if (accError) {
    console.error('[sync/eb] fetch accounts:', accError)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  if (!accounts || accounts.length === 0) {
    return NextResponse.json({ synced: 0, accounts: 0 })
  }

  let totalSynced = 0

  for (const account of accounts) {
    if (!account.external_id || !account.session_id) continue

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
      console.error(`[sync/eb] getTransactions ${account.external_id}:`, err)
      continue
    }

    if (ebTransactions.length > 0) {
      const rows = ebTransactions.map(tx => {
        const description = tx.remittance_information_unstructured?.trim() || 'Sin descripción'
        const sign = tx.credit_debit_indicator === 'DBIT' ? -1 : 1
        const amount = parseFloat(tx.transaction_amount.amount) * sign

        return {
          user_id:              user.id,
          account_id:           account.id,
          date:                 tx.booking_date,
          amount,
          description,
          category:             categorize(description),
          source:               'enablebanking' as const,
          external_id:          tx.transaction_id,
          is_computable:        true,
          is_internal_transfer: false,
        }
      })

      const { error: upsertError } = await db
        .from('transactions')
        .upsert(rows, { onConflict: 'user_id,external_id', ignoreDuplicates: true })

      if (upsertError) {
        console.error(`[sync/eb] upsert ${account.external_id}:`, upsertError)
      } else {
        totalSynced += rows.length
      }
    }

    // Update balance and last_synced
    try {
      const balance = await getAccountBalance(account.external_id, account.session_id)
      await db
        .from('accounts')
        .update({ ...(balance !== null && { balance }), last_synced: new Date().toISOString() })
        .eq('id', account.id)
    } catch (err) {
      console.error(`[sync/eb] getBalance ${account.external_id}:`, err)
      await db
        .from('accounts')
        .update({ last_synced: new Date().toISOString() })
        .eq('id', account.id)
    }
  }

  const { error: transferError } = await db.rpc('mark_internal_transfers', { p_user_id: user.id })
  if (transferError) console.error('[sync/eb] mark_internal_transfers:', transferError)

  const { error: refreshError } = await db.rpc('refresh_monthly_summary')
  if (refreshError) console.error('[sync/eb] refresh_monthly_summary:', refreshError)

  return NextResponse.json({ synced: totalSynced, accounts: accounts.length })
}
