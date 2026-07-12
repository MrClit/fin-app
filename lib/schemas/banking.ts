import { z } from 'zod'
import { uuidSchema } from './common'

/** Inicio de conexión bancaria PSD2 (POST /api/banking/connect). */
export const bankingConnectSchema = z.object({
  aspspName: z.string().min(1),
  aspspCountry: z.string().min(1),
})

/** Renovación del consentimiento de una cuenta existente (POST /api/banking/renew). */
export const bankingRenewSchema = z.object({
  accountId: uuidSchema,
})

/**
 * Sync de Enable Banking (POST /api/sync/enablebanking). El body es OPCIONAL:
 * con `accountId` la sync se limita a esa cuenta (#79), y sin body se
 * sincronizan todas — de ahí el `nullish` + `transform`, que absorbe también el
 * body ausente que `readJson` resuelve a `undefined`.
 */
export const syncEnablebankingSchema = z
  .object({ accountId: uuidSchema.optional() })
  .nullish()
  .transform(body => body ?? {})
