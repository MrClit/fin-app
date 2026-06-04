import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Resuelve el hogar al que pertenece un usuario.
 *
 * La propiedad y la visibilidad de los datos financieros se determinan por
 * `household_id` (issue #131). Cada usuario pertenece a un único hogar en
 * Fase 1; se devuelve el más antiguo por si en el futuro hubiera varios.
 *
 * Devuelve `null` si el usuario no tiene hogar (no debería ocurrir tras la
 * migración, pero los llamadores deben tratarlo como "sin datos / no autorizado").
 */
export async function getHouseholdId(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return data.household_id as string
}
