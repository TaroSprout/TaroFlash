import { supabase } from '@/supabase-client'
import logger from '@/utils/logger'

export async function fetchMemberById(id: string): Promise<Member | null> {
  // Embed the member's plan row (FK members.plan → plans.id) to surface the
  // catalog display name — flattened to `plan_display_name` so Member stays flat.
  const { data, error } = await supabase
    .from('members')
    .select('*, plans(display_name)')
    .eq('id', id)
    .single()

  if (error) {
    logger.error(error.message)
    return null
  }

  const { plans, ...member } = data
  return { ...member, plan_display_name: plans?.display_name }
}

export async function upsertMember(member: Member): Promise<void> {
  const { error } = await supabase.from('members').upsert(member, { onConflict: 'id' })

  if (error) {
    logger.error(error.message)
    throw error
  }
}
