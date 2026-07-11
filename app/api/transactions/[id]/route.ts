import { NextResponse } from 'next/server'
import { withAuth, unwrap } from '@/lib/http/with-auth'
import type { CategoryId } from '@/types'
import { VALID_CATEGORIES } from '@/lib/categories'

type Params = { params: Promise<{ id: string }> }

export const PATCH = withAuth(
  '/api/transactions/[id]',
  async ({ householdId, supabase }, request, { params }: Params) => {
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

    const data = unwrap(
      await supabase
        .from('transactions')
        .update(update)
        .eq('id', id)
        .eq('household_id', householdId)
        .select()
        .single(),
      { op: 'update', id }
    )

    return NextResponse.json({ data })
  }
)

export const DELETE = withAuth(
  '/api/transactions/[id]',
  async ({ householdId, supabase }, _request, { params }: Params) => {
    const { id } = await params

    // Sin unwrap: `single()` devuelve error cuando no hay fila y eso aquí es un 404,
    // no un fallo de BD.
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

    unwrap(
      await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('household_id', householdId),
      { op: 'delete', id }
    )

    return NextResponse.json({ success: true })
  }
)
