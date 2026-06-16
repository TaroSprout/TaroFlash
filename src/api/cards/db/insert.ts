import { supabase } from '@/supabase-client'
import logger from '@/utils/logger'

export type InsertCardAtParams = {
  deck_id: number
  anchor_id: number | null
  side: 'before' | 'after' | null
  front_text: string
  back_text: string
  // Optional free-text note that rides along with the card (e.g. the term
  // popover's contextual explanation). Omitted for most adds.
  note?: string | null
}

export async function insertCardAt(
  params: InsertCardAtParams
): Promise<{ id: number; rank: number }> {
  const { data, error } = await supabase.rpc('insert_card_at', {
    p_deck_id: params.deck_id,
    p_anchor_id: params.anchor_id,
    p_side: params.side,
    p_front_text: params.front_text,
    p_back_text: params.back_text,
    p_note: params.note ?? undefined
  })

  if (error) {
    logger.error(error.message)
    throw error
  }

  return data[0]
}
