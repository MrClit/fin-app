import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, getCurrentHouseholdId, getRequestClient } from '@/lib/auth/session'
import { logError } from '@/lib/error-log'
import type { CategoryId } from '@/types'
import { VALID_CATEGORIES } from '@/lib/categories'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const householdId = await getCurrentHouseholdId()
  if (!householdId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await getRequestClient()

  const { id } = await params
  const body = await request.json()
  const { category_manual, is_read } = body

  // Update parcial: solo se tocan los campos presentes en el body. `category_manual`
  // (incluido null para "sin categoría") y `is_read` son independientes.
  const update: { category_manual?: CategoryId | null; is_read?: boolean } = {}

  if ('category_manual' in body) {
    if (category_manual !== null && !VALID_CATEGORIES.includes(category_manual)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }
    update.category_manual = category_manual
  }

  if ('is_read' in body) {
    if (typeof is_read !== 'boolean') {
      return NextResponse.json({ error: 'Invalid is_read' }, { status: 400 })
    }
    update.is_read = is_read
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('transactions')
    .update(update)
    .eq('id', id)
    .eq('household_id', householdId)
    .select()
    .single()

  if (error) {
    console.error('[PATCH /api/transactions/[id]]', error)
    await logError({
      source: 'server',
      message: error.message,
      route: '/api/transactions/[id]',
      context: { op: 'update', id, code: error.code },
      userId: user.id,
      householdId,
    })
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  return NextResponse.json({ data })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const householdId = await getCurrentHouseholdId()
  if (!householdId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await getRequestClient()

  const { id } = await params

  const { data: tx } = await supabase
    .from('transactions')
    .select('source')
    .eq('id', id)
    .eq('household_id', householdId)
    .single()

  if (!tx) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (tx.source !== 'manual') {
    return NextResponse.json({ error: 'Cannot delete imported transactions' }, { status: 403 })
  }

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('household_id', householdId)

  if (error) {
    console.error('[DELETE /api/transactions/[id]]', error)
    await logError({
      source: 'server',
      message: error.message,
      route: '/api/transactions/[id]',
      context: { op: 'delete', id, code: error.code },
      userId: user.id,
      householdId,
    })
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
