import type { ZodError } from 'zod'

/**
 * Forma serializable de los errores de validación de Zod. Vive aparte de
 * `lib/http/validation.ts` para que las Server Actions (#311) la usen sin
 * arrastrar `next/server`; ese módulo la reexporta y las rutas no cambian.
 */
export type ValidationIssue = { path: string; message: string }

export function toIssues(error: ZodError): ValidationIssue[] {
  return error.issues.map(issue => ({
    path: issue.path.join('.'),
    message: issue.message,
  }))
}
