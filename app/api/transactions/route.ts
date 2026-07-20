import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/http/with-auth'
import { listTransactions, TX_PAGE_SIZE, TX_MAX_PAGE_SIZE } from '@/lib/transactions'

// Solo lectura: las mutaciones viven en `app/actions/transactions.ts` (#311).
// El GET se queda como ruta por la paginación por cursor (scroll infinito).
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
