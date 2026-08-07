import { supabase } from '@/supabase-client'
import logger from '@/utils/logger'
import { ranksBetween } from '@/utils/card/rank'
import { fetchDeckTailRank } from './tail-rank'

export type MoveCardsToDeckArgs =
  | { target_deck_id: number; card_ids: number[] }
  | { target_deck_id: number; source_deck_id: number; except_ids: number[] }

// PostgREST caps a response at `max_rows` (1000). A whole-deck move on a paid
// account can exceed that, so the id sweep pages instead of trusting one call.
const ID_PAGE_SIZE = 1000

/**
 * One page of the ids this move will touch, in their current `(rank, id)`
 * order — which is the order they must land in at the destination.
 *
 * Cards already sitting in the target deck are filtered out rather than
 * re-keyed, so a mixed selection that includes some of them leaves those
 * exactly where they are.
 */
async function fetchMovingIdPage(args: MoveCardsToDeckArgs, offset: number): Promise<number[]> {
  const scoped =
    'card_ids' in args
      ? supabase.from('cards').select('id').in('id', args.card_ids)
      : supabase.from('cards').select('id').eq('deck_id', args.source_deck_id)

  const filtered =
    'except_ids' in args && args.except_ids.length > 0
      ? scoped.not('id', 'in', `(${args.except_ids.join(',')})`)
      : scoped

  const { data, error } = await filtered
    .neq('deck_id', args.target_deck_id)
    .order('rank')
    .order('id')
    .range(offset, offset + ID_PAGE_SIZE - 1)

  if (error) {
    logger.error(error.message)
    throw error
  }

  return data.map((card) => card.id)
}

/** Every id the move will touch, ordered. */
async function fetchMovingIds(args: MoveCardsToDeckArgs): Promise<number[]> {
  const ids: number[] = []
  let page = await fetchMovingIdPage(args, 0)

  while (page.length === ID_PAGE_SIZE) {
    ids.push(...page)
    page = await fetchMovingIdPage(args, ids.length)
  }

  return [...ids, ...page]
}

/**
 * Move cards into another deck, appended after whatever is already there and
 * keeping their relative order.
 *
 * Client-orchestrated in three steps — resolve the ids, read the destination's
 * tail key, mint one key per card — leaving the RPC to do nothing but check
 * ownership and write. Still an RPC only because PostgREST can't give each row
 * of a bulk update its own value.
 */
export async function moveCardsToDeck(args: MoveCardsToDeckArgs): Promise<void> {
  const card_ids = await fetchMovingIds(args)
  if (card_ids.length === 0) return

  const tail_rank = await fetchDeckTailRank(args.target_deck_id)
  const ranks = ranksBetween({ prev: tail_rank, next: null }, card_ids.length)

  const { error } = await supabase.rpc('move_cards_to_deck', {
    p_target_deck_id: args.target_deck_id,
    p_card_ids: card_ids,
    p_ranks: ranks
  })

  if (error) {
    logger.error(error.message)
    throw error
  }
}
