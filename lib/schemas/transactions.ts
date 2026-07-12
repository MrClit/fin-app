import { z } from 'zod'
import { amountSchema, categoryIdSchema, isoDateSchema, uuidSchema } from './common'

/** Alta manual de movimiento (POST /api/transactions). */
export const createTransactionSchema = z.object({
  // `0` es un importe válido: el chequeo por falsy que había antes lo rechazaba (#308).
  amount: amountSchema,
  description: z.string().trim().min(1),
  date: isoDateSchema,
  account_id: uuidSchema,
  category_manual: categoryIdSchema.nullish(),
})
export type CreateTransactionBody = z.infer<typeof createTransactionSchema>

/**
 * Update parcial (PATCH /api/transactions/[id]): solo se tocan los campos
 * presentes en el body. `category_manual` (incluido `null` para "sin categoría")
 * e `is_read` son independientes; un body sin ninguno de los dos es un 400.
 */
export const updateTransactionSchema = z
  .object({
    category_manual: categoryIdSchema.nullable().optional(),
    is_read: z.boolean().optional(),
  })
  .refine(update => Object.keys(update).length > 0, {
    message: 'No fields to update',
  })
export type UpdateTransactionBody = z.infer<typeof updateTransactionSchema>
