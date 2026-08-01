import { useSaveReviewMutation, type SaveReviewVars } from '@/api/reviews'

export type SaveOutcome = 'saved' | 'failed'

/**
 * Backoff schedule for a failing save, in ms. The initial attempt fires
 * immediately; each failure waits the next delay before retrying.
 */
const RETRY_DELAYS = [500, 1000, 2000]

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * Resolves on the browser's next `online` event, or immediately if it already
 * reports online. Lets a save that failed while offline get one more attempt
 * the moment the connection is back, without hanging a still-online save.
 */
function nextOnline(): Promise<void> {
  if (navigator.onLine) return Promise.resolve()
  return new Promise((resolve) => {
    const handler = () => {
      window.removeEventListener('online', handler)
      resolve()
    }
    window.addEventListener('online', handler)
  })
}

/**
 * Wraps the review-save mutation in an at-most-once retry loop: the card has
 * already flown away optimistically, so this quietly re-tries the durable
 * write in the background and reports back a single terminal outcome. Retries
 * run at 0.5s / 1s / 2s, plus one final attempt when the browser next comes
 * online, then the save is given up as `failed`. Idempotency is guaranteed
 * server-side (unique index on review_logs + idempotent reviews upsert), so a
 * replay can never double-write.
 */
export function useReviewSaver() {
  const mutation = useSaveReviewMutation()

  async function attempt(vars: SaveReviewVars): Promise<boolean> {
    try {
      await mutation.mutateAsync(vars)
      return true
    } catch {
      return false
    }
  }

  async function save(vars: SaveReviewVars): Promise<SaveOutcome> {
    if (await attempt(vars)) return 'saved'

    for (const delay of RETRY_DELAYS) {
      await wait(delay)
      if (await attempt(vars)) return 'saved'
    }

    await nextOnline()
    if (await attempt(vars)) return 'saved'

    return 'failed'
  }

  return { save }
}
