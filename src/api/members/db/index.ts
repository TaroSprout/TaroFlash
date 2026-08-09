import { supabase } from '@/supabase-client'
import logger from '@/utils/logger'

// Listed out rather than everything: the row also holds billing identifiers that
// have no business reaching the browser. `delete_at` must stay — it is the only
// thing telling the app an account is pending deletion.
const MEMBER_COLUMNS =
  'id, display_name, description, created_at, email, avatar_url, role, plan, preferences, cover_config, delete_at, plans(deck_limit, cards_per_deck_limit)' as const

export async function fetchMemberById(id: string): Promise<Member | null> {
  const { data, error } = await supabase
    .from('members')
    .select(MEMBER_COLUMNS)
    .eq('id', id)
    .single()

  if (error) {
    // No rows means this account isn't visible to the caller, not that the read failed.
    if (error.code === 'PGRST116') return null

    logger.error(error.message)
    throw error
  }

  // The plan comes back as one object; the client library can only guess a list.
  return data as unknown as Member
}

/**
 * Changes part of an existing member. Signup always creates the row, so this
 * never has to make one — and can't, since a partial payload wouldn't be valid.
 */
export async function upsertMember({ id, ...updates }: Member): Promise<void> {
  const { error } = await supabase.from('members').update(updates).eq('id', id)

  if (error) {
    logger.error(error.message)
    throw error
  }
}
