import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { Check, Landmark } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { AccountCard } from '@/components/accounts/AccountCard'
import { ConnectBankButton } from '@/components/accounts/ConnectBankButton'
import { RenewedSyncTrigger } from '@/components/accounts/RenewedSyncTrigger'
import { AccountsSkeleton } from '@/components/accounts/AccountsSkeleton'
import type { Account } from '@/types'

type AccountsSearchParams = { connected?: string; error?: string; renewed?: string }

export default function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<AccountsSearchParams>
}) {
  return (
    <Suspense fallback={<AccountsSkeleton />}>
      <AccountsContent searchParams={searchParams} />
    </Suspense>
  )
}

async function AccountsContent({
  searchParams,
}: {
  searchParams: Promise<AccountsSearchParams>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: accounts } = await supabase
    .from('accounts')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  const params = await searchParams

  return (
    <div className="px-4 pt-3 pb-6 flex flex-col gap-4">
      <h1 className="text-xl font-bold text-foreground mb-2">Cuentas</h1>

      {params.connected === 'true' && (
        <div
          className="rounded-2xl px-4 py-3 text-sm font-medium flex items-center gap-2"
          style={{
            background: '#22c55e15',
            border: '1px solid #22c55e30',
            color: '#22c55e',
          }}
        >
          <Check className="size-4 shrink-0" />
          Banco conectado correctamente
        </div>
      )}

      {params.renewed && (
        <>
          <div
            className="rounded-2xl px-4 py-3 text-sm font-medium flex items-center gap-2"
            style={{
              background: '#22c55e15',
              border: '1px solid #22c55e30',
              color: '#22c55e',
            }}
          >
            <Check className="size-4 shrink-0" />
            Conexión renovada correctamente
          </div>
          <RenewedSyncTrigger accountId={params.renewed} />
        </>
      )}

      {params.error && (
        <div
          className="rounded-2xl px-4 py-3 text-sm font-medium"
          style={{
            background: '#ef444415',
            border: '1px solid #ef444430',
            color: '#ef4444',
          }}
        >
          No se pudo conectar el banco. Inténtalo de nuevo.
        </div>
      )}

      {(accounts ?? []).length === 0 ? (
        <div className="flex flex-col items-center text-center gap-3 py-10">
          <div
            className="size-16 rounded-[20px] flex items-center justify-center"
            style={{ background: '#6366f115' }}
          >
            <Landmark className="size-7" style={{ color: '#6366f1' }} />
          </div>
          <div>
            <div className="text-[15px] font-bold text-foreground">No tienes cuentas conectadas</div>
            <div className="text-sm text-muted-foreground mt-1">
              Conecta tu primer banco para empezar a ver tus finanzas
            </div>
          </div>
        </div>
      ) : (
        (accounts ?? []).map((account: Account) => (
          <AccountCard key={account.id} account={account} />
        ))
      )}

      <ConnectBankButton />
    </div>
  )
}
