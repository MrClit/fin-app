import { NextResponse } from 'next/server'
import { withUser } from '@/lib/http/with-auth'
import { signJWT } from '@/lib/enablebanking'

export const GET = withUser('/api/banking/aspsps', async (_ctx, request) => {
  const country = new URL(request.url).searchParams.get('country') ?? 'ES'

  try {
    const jwt = await signJWT()
    const res = await fetch(
      `https://api.enablebanking.com/aspsps?country=${country}`,
      { headers: { Authorization: `Bearer ${jwt}` } }
    )

    if (!res.ok) return NextResponse.json([])

    const data = await res.json()
    const list = Array.isArray(data) ? data : (data.aspsps ?? [])
    return NextResponse.json(
      list.map((a: { name: string; country: string }) => ({ name: a.name, country: a.country }))
    )
  } catch {
    return NextResponse.json([])
  }
})
