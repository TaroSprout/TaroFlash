import { useQuery } from '@pinia/colada'
import { toValue, type MaybeRefOrGetter } from 'vue'
import { fetchSessionEarnings } from '../db'

/** Disabled until a session id is given — the restore-into-a-finished-summary read, gated by the caller on the reward capability being live. */
export function useSessionEarningsQuery(session_id: MaybeRefOrGetter<string | undefined>) {
  return useQuery({
    key: () => ['session-earnings', toValue(session_id) ?? ''],
    query: () => fetchSessionEarnings(toValue(session_id) as string),
    enabled: () => Boolean(toValue(session_id))
  })
}
