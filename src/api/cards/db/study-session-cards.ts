import { supabase } from '@/supabase-client'
import logger from '@/utils/logger'
import { localDayStart } from '@/utils/date'

export async function fetchStudySessionCards(deck_id: number): Promise<Card[]> {
  const { data, error } = await supabase
    .rpc('get_study_session_cards', {
      p_deck_id: deck_id,
      p_today_start: localDayStart()
    })
    .select('*, review:reviews(*)')

  if (error) {
    logger.error(error.message)
    throw new Error(error.message)
  }

  return data ?? []
}
