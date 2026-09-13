import { supabase } from '@/supabase-client'
import logger from '@/utils/logger'

/** The raw capability rows for the admin editor — key and state, no resolution. */
export async function fetchCapabilities(): Promise<CapabilitiesResult> {
  const { data, error } = await supabase.from('capabilities').select('key, state')

  if (error) {
    logger.error(error.message)
    throw error
  }

  return { capabilities: (data ?? []) as Capability[] }
}

/** Each capability's live state, resolved server-side for the calling member. */
export async function fetchResolvedCapabilities(): Promise<ResolvedCapability[]> {
  const { data, error } = await supabase.rpc('resolve_member_capabilities')

  if (error) {
    logger.error(error.message)
    throw error
  }

  return (data ?? []) as ResolvedCapability[]
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

/** Reads through the admin-gated RPC — a non-admin caller gets an empty list, refused at the database. */
export async function fetchCapabilityGrants(key: CapabilityKey): Promise<CapabilityGrant[]> {
  const { data, error } = await supabase.rpc('list_capability_grants', { p_key: key })

  if (error) {
    logger.error(error.message)
    throw error
  }

  return (data ?? []) as CapabilityGrant[]
}

export type CapabilityGrantParams = {
  key: CapabilityKey
  member_id: string
}

/** granted_by/granted_at are stamped by the database; the write is refused for non-admins there. */
export async function addCapabilityGrant(params: CapabilityGrantParams): Promise<void> {
  const { error } = await supabase
    .from('capability_grants')
    .insert({ key: params.key, member_id: params.member_id })

  if (error) {
    logger.error(error.message)
    throw error
  }
}

export async function removeCapabilityGrant(params: CapabilityGrantParams): Promise<void> {
  const { error } = await supabase
    .from('capability_grants')
    .delete()
    .eq('key', params.key)
    .eq('member_id', params.member_id)

  if (error) {
    logger.error(error.message)
    throw error
  }
}
