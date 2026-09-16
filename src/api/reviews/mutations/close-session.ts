import { useMutation } from '@pinia/colada'
import { useCapabilities } from '@/api/capabilities'
import type { SessionEarnings } from '@/api/rewards/db'
import { closeStudySession } from '../db'

/**
 * Fires the server close for the session and returns what that same close
 * call paid out — no separate earnings read on this path; the standalone
 * earnings query stays only for resuming into an already-closed session.
 * Safe to call more than once for the same session id; the server's
 * once-per-session guard means a stray retry never double-pays.
 */
export function useCloseStudySessionMutation() {
  const { isLive } = useCapabilities()

  return useMutation({
    mutation: async (session_id: string): Promise<SessionEarnings | null> => {
      const earnings = await closeStudySession(session_id)
      if (!isLive('session_rewards', false)) return null

      return earnings
    }
  })
}
