import { supabase } from '@/supabase-client'
import { useMemberStore } from '@/stores/member'
import logger from '@/utils/logger'

// One distinct card front + the decks that hold it. The matcher normalizes
// `term` at build time, so this stays the raw value the RPC returns.
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

// Payload instrumentation: the fetch-all index is only viable while the
// response stays small. Log term count + serialized size so we can spot when a
// power user crosses the line and we need server-side per-lesson matching.
function trackIndexPayload(entries: CardIndexEntry[]) {
  const bytes = new Blob([JSON.stringify(entries)]).size
  logger.info(`[card-index] ${entries.length} terms, ${(bytes / 1024).toFixed(1)} KiB`)
}
