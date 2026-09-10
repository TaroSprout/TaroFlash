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

export type UpdateCapabilitySwitchParams = {
  key: CapabilityKey
  state: CapabilityState
}

/**
 * Flips a capability switch's state. RLS refuses the write for anyone but an
 * admin (`can_manage_capabilities()`); this function never re-checks the role.
 */
export async function updateCapabilitySwitch(params: UpdateCapabilitySwitchParams): Promise<void> {
  const { error } = await supabase
    .from('capability_switches')
    .update({ state: params.state })
    .eq('key', params.key)

  if (error) {
    logger.error(error.message)
    throw error
  }
}
