import { supabase } from '@/supabase-client'
import logger from '@/utils/logger'

/**
 * Fetch every card in a deck in one shot (no pagination), each joined with its
 * FSRS review row. Used by sort modes that have to reorder the *whole* deck —
 * the infinite-scroll pages only cover what's been scrolled to, so a client
 * sort over them would miss cards further down. Mirrors `searchCardsInDeck`,
 * which likewise trades pagination for full-deck coverage.
 */
export async function fetchAllCardsInDeck(deck_id: number): Promise<Card[]> {
  const { data, error } = await supabase
    .from('cards_with_images')
    .select('*, review:reviews(*)')
    .eq('deck_id', deck_id)

  if (error) {
    logger.error(error.message)
    throw new Error(error.message)
  }

  return data
}
