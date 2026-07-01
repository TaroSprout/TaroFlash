import { supabase } from '@/supabase-client'
import logger from '@/utils/logger'

/**
 * Fetches cards by explicit id, ignoring due-ness. Used to rebuild a session's
 * locked queue on refresh-resume without pulling in newly-due cards the way
 * the due-cards RPC would.
 */
export async function fetchCardsByIds(card_ids: number[]): Promise<Card[]> {
  if (!card_ids.length) return []

  const { data, error } = await supabase
    .from('cards')
    .select('*, review:reviews(*)')
    .in('id', card_ids)

  if (error) {
    logger.error(error.message)
    throw new Error(error.message)
  }

  return data ?? []
}
