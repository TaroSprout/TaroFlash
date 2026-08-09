import { supabase } from '@/supabase-client'
import { useMemberStore } from '@/stores/member'
import logger from '@/utils/logger'

// `term` stays exactly as stored — the matcher does its own normalising.
export type CardIndexEntry = {
  term: string
  deck_ids: number[]
}

export async function fetchMemberCardIndex(): Promise<CardIndexEntry[]> {
  const { data, error } = await supabase.rpc('get_member_card_index', {
    p_member_id: useMemberStore().id
  })

  if (error) {
    logger.error(error.message)
    throw new Error(error.message)
  }

  const entries = data ?? []
  trackIndexPayload(entries)
  return entries
}

// Fetching every term at once only works while the answer stays small — this is
// the early warning that someone's collection has outgrown it.
function trackIndexPayload(entries: CardIndexEntry[]) {
  const bytes = new Blob([JSON.stringify(entries)]).size
  logger.info(`[card-index] ${entries.length} terms, ${(bytes / 1024).toFixed(1)} KiB`)
}
