import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSessionFromCode } from '@/lib/enablebanking'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/cuentas?error=bank_auth_cancelled`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${appUrl}/login`)
  }

  let session
  try {
    session = await createSessionFromCode(code)
  } catch (err) {
    console.error('[EB callback] createSessionFromCode error:', err)
    return NextResponse.redirect(`${appUrl}/cuentas?error=session_fetch_failed`)
  }

  for (const acc of session.accounts) {
    const iban = acc.account_id?.iban ?? null
    const lastFour = iban ? iban.replace(/\s/g, '').slice(-4) : null

    const accountData = {
      user_id: user.id,
      name: acc.product ?? acc.name ?? 'Cuenta bancaria',
      type: 'bank' as const,
      source: 'enablebanking' as const,
      number: lastFour ? `•••• ${lastFour}` : null,
      iban,
      currency: acc.currency ?? 'EUR',
      external_id: acc.uid,
      session_id: session.session_id,
      consent_expires_at: session.access.valid_until,
      is_active: true,
    }

    if (iban) {
      const { data: existing } = await supabase
        .from('accounts')
        .select('id')
        .eq('user_id', user.id)
        .eq('iban', iban)
        .maybeSingle()

      if (existing) {
        await supabase.from('accounts').update(accountData).eq('id', existing.id)
      } else {
        await supabase.from('accounts').insert({ ...accountData, balance: null })
      }
    } else {
      await supabase.from('accounts').upsert(
        { ...accountData, balance: null },
        { onConflict: 'user_id,external_id' }
      )
    }
  }

  return NextResponse.redirect(`${appUrl}/cuentas?connected=true`)
}
