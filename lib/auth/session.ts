import { cache } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getHouseholdId } from '@/lib/household'

/**
 * Resolvers de sesión memoizados por request con `cache()` de React (issue #236).
 *
 * `getUser()` es una llamada de red al servidor Auth de Supabase (valida el JWT) y
 * la resolución de `household_id` consulta `household_members`. Sin memoización,
 * ambos se repetían en cada render de servidor (layout `(app)` + page) y en helpers
 * de datos invocados dentro del mismo request. `cache()` deduplica dentro de un
 * único render/request y no persiste entre requests, así que es seguro para datos
 * de sesión.
 *
 * El proxy (middleware) es una request aparte y no se deduplica con esto.
 */

/** Cliente Supabase de servidor, memoizado por request. */
export const getRequestClient = cache(createClient)

/** Usuario autenticado, resuelto una sola vez por request. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await getRequestClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})

/** `household_id` del usuario actual, memoizado por request. `null` si no hay sesión u hogar. */
export const getCurrentHouseholdId = cache(async (): Promise<string | null> => {
  const user = await getCurrentUser()
  if (!user) return null
  const supabase = await getRequestClient()
  return getHouseholdId(supabase, user.id)
})
