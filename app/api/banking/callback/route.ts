import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSessionFromCode } from '@/lib/enablebanking'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(`${origin}/cuentas?error=bank_auth_cancelled`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${origin}/login`)
  }

  let session
  try {
    session = await createSessionFromCode(code)
  } catch (err) {
    console.error('[EB callback] createSessionFromCode error:', err)
    return NextResponse.redirect(`${origin}/cuentas?error=session_fetch_failed`)
  }

  for (const acc of session.accounts) {
    const lastFour = acc.iban ? acc.iban.replace(/\s/g, '').slice(-4) : null

    await supabase.from('accounts').upsert(
      {
        user_id: user.id,
        name: acc.account_holder ?? 'Cuenta bancaria',
        type: 'bank',
        source: 'enablebanking',
        balance: null,
        number: lastFour ? `•••• ${lastFour}` : null,
        currency: acc.currency ?? 'EUR',
        external_id: acc.uid,
        session_id: session.session_id,
        consent_expires_at: session.access.valid_until,
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
