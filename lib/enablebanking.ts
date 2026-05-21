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
  product: string | null
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

/**
 * Payload que viaja en el parámetro `state` del flujo OAuth de Enable Banking.
 * EB lo devuelve intacto en el redirect al callback. Si `accountId` está
 * presente, el callback está en modo renovación (issue #79).
 */
export interface BankingState {
  aspspName: string
  aspspCountry: string
  accountId?: string
}

/** Serializa el `state` a base64url para incrustarlo en el flujo OAuth. */
export function encodeBankingState(state: BankingState): string {
  return Buffer.from(JSON.stringify(state)).toString('base64url')
}

/** Deserializa el `state` recibido en el callback. Devuelve `null` si es inválido. */
export function decodeBankingState(raw: string | null): BankingState | null {
  if (!raw) return null
  try {
    return JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as BankingState
  } catch {
    return null
  }
}

export async function initiateAuth(
  redirectUrl: string,
  aspsp: EBaspsp,
  state: string
): Promise<EBAuthResponse> {
  const jwt = await signJWT()
  const validUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()

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

async function signJWTForSession(sessionId: string): Promise<string> {
  const rawKey = (process.env.ENABLEBANKING_SECRET_KEY ?? '').replace(/\\n/g, '\n')
  const key = await importPKCS8(rawKey, 'RS256')
  return new SignJWT({ session_id: sessionId })
    .setProtectedHeader({ alg: 'RS256', kid: process.env.ENABLEBANKING_APP_ID! })
    .setIssuer('enablebanking.com')
    .setAudience('api.enablebanking.com')
    .setIssuedAt()
    .setExpirationTime('60s')
    .sign(key)
}

export interface EBTransaction {
  entry_reference: string | null
  transaction_id: string | null
  booking_date: string
  transaction_amount: { amount: string; currency: string }
  credit_debit_indicator: 'CRDT' | 'DBIT'
  remittance_information: string[] | null
  creditor: { name: string | null } | null
  debtor: { name: string | null } | null
  balance_after_transaction: { amount: string; currency: string } | null
}

export interface EBBalance {
  balance_type: string
  balance_amount: { amount: string; currency: string }
}

export async function getAccountTransactions(
  accountUid: string,
  sessionId: string,
  dateFrom?: string
): Promise<EBTransaction[]> {
  const jwt = await signJWTForSession(sessionId)
  const url = new URL(`${BASE_URL}/accounts/${accountUid}/transactions`)
  if (dateFrom) url.searchParams.set('date_from', dateFrom)

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${jwt}` },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`EB getTransactions ${accountUid}: ${res.status} — ${body}`)
  }

  const data: { transactions?: EBTransaction[] } = await res.json()
  return data.transactions ?? []
}

export async function getAccountBalance(
  accountUid: string,
  sessionId: string
): Promise<number | null> {
  const jwt = await signJWTForSession(sessionId)
  const res = await fetch(`${BASE_URL}/accounts/${accountUid}/balances`, {
    headers: { Authorization: `Bearer ${jwt}` },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`EB getBalance ${accountUid}: ${res.status} — ${body}`)
  }

  const data: { balances?: EBBalance[] } = await res.json()
  const chosen =
    data.balances?.find(b => b.balance_type === 'closingBooked') ??
    data.balances?.[0] ??
    null
  return chosen ? parseFloat(chosen.balance_amount.amount) : null
}
