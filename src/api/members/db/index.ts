import { supabase } from '@/supabase-client'
import logger from '@/utils/logger'

// Explicit column list, not `select('*')` — `members` also holds
// stripe_customer_id/stripe_subscription_id, which are server-only
// (webhook + edge functions via the service-role client) and have no
// business shipping to the browser in the fetch response.
const MEMBER_COLUMNS =
  'id, display_name, description, created_at, email, avatar_url, role, plan, preferences, cover_config, plans(deck_limit, cards_per_deck_limit)' as const

export async function fetchMemberById(id: string): Promise<Member | null> {
  const { data, error } = await supabase
    .from('members')
    .select(MEMBER_COLUMNS)
    .eq('id', id)
    .single()

  if (error) {
    // PGRST116 = `.single()` found zero rows — RLS is filtering this id out,
    // not a fetch failure. That's an expected "not visible" outcome, so it
    // resolves to null rather than surfacing as an error.
    if (error.code === 'PGRST116') return null

    logger.error(error.message)
    throw error
  }

  // supabase-js can't infer the `plans` embed as a single object without
  // generated Database types (it defaults nested relations to arrays) — it
  // is one at runtime, since `plan` is a FK on this table.
  return data as unknown as Member
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
