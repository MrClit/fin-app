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

    if (!res.ok) return NextResponse.json([])

    const data = await res.json()
    const list = Array.isArray(data) ? data : (data.aspsps ?? [])
    return NextResponse.json(
      list.map((a: { name: string; country: string }) => ({ name: a.name, country: a.country }))
    )
  } catch {
    return NextResponse.json([])
  }
}
