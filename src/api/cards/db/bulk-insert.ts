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
 * Append a batch of cards to a deck, in the order given.
 *
 * The `bulk_insert_cards_in_deck` RPC this replaces existed to hand out ranks;
 * with keys minted up front it's a plain multi-row insert. The cap trigger on
 * `cards` sees the whole batch as one statement, so a batch that would overshoot
 * is rejected as a unit rather than filling up to the cap and stopping.
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
