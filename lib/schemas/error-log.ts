import { z } from 'zod'

/**
 * Ingesta de errores de cliente (issue #200). Solo `message` es obligatorio:
 * los demás campos son contexto de diagnóstico y se aceptan "a lo que venga"
 * (`catch` → `null`) porque un error mal formado sigue siendo un error que
 * queremos registrar; rechazar el aviso entero por un `stack` raro perdería la
 * única señal que tenemos de un fallo en producción.
 */
export const errorLogSchema = z.object({
  message: z.string().trim().min(1),
  stack: z.string().nullish().catch(null).default(null),
  route: z.string().nullish().catch(null).default(null),
  context: z.record(z.string(), z.unknown()).nullish().catch(null).default(null),
})
export type ErrorLogBody = z.infer<typeof errorLogSchema>
