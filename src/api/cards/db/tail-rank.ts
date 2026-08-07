import { supabase } from '@/supabase-client'
import logger from '@/utils/logger'

/**
 * The highest rank in a deck, or `null` when it's empty.
 *
 * Any write that appends to a deck the caller doesn't have loaded needs this —
 * the client computes keys from neighbours, and "append" means the neighbour is
 * whatever currently sits last.
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
