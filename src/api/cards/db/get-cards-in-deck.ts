import { supabase } from '@/supabase-client'
import logger from '@/utils/logger'

export type FetchCardsInDeckArgs = {
  deck_id: number
  sort_by: string
  query: string | null
  offset: number
  limit: number
}

export type CardsPage = {
  cards: Card[]
  // Rank of the first card on the next page, or null at the end of the deck.
  next_rank: string | null
}

/**
 * One page of a deck's cards, plus a peek at the row after it.
 *
 * The peek is what makes the page boundary safe to write against: a card
 * dropped below the last loaded row needs the key of the row *after* it to sit
 * between the two. Without it that card would resolve "no next neighbour" and
 * be sent to the end of the entire deck. It doubles as the has-more signal, so
 * paging no longer has to infer it from a short page.
 */
export async function fetchCardsInDeck({
  deck_id,
  sort_by,
  query,
  offset,
  limit
}: FetchCardsInDeckArgs): Promise<CardsPage> {
  const { data, error } = await supabase.rpc('get_cards_in_deck', {
    p_deck_id: deck_id,
    p_sort_by: sort_by,
    p_query: query,
    p_offset: offset,
    p_limit: limit + 1
  })

  if (error) {
    logger.error(error.message)
    throw new Error(error.message)
  }

  const rows = data as unknown as Card[]

  return { cards: rows.slice(0, limit), next_rank: rows[limit]?.rank ?? null }
}
