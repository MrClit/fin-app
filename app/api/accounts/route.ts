import { NextResponse } from 'next/server'
import { withAuth, unwrap } from '@/lib/http/with-auth'

export const GET = withAuth('/api/accounts', async ({ supabase, householdId }) => {
  const accounts = unwrap(
    await supabase
      .from('accounts')
      .select('id, name, type, source, is_liability, balance, number, color, currency, last_synced, consent_expires_at, created_at')
      .eq('household_id', householdId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    { op: 'list' }
  )

  return NextResponse.json(accounts ?? [])
})
