import { supabase } from '@/supabase-client'
import logger from '@/utils/logger'
import { localDayStart } from '@/utils/date'

/**
 * Single-request study-session bootstrap: the resolved decks plus the merged,
 * server-capped study queue for all of them, in the given deck order. Replaces
 * the old fan-out of one get_study_session_cards call per deck — the RPC embeds
 * each card's review row and each deck's resolved pacing/appearance itself.
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
