import { NextResponse } from 'next/server'
import { withAuth, unwrap } from '@/lib/http/with-auth'
import { parseBody } from '@/lib/http/validation'
import { updateTransactionSchema } from '@/lib/schemas/transactions'

type Params = { params: Promise<{ id: string }> }

export const PATCH = withAuth(
  '/api/transactions/[id]',
  async ({ householdId, supabase }, request, { params }: Params) => {
    const { id } = await params
    // Update parcial: el esquema solo deja pasar los campos presentes en el body,
    // así que se escriben tal cual (`category_manual: null` = "sin categoría").
    const update = await parseBody(request, updateTransactionSchema)

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
