import { supabase } from '@/supabase-client'
import logger from '@/utils/logger'
import { ranksBetween } from '@/utils/card/rank'
import { fetchDeckTailRank } from './tail-rank'

export type CardDraft = {
  front_text: string
  back_text: string
}

export type BulkInsertCardsParams = {
  deck_id: number
  cards: CardDraft[]
}

/**
 * Adds a batch of cards to the end of a deck, in the order given.
 *
 * A batch that would take the deck over its card limit is refused whole — it
 * never fills up to the limit and stops part-way.
 */
export async function bulkInsertCardsInDeck({
  deck_id,
  cards
}: BulkInsertCardsParams): Promise<Card[]> {
  const tail_rank = await fetchDeckTailRank(deck_id)
  const ranks = ranksBetween({ prev: tail_rank, next: null }, cards.length)

  const { data, error } = await supabase
    .from('cards')
    .insert(cards.map((card, i) => ({ ...card, deck_id, rank: ranks[i]! })))
    .select()

  if (error) {
    logger.error(error.message)
    throw error
  }

  return data
}
