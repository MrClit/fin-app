import { SignJWT, importPKCS8 } from 'jose'

const BASE_URL = 'https://api.enablebanking.com'

async function signJWT(): Promise<string> {
  const key = await importPKCS8(process.env.ENABLEBANKING_SECRET_KEY!, 'ES256')
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: process.env.ENABLEBANKING_APP_ID! })
    .setIssuer(process.env.ENABLEBANKING_APP_ID!)
    .setIssuedAt()
    .setExpirationTime('60s')
    .sign(key)
}

export interface EBSession {
  session_id: string
  url: string
}

export interface EBAccount {
  account_id: string
  iban: string | null
  currency: string
  product: string | null
  name: string | null
  balances?: Array<{
    balance_amount: { amount: string; currency: string }
    balance_type: string
  }>
}

export interface EBSessionStatus {
  session_id: string
  status: 'AUTHORIZED' | 'REJECTED' | 'PENDING' | string
  accounts: EBAccount[]
  access: {
    valid_until: string
  }
}

export async function createSession(redirectUrl: string): Promise<EBSession> {
  const jwt = await signJWT()
  const validUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]

  const res = await fetch(`${BASE_URL}/application/sessions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      access: {
        valid_until: validUntil,
        balances: true,
        transactions: true,
      },
      redirect_url: redirectUrl,
      psu_type: 'personal',
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Enable Banking createSession failed: ${res.status} — ${body}`)
  }

  return res.json()
}

export async function getSession(sessionId: string): Promise<EBSessionStatus> {
  const jwt = await signJWT()
  const res = await fetch(`${BASE_URL}/application/sessions/${sessionId}`, {
    headers: { Authorization: `Bearer ${jwt}` },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Enable Banking getSession failed: ${res.status} — ${body}`)
  }

  return res.json()
}
