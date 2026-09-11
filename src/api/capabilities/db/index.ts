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
