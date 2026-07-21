import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { categorizeWithRules, type DbCategorizationRule } from '@/lib/categories'
import { ingest, ingestErrorResponse, webhookGuard, type Connector } from '@/lib/ingest'
import {
  sabadellVisaPayloadSchema,
  type SabadellVisaPayload,
} from '@/lib/schemas/scrapers'

// Adaptador del scraper de las VISA Sabadell sobre el pipeline común (#309).

// El nombre de presentación de cada tarjeta vive en `accounts.name` y sólo se
// fija en el INSERT con el genérico del scraper ("Sabadell VISA •••• NNNN");
// un re-sync nunca lo pisa, así que renombrar es editar la fila en BD (#313).

const connector: Connector<SabadellVisaPayload> = {
  tag: 'sabadell-visa',
  source: 'scraper',
  normalize: payload => ({
    lastSyncedAt: payload.last_synced_at,
    accounts: payload.cards.map(card => ({
      // Identidad por external_id (no por nombre), para tolerar renombrados y
      // porque ambas tarjetas comparten descripción en el banco.
      identity: { by: 'external_id', value: card.card_id },
      name: card.name,
      type: 'card',
      isLiability: true,
      balance: card.balance,
      number: card.number ?? null,
      transactions: card.transactions.map(tx => ({
        externalId: tx.external_id,
        amount: tx.amount,
        description: tx.description,
        date: tx.transaction_date,
      })),
    })),
  }),
  // Las tarjetas de crédito son compras en comercios variados, así que se
  // auto-categoriza por descripción (mismo criterio que la sync de Enable
  // Banking) en vez de con un valor fijo como Edenred. Si la consulta de reglas
  // falla se cae a `AUTO_RULES`, que es el comportamiento deseado.
  prepareCategorizer: async (db, householdId) => {
    const { data } = await db
      .from('categorization_rules')
      .select('pattern, field, category_id')
      .eq('household_id', householdId)
      .eq('is_active', true)
      .order('priority', { ascending: false })
    const dbRules: DbCategorizationRule[] = data ?? []
    return tx => categorizeWithRules(dbRules, tx.description)
  },
}

export async function POST(req: Request) {
  const guard = await webhookGuard(req, {
    source: 'sabadell-visa',
    secretName: 'SABADELL_VISA_WEBHOOK_SECRET',
    secret: process.env.SABADELL_VISA_WEBHOOK_SECRET,
    schema: sabadellVisaPayloadSchema,
  })
  if (!guard.ok) return guard.response

  const result = await ingest(createServiceClient(), connector, guard.payload)
  if (!result.ok) return ingestErrorResponse(result.error)

  return NextResponse.json({
    cards: result.data.accounts,
    created_accounts: result.data.createdAccounts,
    upserted: result.data.upserted,
  })
}
