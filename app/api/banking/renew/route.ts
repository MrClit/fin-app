import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getHouseholdId } from '@/lib/household'
import { initiateAuth, encodeBankingState } from '@/lib/enablebanking'

/**
 * Renovación del consentimiento PSD2 de una cuenta existente (issue #79, spec §9.4).
 * Crea una nueva sesión de autorización en Enable Banking reutilizando el banco
 * (ASPSP) guardado en la cuenta y devuelve la URL de autorización. El callback
 * detecta `accountId` en el `state` y actualiza la fila en vez de duplicarla.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const householdId = await getHouseholdId(supabase, user.id)
  if (!householdId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { accountId } = await request.json()
  if (!accountId) {
    return NextResponse.json({ error: 'accountId es obligatorio' }, { status: 400 })
  }

  const { data: account } = await supabase
    .from('accounts')
    .select('id, source, aspsp_name, aspsp_country')
    .eq('id', accountId)
    .eq('household_id', householdId)
    .maybeSingle()

  if (!account || account.source !== 'enablebanking') {
    return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 })
  }

  // Cuenta heredada, conectada antes de que se guardara el ASPSP: no se puede
  // renovar de un clic. El cliente redirige al flujo de conexión manual.
  if (!account.aspsp_name || !account.aspsp_country) {
    return NextResponse.json({ error: 'aspsp_unknown' }, { status: 422 })
  }

  const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/banking/callback`
  const state = encodeBankingState({
    aspspName: account.aspsp_name,
    aspspCountry: account.aspsp_country,
    accountId: account.id,
  })

  try {
    const auth = await initiateAuth(
      redirectUrl,
      { name: account.aspsp_name, country: account.aspsp_country },
      state
    )
    return NextResponse.json({ url: auth.url })
  } catch (err) {
    console.error('[EB renew]', err)
    return NextResponse.json(
      { error: 'No se pudo iniciar la renovación bancaria' },
      { status: 502 }
    )
  }
}
