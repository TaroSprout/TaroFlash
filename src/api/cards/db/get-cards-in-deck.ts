import { supabase } from '@/supabase-client'
import logger from '@/utils/logger'

export type FetchCardsInDeckArgs = {
  deck_id: number
  sort_by: string
  query: string | null
  offset: number
  limit: number
}

export async function fetchCardsInDeck({
  deck_id,
  sort_by,
  query,
  offset,
  limit
}: FetchCardsInDeckArgs): Promise<Card[]> {
  const { data, error } = await supabase.rpc('get_cards_in_deck', {
    p_deck_id: deck_id,
    p_sort_by: sort_by,
    p_query: query,
    p_offset: offset,
    p_limit: limit
  })

  if (error) {
    logger.error(error.message)
    throw new Error(error.message)
  }

  return data as unknown as Card[]
}
