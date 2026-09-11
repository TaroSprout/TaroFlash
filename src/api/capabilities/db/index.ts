import { supabase } from '@/supabase-client'
import logger from '@/utils/logger'

export async function fetchCapabilities(): Promise<Capability[]> {
  const { data, error } = await supabase.from('capabilities').select('key, state')

  if (error) {
    logger.error(error.message)
    throw error
  }

  return (data ?? []) as Capability[]
}

export type UpdateCapabilityParams = {
  key: CapabilityKey
  state: CapabilityState
}

/** Write refused for non-admins at the database, never re-checked here. */
export async function updateCapability(params: UpdateCapabilityParams): Promise<void> {
  const { error } = await supabase
    .from('capabilities')
    .update({ state: params.state })
    .eq('key', params.key)

  if (error) {
    logger.error(error.message)
    throw error
  }
}
