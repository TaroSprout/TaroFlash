import { supabase } from '@/supabase-client'
import logger from '@/utils/logger'

export async function fetchMemberById(id: string): Promise<Member> {
  const { data, error } = await supabase
    .from('members')
    .select('*, plans(deck_limit, cards_per_deck_limit)')
    .eq('id', id)
    .single()

  if (error) {
    logger.error(error.message)
    throw error
  }

  return data
}

/**
 * Patches an existing member row. Every member row is auto-created by the
 * signup trigger, so this is always an update, never a real insert — a
 * `.upsert()` here would fail on any payload that omits a NOT NULL column
 * (Postgres validates the INSERT tuple before it resolves the conflict).
 */
export async function upsertMember({ id, ...updates }: Member): Promise<void> {
  const { error } = await supabase.from('members').update(updates).eq('id', id)

  if (error) {
    logger.error(error.message)
    throw error
  }
}
