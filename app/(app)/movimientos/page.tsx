import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MovimientosClient } from '@/components/transactions/MovimientosClient'
import { MovimientosSkeleton } from '@/components/transactions/MovimientosSkeleton'
import type { TransactionWithAccount } from '@/types'

export default function MovimientosPage() {
  return (
    <Suspense fallback={<MovimientosSkeleton />}>
      <MovimientosContent />
    </Suspense>
  )
}

async function MovimientosContent() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 90)
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  const [{ data: transactions }, { data: accounts }, { data: manualAcc }] = await Promise.all([
    supabase
      .from('transactions')
      .select('*, account:accounts(id, name, color)')
      .gte('date', cutoffStr)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(200),
    supabase
      .from('accounts')
      .select('id, name, color, number')
      .eq('is_active', true)
      .order('created_at', { ascending: true }),
    supabase
      .from('accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('source', 'manual')
      .order('created_at', { ascending: true })
      .limit(1),
  ])

  // manualAcc es un array (limit(1)), tomar el primero
  let manualAccountId = (manualAcc as { id: string }[] | null)?.[0]?.id
  if (!manualAccountId) {
    const { data: created } = await supabase
      .from('accounts')
      .insert({ user_id: user.id, name: 'Manual', type: 'cash', source: 'manual', color: '#64748b' })
      .select('id')
      .single()
    manualAccountId = created?.id
  }

  return (
    <MovimientosClient
      initialTransactions={(transactions ?? []) as TransactionWithAccount[]}
      accounts={accounts ?? []}
      manualAccountId={manualAccountId ?? ''}
    />
  )
}
