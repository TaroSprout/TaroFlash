import { supabase } from '@/supabase-client'
import logger from '@/utils/logger'
import { ranksBetween } from '@/utils/card/rank'
import { fetchDeckTailRank } from './tail-rank'

export type MoveCardsToDeckArgs =
  | { target_deck_id: number; card_ids: number[] }
  // `count` is how many cards the whole-deck move covers — the same number the
  // move modal shows. Only an upper bound is needed (see below), so the
  // caller's own tally serves; there's nothing to ask the server for.
  | { target_deck_id: number; source_deck_id: number; except_ids: number[]; count: number }

/**
 * How many keys to mint.
 *
 * An upper bound, not an exact count: the RPC pairs keys with the cards it
 * resolves and ignores any spare, so overshooting costs nothing. Undershooting
 * doesn't work — a card would be left without a key — and that's what the RPC
 * rejects outright.
 */
function countKeysNeeded(args: MoveCardsToDeckArgs): number {
  return 'card_ids' in args ? args.card_ids.length : args.count
}

/**
 * Move cards into another deck, appended after whatever is already there and
 * keeping their relative order.
 *
 * Split of labour: the client mints a run of keys sitting after the target
 * deck's last card, and the RPC decides which cards get them. Resolving that set
 * here instead would mean paging every id out past `max_rows` only to send it
 * straight back.
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
