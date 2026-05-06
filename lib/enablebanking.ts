import { SignJWT, importPKCS8 } from 'jose'

const BASE_URL = 'https://api.enablebanking.com'

export async function signJWT(): Promise<string> {
  const rawKey = (process.env.ENABLEBANKING_SECRET_KEY ?? '').replace(/\\n/g, '\n')
  const key = await importPKCS8(rawKey, 'RS256')
  return new SignJWT({})
    .setProtectedHeader({ alg: 'RS256', kid: process.env.ENABLEBANKING_APP_ID! })
    .setIssuer('enablebanking.com')
    .setAudience('api.enablebanking.com')
    .setIssuedAt()
    .setExpirationTime('60s')
    .sign(key)
}

export interface EBAuthResponse {
  url: string
  authorization_id: string
}

export interface EBAccount {
  uid: string
  account_id: { iban: string | null } | null
  name: string | null
  currency: string
}

export interface EBSession {
  session_id: string
  accounts: EBAccount[]
  access: {
    valid_until: string
  }
}

export interface EBaspsp {
  name: string
  country: string
}

export async function initiateAuth(
  redirectUrl: string,
  aspsp: EBaspsp
): Promise<EBAuthResponse> {
  const jwt = await signJWT()
  const validUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
  const state = crypto.randomUUID()

  const res = await fetch(`${BASE_URL}/auth`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      aspsp,
      access: { valid_until: validUntil },
      state,
      redirect_url: redirectUrl,
      psu_type: 'personal',
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Enable Banking /auth failed: ${res.status} — ${body}`)
  }

  return res.json()
}

export async function createSessionFromCode(code: string): Promise<EBSession> {
  const jwt = await signJWT()
  const res = await fetch(`${BASE_URL}/sessions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Enable Banking /sessions failed: ${res.status} — ${body}`)
  }

  return res.json()
}
