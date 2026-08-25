import { useMutation, useQueryCache } from '@pinia/colada'
import type { ReviewLog } from 'ts-fsrs'
import { saveReview } from '../db'

export type SaveReviewVars = {
  card_id: number
  deck_id: number
  card: Review
  log: ReviewLog
}

// Trap: a missed invalidation fails silently →[K:silent-stale-cache]
export function useSaveReviewMutation() {
  return useMutation({
    mutation: (vars: SaveReviewVars) => saveReview(vars.card_id, vars.card, vars.log)
  })
}

/**
 * Refreshes every reviewed deck's own data plus the dashboard's due counts.
 * Fired once when a study session reaches its summary, not per review, so a
 * session of any length still costs one deck-list refetch rather than one per
 * rating — and takes every reviewed deck at once so that single refetch fires
 * only once per session rather than once per deck.
 */
export function useFlushDeckReviews() {
  const queryCache = useQueryCache()
  return (deck_ids: number[]) => {
    for (const deck_id of deck_ids) {
      queryCache.invalidateQueries({ key: ['deck', deck_id] })
      queryCache.invalidateQueries({ key: ['cards', deck_id] })
    }

    // exact: true keeps this off the deck *count*, which no review can ever change.
    queryCache.invalidateQueries({ key: ['decks'], exact: true })
  }
}
