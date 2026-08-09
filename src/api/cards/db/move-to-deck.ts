import { supabase } from '@/supabase-client'
import logger from '@/utils/logger'
import { ranksBetween } from '@/utils/card/rank'
import { fetchDeckTailRank } from './tail-rank'

export type MoveCardsToDeckArgs =
  | { target_deck_id: number; card_ids: number[] }
  // The caller's own tally is enough — only an upper bound is needed, see below.
  | { target_deck_id: number; source_deck_id: number; except_ids: number[]; count: number }

/**
 * How many positions to mint.
 *
 * An upper bound, not an exact count: spares are ignored, but a shortfall would
 * leave a card with nowhere to go and is rejected outright.
 */
function countKeysNeeded(args: MoveCardsToDeckArgs): number {
  return 'card_ids' in args ? args.card_ids.length : args.count
}

/**
 * Moves cards into another deck, after whatever is already there and keeping
 * their order.
 *
 * Here decides *where* they land; the server decides *which* cards move.
 * Working out that set here would mean paging every id out only to send it back.
 */
export async function moveCardsToDeck(args: MoveCardsToDeckArgs): Promise<void> {
  const key_count = countKeysNeeded(args)
  if (key_count === 0) return

  const tail_rank = await fetchDeckTailRank(args.target_deck_id)
  const ranks = ranksBetween({ prev: tail_rank, next: null }, key_count)

  const { error } = await supabase.rpc('move_cards_to_deck', {
    p_target_deck_id: args.target_deck_id,
    p_ranks: ranks,
    p_card_ids: 'card_ids' in args ? args.card_ids : undefined,
    p_source_deck_id: 'source_deck_id' in args ? args.source_deck_id : undefined,
    p_except_ids: 'except_ids' in args ? args.except_ids : undefined
  })

  if (error) {
    logger.error(error.message)
    throw error
  }
}
