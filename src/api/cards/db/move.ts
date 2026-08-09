import { supabase } from '@/supabase-client'
import logger from '@/utils/logger'

export type MoveCardParams = {
  card_id: number
  rank: string
}

/**
 * Moves a card within its deck. Writing its new position *is* the move — no
 * neighbours shift, and nothing is renumbered.
 */
export async function moveCard({ card_id, rank }: MoveCardParams): Promise<void> {
  const { error } = await supabase.from('cards').update({ rank }).eq('id', card_id)

  if (error) {
    logger.error(error.message)
    throw error
  }
}
