import { supabase } from '@/supabase-client'
import logger from '@/utils/logger'

export type FetchCardsPageArgs = {
  deck_id: number
  offset: number
  limit: number
}

export async function fetchCardsPageByDeckId({
  deck_id,
  offset,
  limit
}: FetchCardsPageArgs): Promise<Card[]> {
  const { data, error } = await supabase
    .from('cards_with_images')
    .select('*, review:reviews(*)')
    .eq('deck_id', deck_id)
    .order('rank', { ascending: true })
    .order('id', { ascending: true })
    .range(offset, offset + limit - 1)

  if (error) {
    logger.error(error.message)
    throw new Error(error.message)
  }

  return data
}
