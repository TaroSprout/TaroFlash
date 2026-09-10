import { supabase } from '@/supabase-client'
import logger from '@/utils/logger'

// Every signed-in member may read switch states (RLS allows SELECT to
// authenticated) — the screen needs them to decide what to show. Changing a
// switch is admin-only and gated at the database, not here.
export async function fetchCapabilitySwitches(): Promise<CapabilitySwitch[]> {
  const { data, error } = await supabase.from('capability_switches').select('key, state')

  if (error) {
    logger.error(error.message)
    throw error
  }

  return (data ?? []) as CapabilitySwitch[]
}
