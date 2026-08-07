import { supabase } from '@/supabase-client'
import logger from '@/utils/logger'

export type MoveCardParams = {
  card_id: number
  // Position key for the card's new slot, from `@/utils/card/rank`.
  rank: string
}

/**
 * Reposition a card within its deck. Writing the new key *is* the move — no
 * anchor to resolve, no neighbours to shift, no rebalance to trigger.
 */
export async function moveCard({ card_id, rank }: MoveCardParams): Promise<void> {
  const { error } = await supabase.from('cards').update({ rank }).eq('id', card_id)

  if (error) {
    logger.error(error.message)
    throw error
  }
}
