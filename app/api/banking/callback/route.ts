import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/enablebanking'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const sessionId = searchParams.get('session_id')
  const error = searchParams.get('error')

  if (error || !sessionId) {
    return NextResponse.redirect(`${origin}/cuentas?error=bank_auth_cancelled`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${origin}/login`)
  }

  let ebSession
  try {
    ebSession = await getSession(sessionId)
  } catch (err) {
    console.error('[EB callback] getSession error:', err)
    return NextResponse.redirect(`${origin}/cuentas?error=session_fetch_failed`)
  }

  if (ebSession.status !== 'AUTHORIZED') {
    return NextResponse.redirect(`${origin}/cuentas?error=not_authorized`)
  }

  for (const acc of ebSession.accounts) {
    const lastFour = acc.iban ? acc.iban.replace(/\s/g, '').slice(-4) : null
    const balanceEntry = acc.balances?.find(
      b => b.balance_type === 'INTERIM_AVAILABLE' || b.balance_type === 'BOOKED'
    )
    const balance = balanceEntry ? parseFloat(balanceEntry.balance_amount.amount) : null

    await supabase.from('accounts').upsert(
      {
        user_id: user.id,
        name: acc.name ?? acc.product ?? 'Cuenta bancaria',
        type: 'bank',
        source: 'enablebanking',
        balance,
        number: lastFour ? `•••• ${lastFour}` : null,
        currency: acc.currency ?? 'EUR',
        external_id: acc.account_id,
        session_id: sessionId,
        consent_expires_at: ebSession.access.valid_until,
        is_active: true,
      },
      { onConflict: 'user_id,external_id' }
    )
  }

  await supabase
    .from('user_config')
    .upsert({ user_id: user.id, has_onboarded: true }, { onConflict: 'user_id' })

  return NextResponse.redirect(`${origin}/cuentas?connected=true`)
}
