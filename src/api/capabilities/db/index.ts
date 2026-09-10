import { supabase } from '@/supabase-client'
import logger from '@/utils/logger'

/**
 * Reads every capability's key and state. RLS opens the read to any
 * signed-in member; changing a capability is admin-only and refused at the
 * database, never here.
 */
export async function fetchCapabilities(): Promise<Capability[]> {
  const { data, error } = await supabase.from('capabilities').select('key, state')

  if (error) {
    logger.error(error.message)
    throw error
  }

  return (data ?? []) as Capability[]
}
