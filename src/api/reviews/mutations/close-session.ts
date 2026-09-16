import { useMutation } from '@pinia/colada'
import { useCapabilities } from '@/api/capabilities'
import { fetchSessionEarnings, type SessionEarnings } from '@/api/rewards/db'
import { closeStudySession } from '../db'

/**
 * Fires the server close for every session, then — only when the reward
 * capability is live for this member — reads back what that close paid out.
 * Safe to call more than once for the same session id; the server's
 * once-per-session guard means a stray retry never double-pays.
 */
export function useCloseStudySessionMutation() {
  const { isLive } = useCapabilities()

  return useMutation({
    mutation: async (session_id: string): Promise<SessionEarnings | null> => {
      await closeStudySession(session_id)
      if (!isLive('session_rewards', false)) return null

      return fetchSessionEarnings(session_id)
    }
  })
}
