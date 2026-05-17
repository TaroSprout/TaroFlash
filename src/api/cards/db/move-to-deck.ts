import { supabase } from '@/supabase-client'
import logger from '@/utils/logger'

export type MoveCardsToDeckArgs =
  | { target_deck_id: number; card_ids: number[] }
  | { target_deck_id: number; source_deck_id: number; except_ids: number[] }

export async function moveCardsToDeck(args: MoveCardsToDeckArgs): Promise<void> {
  const params =
    'card_ids' in args
      ? {
          p_target_deck_id: args.target_deck_id,
          p_card_ids: args.card_ids,
          p_source_deck_id: null,
          p_except_ids: null
        }
      : {
          p_target_deck_id: args.target_deck_id,
          p_card_ids: null,
          p_source_deck_id: args.source_deck_id,
          p_except_ids: args.except_ids
        }

  const { error } = await supabase.rpc('move_cards_to_deck', params)

  if (error) {
    logger.error(error.message)
    throw error
  }
}
