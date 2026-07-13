import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { ingest, ingestErrorResponse, webhookGuard, type Connector } from '@/lib/ingest'
import { edenredPayloadSchema, type EdenredPayload } from '@/lib/schemas/scrapers'

// Adaptador del scraper de Edenred sobre el pipeline común (issue #309).
//
// La cuenta se identifica por NOMBRE, no por external_id: nunca lo tuvo. Y el
// re-sync no reescribe el nombre (`updateName: false`), que es constante.
const connector: Connector<EdenredPayload> = {
  source: 'edenred',
  normalize: payload => ({
    lastSyncedAt: payload.last_synced_at,
    accounts: [
      {
        identity: { by: 'name', value: 'Edenred' },
        name: 'Edenred',
        type: 'edenred',
        isLiability: false,
        balance: payload.balance,
        updateName: false,
        transactions: payload.transactions.map(tx => ({
          externalId: tx.external_id,
          amount: tx.amount,
          description: tx.description,
          date: tx.transaction_date,
          ...(tx.category !== undefined && { category: tx.category }),
        })),
      },
    ],
  }),
  // Único scraper que propone categoría: emite 'restaurant' o 'payroll'. Ambos
  // ids están garantizados en el catálogo (`categories.id`, FK de
  // `transactions.category`, #174), igual que el fallback. Ver issue #101.
  prepareCategorizer: () => tx => tx.category ?? 'restaurant',
}

export async function POST(req: Request) {
  const guard = await webhookGuard(req, {
    source: 'edenred',
    secretName: 'EDENRED_WEBHOOK_SECRET',
    secret: process.env.EDENRED_WEBHOOK_SECRET,
    schema: edenredPayloadSchema,
  })
  if (!guard.ok) return guard.response

  const result = await ingest(createServiceClient(), connector, guard.payload)
  if (!result.ok) return ingestErrorResponse(result.error)

  return NextResponse.json({
    created_account: result.data.createdAccounts > 0,
    upserted: result.data.upserted,
  })
}
