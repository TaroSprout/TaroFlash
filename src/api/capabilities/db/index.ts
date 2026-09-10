import { supabase } from '@/supabase-client'
import logger from '@/utils/logger'

/**
 * Reads every capability switch's key and state. RLS opens the read to any
 * signed-in member; changing a switch is admin-only and refused at the
 * database, never here.
 */
export async function fetchCapabilitySwitches(): Promise<CapabilitySwitch[]> {
  const { data, error } = await supabase.from('capability_switches').select('key, state')

  if (error) {
    logger.error(error.message)
    throw error
  }

  return (data ?? []) as CapabilitySwitch[]
}
