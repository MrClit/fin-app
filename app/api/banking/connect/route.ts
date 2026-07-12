import { NextResponse } from 'next/server'
import { withUser } from '@/lib/http/with-auth'
import { parseBody } from '@/lib/http/validation'
import { bankingConnectSchema } from '@/lib/schemas/banking'
import { initiateAuth, encodeBankingState } from '@/lib/enablebanking'

export const POST = withUser('/api/banking/connect', async (_ctx, request) => {
  const { aspspName, aspspCountry } = await parseBody(request, bankingConnectSchema)

  const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/banking/callback`
  const state = encodeBankingState({ aspspName, aspspCountry })

  // Un fallo del proveedor no es un error nuestro: se distingue con un 502 propio
  // en vez de dejarlo escapar al 500 del envoltorio.
  try {
    const auth = await initiateAuth(redirectUrl, { name: aspspName, country: aspspCountry }, state)
    return NextResponse.json({ url: auth.url })
  } catch (err) {
    console.error('[EB connect]', err)
    return NextResponse.json(
      { error: 'No se pudo iniciar la conexión bancaria' },
      { status: 502 }
    )
  }
})
