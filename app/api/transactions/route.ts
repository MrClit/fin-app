import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const type = searchParams.get('type') ?? 'todos'
  const accountsParam = searchParams.get('accounts')
  const limit = Math.min(Number(searchParams.get('limit') ?? '200'), 500)

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 90)
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  let query = supabase
    .from('transactions')
    .select('*, account:accounts(id, name, color)')
    .eq('user_id', user.id)
    .eq('is_internal_transfer', false)
    .gte('date', cutoffStr)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (type === 'ingresos') {
    query = query.gt('amount', 0).eq('is_computable', true)
  } else if (type === 'gastos') {
    query = query.lt('amount', 0).eq('is_computable', true)
  } else if (type === 'no-computable') {
    query = query.eq('is_computable', false)
  }

  if (accountsParam) {
    const ids = accountsParam.split(',').filter(Boolean)
    if (ids.length > 0) query = query.in('account_id', ids)
  }

  const { data, error } = await query

  if (error) {
    console.error('[GET /api/transactions]', error)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  return NextResponse.json({ data: data ?? [], meta: { count: data?.length ?? 0 } })
}
