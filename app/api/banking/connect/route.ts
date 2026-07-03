import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { initiateAuth, encodeBankingState } from '@/lib/enablebanking'

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { aspspName, aspspCountry } = await request.json()
  if (!aspspName || !aspspCountry) {
    return NextResponse.json({ error: 'aspspName y aspspCountry son obligatorios' }, { status: 400 })
  }

  const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/banking/callback`
  const state = encodeBankingState({ aspspName, aspspCountry })

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
}
