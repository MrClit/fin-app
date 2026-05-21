import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSessionFromCode, decodeBankingState } from '@/lib/enablebanking'

/** Normaliza un IBAN para comparar (sin espacios, mayúsculas). */
function normalizeIban(iban: string | null | undefined): string | null {
  return iban ? iban.replace(/\s/g, '').toUpperCase() : null
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const state = decodeBankingState(searchParams.get('state'))

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

  // Modo renovación: actualiza la cuenta existente, no crea filas nuevas (issue #79).
  if (state?.accountId) {
    const { data: target } = await supabase
      .from('accounts')
      .select('id, iban')
      .eq('id', state.accountId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!target) {
      return NextResponse.redirect(`${appUrl}/cuentas?error=renew_account_not_found`)
    }

    // El uid de la cuenta EB puede cambiar entre sesiones; se empareja por IBAN.
    const ebAcc = target.iban
      ? session.accounts.find(
          a => normalizeIban(a.account_id?.iban) === normalizeIban(target.iban)
        )
      : session.accounts[0]

    await supabase
      .from('accounts')
      .update({
        session_id: session.session_id,
        consent_expires_at: session.access.valid_until,
        ...(ebAcc && { external_id: ebAcc.uid }),
        aspsp_name: state.aspspName,
        aspsp_country: state.aspspCountry,
        is_active: true,
      })
      .eq('id', target.id)

    return NextResponse.redirect(`${appUrl}/cuentas?renewed=${target.id}`)
  }

  // Modo conexión: alta o actualización de cuentas de la sesión.
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
      aspsp_name: state?.aspspName ?? null,
      aspsp_country: state?.aspspCountry ?? null,
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
