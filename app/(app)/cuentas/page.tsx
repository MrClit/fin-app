import { redirect } from 'next/navigation'
import { Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { AccountCard } from '@/components/accounts/AccountCard'
import { ConnectBankButton } from '@/components/accounts/ConnectBankButton'
import type { Account } from '@/types'

export default async function CuentasPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: accounts } = await supabase
    .from('accounts')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  const params = await searchParams

  return (
    <div className="px-5 pt-14 pb-6 flex flex-col gap-4">
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

      {(accounts ?? []).map((account: Account) => (
        <AccountCard key={account.id} account={account} />
      ))}

      <ConnectBankButton />
    </div>
  )
}
