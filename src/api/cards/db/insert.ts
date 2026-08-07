import { supabase } from '@/supabase-client'
import logger from '@/utils/logger'
import { rankBetween } from '@/utils/card/rank'
import { fetchDeckTailRank } from './tail-rank'

export type InsertCardParams = {
  deck_id: number
  // Position key, from `@/utils/card/rank`. Omit to append — for callers with
  // no list on screen to resolve neighbours from (e.g. the term popover, adding
  // to a deck the user only picked from a dropdown).
  rank?: string
  front_text: string
  back_text: string
  // Optional free-text note that rides along with the card (e.g. the term
  // popover's contextual explanation). Omitted for most adds.
  note?: string | null
}

/**
 * Create a card at an already-decided position, or at the end of the deck.
 *
 * A plain insert rather than an RPC: with the rank resolved on the client there
 * is nothing left for the server to compute. `member_id` is filled by the
 * `set_member_id` trigger, and the per-deck cap by the trigger on `cards`, which
 * rejects an over-cap insert with `PT402`.
 */
export async function insertCard(params: InsertCardParams): Promise<{ id: number; rank: string }> {
  const rank =
    params.rank ?? rankBetween({ prev: await fetchDeckTailRank(params.deck_id), next: null })

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
