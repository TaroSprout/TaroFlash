import { supabase } from '@/supabase-client'
import logger from '@/utils/logger'

/**
 * The position of a deck's last card, or `null` when it has none.
 *
 * Needed to add to the end of a deck the caller hasn't loaded — a new position
 * is worked out from its neighbours, and here that neighbour is whatever is last.
 */
export async function fetchDeckTailRank(deck_id: number): Promise<string | null> {
  const { data, error } = await supabase
    .from('cards')
    .select('rank')
    .eq('deck_id', deck_id)
    .order('rank', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    logger.error(error.message)
    throw error
  }

  return data?.rank ?? null
}
