import { supabase } from '@/supabase-client'
import logger from '@/utils/logger'

/**
 * Named cards, whether or not they're due. A resumed session rebuilds the pile
 * it had, not the pile it would get today.
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
