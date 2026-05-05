import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSession } from '@/lib/enablebanking'

export async function POST(_request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/banking/callback`

  try {
    const session = await createSession(redirectUrl)
    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[EB connect]', err)
    return NextResponse.json(
      { error: 'No se pudo iniciar la conexión bancaria' },
      { status: 502 }
    )
  }
}
