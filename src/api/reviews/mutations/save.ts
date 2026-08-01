import { useMutation, useQueryCache } from '@pinia/colada'
import type { ReviewLog } from 'ts-fsrs'
import { saveReview } from '../db'

export type SaveReviewVars = {
  card_id: number
  deck_id: number
  card: Review
  log: ReviewLog
}

export function useSaveReviewMutation() {
  const queryCache = useQueryCache()
  return useMutation({
    mutation: (vars: SaveReviewVars) => saveReview(vars.card_id, vars.card, vars.log),
    onSettled: () => {
      queryCache.invalidateQueries({ key: ['decks'] })
    }
  })
}

export function useFlushDeckReviews() {
  const queryCache = useQueryCache()
  return (deck_id: number) => {
    queryCache.invalidateQueries({ key: ['deck', deck_id] })
    queryCache.invalidateQueries({ key: ['cards', deck_id] })
  }
}
