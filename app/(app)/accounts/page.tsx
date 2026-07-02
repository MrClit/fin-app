import { Suspense } from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Check, Landmark } from 'lucide-react'
import { getCurrentUser, getRequestClient } from '@/lib/auth/session'
import { AccountCard } from '@/components/accounts/AccountCard'
import { ConnectBankButton } from '@/components/accounts/ConnectBankButton'
import { RenewedSyncTrigger } from '@/components/accounts/RenewedSyncTrigger'
import { AccountsSkeleton } from '@/components/accounts/AccountsSkeleton'
import { narrowUnions } from '@/lib/supabase/rows'

export const metadata: Metadata = { title: 'Cuentas' }

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
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const supabase = await getRequestClient()

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
            background: 'var(--positive-subtle)',
            border: '1px solid var(--positive-subtle)',
            color: 'var(--positive)',
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
              background: 'var(--positive-subtle)',
              border: '1px solid var(--positive-subtle)',
              color: 'var(--positive)',
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
            background: 'var(--negative-subtle)',
            border: '1px solid var(--negative-subtle)',
            color: 'var(--negative)',
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
        // Lista a ancho completo: -mx-4 cancela el padding lateral del wrapper para
        // que las filas lleguen a los bordes. Cada card lleva su border-y (solo
        // líneas arriba/abajo, sin laterales ni esquinas) y el gap las separa.
        <div className="-mx-4 flex flex-col gap-3">
          {(accounts ?? []).map((account) => (
            <AccountCard key={account.id} account={narrowUnions(account)} />
          ))}
        </div>
      )}

      <ConnectBankButton />
    </div>
  )
}
