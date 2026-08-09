import { supabase } from '@/supabase-client'
import logger from '@/utils/logger'
import { localDayStart } from '@/utils/date'

/**
 * Everything a study session opens with, in one request: the decks themselves
 * plus their cards merged into a single pile, already capped for the day.
 */
export async function fetchSessionBootstrap(deck_ids: number[]): Promise<SessionBootstrap> {
  const { data, error } = await supabase.rpc('get_session_decks_and_cards', {
    p_deck_ids: deck_ids,
    p_today_start: localDayStart()
  })

  if (error) {
    logger.error(error.message)
    throw new Error(error.message)
  }

  return (data as SessionBootstrap | null) ?? { decks: [], cards: [] }
}
