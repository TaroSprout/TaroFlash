import { supabase } from '@/supabase-client'
import logger from '@/utils/logger'

export async function fetchPlanLimits(): Promise<PlanLimits[]> {
  const { data, error } = await supabase
    .from('plans')
    .select('id, deck_limit, cards_per_deck_limit')

  if (error) {
    logger.error(error.message)
    throw error
  }

  return data ?? []
}
