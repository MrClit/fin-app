import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CategoryId } from '@/types'

const VALID_CATEGORIES: CategoryId[] = [
  // Gastos
  'groceries', 'restaurant', 'transport', 'fuel', 'parking', 'vehicle',
  'mortgage', 'community_fees', 'electricity', 'gas', 'water', 'internet',
  'home', 'clothing', 'shopping', 'electronics', 'health', 'pharmacy',
  'leisure', 'sports', 'subscriptions', 'travel', 'education', 'insurance',
  'beauty', 'gifts', 'charity', 'memberships', 'taxes', 'loans', 'cash',
  'fees', 'other',
  // Ingresos
  'income', 'returns', 'reimbursement', 'other_income',
  // No Computable
  'investment', 'savings', 'transfer', 'loan_payment',
]

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const { category_manual } = body

  if (category_manual !== null && !VALID_CATEGORIES.includes(category_manual)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('transactions')
    .update({ category_manual })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    console.error('[PATCH /api/transactions/[id]]', error)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  return NextResponse.json({ data })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const { data: tx } = await supabase
    .from('transactions')
    .select('source')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!tx) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (tx.source !== 'manual') {
    return NextResponse.json({ error: 'Cannot delete imported transactions' }, { status: 403 })
  }

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('[DELETE /api/transactions/[id]]', error)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
