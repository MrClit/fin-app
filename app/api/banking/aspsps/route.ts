import { NextRequest, NextResponse } from 'next/server'
import { signJWT } from '@/lib/enablebanking'

export async function GET(request: NextRequest) {
  const country = new URL(request.url).searchParams.get('country') ?? 'ES'

  try {
    const jwt = await signJWT()
    const res = await fetch(
      `https://api.enablebanking.com/aspsps?country=${country}`,
      { headers: { Authorization: `Bearer ${jwt}` } }
    )

    if (!res.ok) {
      const body = await res.text()
      console.error('[EB aspsps] API error:', res.status, body)
      return NextResponse.json({ error: `Enable Banking ${res.status}`, detail: body }, { status: 502 })
    }

    const data = await res.json()
    const list = Array.isArray(data) ? data : (data.aspsps ?? [])
    return NextResponse.json(
      list.map((a: { name: string; country: string }) => ({ name: a.name, country: a.country }))
    )
  } catch (err) {
    console.error('[EB aspsps] exception:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
