import { supabase } from '@/supabase-client'
import logger from '@/utils/logger'

export async function fetchCapabilities(): Promise<CapabilitiesResult> {
  const [capabilitiesResult, grantsResult] = await Promise.all([
    supabase.from('capabilities').select('key, state'),
    supabase.from('capability_grants').select('key')
  ])

  if (capabilitiesResult.error) {
    logger.error(capabilitiesResult.error.message)
    throw capabilitiesResult.error
  }

  if (grantsResult.error) {
    logger.error(grantsResult.error.message)
    throw grantsResult.error
  }

  const capabilities = (capabilitiesResult.data ?? []) as Capability[]
  const grantedKeys = new Set((grantsResult.data ?? []).map((row) => row.key as CapabilityKey))

  return { capabilities, grantedKeys }
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
