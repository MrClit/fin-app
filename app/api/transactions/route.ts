import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { amount, description, date, category_manual, account_id } = body

  if (!amount || !description || !date || !account_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data: tx, error } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      account_id,
      amount,
      description,
      date,
      category_manual: category_manual ?? null,
      source: 'manual',
    })
    .select('*, account:accounts(id, name, color)')
    .single()

  if (error) {
    console.error('[POST /api/transactions]', error)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  return NextResponse.json({ data: tx }, { status: 201 })
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const accountsParam = searchParams.get('accounts')
  const category = searchParams.get('category')
  const dateFrom = searchParams.get('dateFrom')
  const dateTo   = searchParams.get('dateTo')
  const limit = Math.min(Number(searchParams.get('limit') ?? '200'), 500)
  const beforeDate = searchParams.get('before_date')
  const beforeId   = searchParams.get('before_id')
  const hasCursor  = !!(beforeDate && beforeId)

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 90)
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  // Pedimos limit + 1 para distinguir "exactamente limit ítems quedan" de "hay más".
  let query = supabase
    .from('transactions')
    .select('*, account:accounts(id, name, color)')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1)

  if (dateFrom)        query = query.gte('date', dateFrom)
  else if (!hasCursor) query = query.gte('date', cutoffStr)
  if (dateTo)          query = query.lte('date', dateTo)

  if (hasCursor) {
    // Keyset: (date, id) DESC → traer items "después" del cursor.
    query = query.or(
      `date.lt.${beforeDate},and(date.eq.${beforeDate},id.lt.${beforeId})`
    )
  }

  if (accountsParam) {
    const ids = accountsParam.split(',').filter(Boolean)
    if (ids.length > 0) query = query.in('account_id', ids)
  }

  if (category) {
    query = query.or(
      `category_manual.eq.${category},and(category_manual.is.null,category.eq.${category})`
    )
  }

  const { data, error } = await query

  if (error) {
    console.error('[GET /api/transactions]', error)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  const raw = data ?? []
  const hasMore = raw.length > limit
  const items = hasMore ? raw.slice(0, limit) : raw
  const last = items[items.length - 1]
  const nextCursor = hasMore && last
    ? { date: last.date as string, id: last.id as string }
    : null

  return NextResponse.json({
    data: items,
    meta: { count: items.length, nextCursor },
  })
}
