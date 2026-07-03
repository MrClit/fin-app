import { NextResponse } from 'next/server'
import { getCurrentUser, getCurrentHouseholdId, getRequestClient } from '@/lib/auth/session'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const householdId = await getCurrentHouseholdId()
  if (!householdId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await getRequestClient()

  const { data: accounts, error } = await supabase
    .from('accounts')
    .select('id, name, type, source, is_liability, balance, number, color, currency, last_synced, consent_expires_at, created_at')
    .eq('household_id', householdId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[GET /api/accounts]', error)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  return NextResponse.json(accounts ?? [])
}
