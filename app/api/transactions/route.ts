import { NextResponse } from 'next/server'
import { withAuth, unwrap } from '@/lib/http/with-auth'
import { parseBody } from '@/lib/http/validation'
import { createTransactionSchema } from '@/lib/schemas/transactions'
import { listTransactions, TX_PAGE_SIZE, TX_MAX_PAGE_SIZE } from '@/lib/transactions'

export const POST = withAuth(
  '/api/transactions',
  async ({ user, householdId, supabase }, request) => {
    const { amount, description, date, category_manual, account_id } = await parseBody(
      request,
      createTransactionSchema
    )

    const tx = unwrap(
      await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          household_id: householdId,
          account_id,
          amount,
          description,
          date,
          category_manual: category_manual ?? null,
          source: 'manual',
          // Un movimiento que crea el propio usuario no es una novedad que deba
          // notificarse: nace leído (issue #149). El DEFAULT false de la columna solo
          // aplica a los inserts de sincronización.
          is_read: true,
        })
        .select('*, account:accounts(id, name, color)')
        .single(),
      { op: 'insert' }
    )

    return NextResponse.json({ data: tx }, { status: 201 })
  }
)

export const GET = withAuth(
  '/api/transactions',
  async ({ householdId, supabase }, request) => {
    const { searchParams } = request.nextUrl
    const accountsParam = searchParams.get('accounts')
    const beforeDate = searchParams.get('before_date')
    const beforeId   = searchParams.get('before_id')

    const { items, nextCursor } = await listTransactions(supabase, householdId, {
      limit: Math.min(Number(searchParams.get('limit') ?? TX_PAGE_SIZE), TX_MAX_PAGE_SIZE),
      cursor: beforeDate && beforeId ? { date: beforeDate, id: beforeId } : null,
      accountIds: accountsParam ? accountsParam.split(',').filter(Boolean) : undefined,
      category: searchParams.get('category'),
      dateFrom: searchParams.get('dateFrom'),
      dateTo:   searchParams.get('dateTo'),
    })

    return NextResponse.json({
      data: items,
      meta: { count: items.length, nextCursor },
    })
  }
)
