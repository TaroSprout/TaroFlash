import { supabase } from '@/supabase-client'
import logger from '@/utils/logger'

export type SessionEarnings = {
  base: number
  bonus: number
  balance: number
}

/** The base and difficulty-bonus paperclips the session paid, each already the whole floored paperclips (never a fraction), plus the member's resulting whole-clip balance. Reads the member's own rows only. */
export async function fetchSessionEarnings(session_id: string): Promise<SessionEarnings> {
  const { data, error } = await supabase
    .rpc('get_session_earnings', { p_session_id: session_id })
    .single()

  if (error) {
    logger.error(error.message)
    throw new Error(error.message)
  }

  return data as SessionEarnings
}
