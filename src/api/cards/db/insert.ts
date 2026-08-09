import { supabase } from '@/supabase-client'
import logger from '@/utils/logger'
import { rankBetween } from '@/utils/card/rank'
import { fetchDeckTailRank } from './tail-rank'

export type InsertCardParams = {
  deck_id: number
  // Where in the deck it goes. Omit when there's no list on screen to place it against.
  rank?: string
  front_text: string
  back_text: string
  note?: string | null
}

/**
 * Key for a card added at the very end of a deck: the current last card is its
 * only neighbour, and there is nothing on the far side.
 */
async function lastPositionIn(deck_id: number): Promise<string> {
  return rankBetween({ prev: await fetchDeckTailRank(deck_id), next: null })
}

/**
 * Creates a card at an already-decided position, or at the end of the deck.
 *
 * Owner and the per-deck card limit are both the database's to enforce; going
 * over the limit comes back as `PT402`.
 */
export async function insertCard(params: InsertCardParams): Promise<{ id: number; rank: string }> {
  const rank = params.rank ?? (await lastPositionIn(params.deck_id))

  const { data, error } = await supabase
    .from('cards')
    .insert({
      deck_id: params.deck_id,
      rank,
      front_text: params.front_text,
      back_text: params.back_text,
      note: params.note ?? null
    })
    .select('id, rank')
    .single()

  if (error) {
    logger.error(error.message)
    throw error
  }

  return data
}
