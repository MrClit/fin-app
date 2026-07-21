import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { ingest, ingestErrorResponse, webhookGuard, type Connector } from '@/lib/ingest'
import {
  sabadellSavingsPayloadSchema,
  type SabadellSavingsPayload,
} from '@/lib/schemas/scrapers'
import { categorizeSavingsMovement } from './categories'

// Adaptador del scraper del plan de ahorro Sabadell (Bansabadell Vida, #197)
// sobre el pipeline común (#309).

// sort_order del plan de ahorro: tras la cuenta corriente (bank=10) y antes de
// las tarjetas (20/30). Ver 20260607000000_accounts_sort_order.sql. Sólo se fija
// en el INSERT: un re-sync no pisa un reordenamiento manual posterior.
const SAVINGS_SORT_ORDER = 15

const connector: Connector<SabadellSavingsPayload> = {
  tag: 'sabadell-savings',
  source: 'scraper',
  normalize: payload => ({
    lastSyncedAt: payload.last_synced_at,
    accounts: [
      {
        // Identidad por external_id (no por nombre), para tolerar renombrados.
        identity: { by: 'external_id', value: payload.account.account_id },
        name: payload.account.name,
        type: 'savings',
        isLiability: false,
        balance: payload.account.balance,
        number: payload.account.number ?? null,
        sortOrder: SAVINGS_SORT_ORDER,
        transactions: payload.account.transactions.map(tx => ({
          externalId: tx.external_id,
          amount: tx.amount,
          description: tx.description,
          date: tx.transaction_date,
        })),
      },
    ],
  }),
  prepareCategorizer: () => tx => categorizeSavingsMovement(tx.description),
}

export async function POST(req: Request) {
  const guard = await webhookGuard(req, {
    source: 'sabadell-savings',
    secretName: 'SABADELL_SAVINGS_WEBHOOK_SECRET',
    secret: process.env.SABADELL_SAVINGS_WEBHOOK_SECRET,
    schema: sabadellSavingsPayloadSchema,
  })
  if (!guard.ok) return guard.response

  const result = await ingest(createServiceClient(), connector, guard.payload)
  if (!result.ok) return ingestErrorResponse(result.error)

  return NextResponse.json({
    created_account: result.data.createdAccounts > 0,
    upserted: result.data.upserted,
  })
}
