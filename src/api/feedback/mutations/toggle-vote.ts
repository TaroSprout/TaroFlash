import { useMutation, useQueryCache } from '@pinia/colada'
import { toggleFeedbackVote } from '../db'

type QueryCache = ReturnType<typeof useQueryCache>
type VoteSnapshot = FeedbackItem[] | undefined

/**
 * Optimistically flips `voted_by_me` and adjusts `vote_count` for the given
 * item, in place of waiting for the refetch. Returns the pre-toggle
 * snapshot for rollback, or `undefined` when the list isn't cached.
 */
function toggleVoteInCache(queryCache: QueryCache, feedback_id: number): VoteSnapshot {
  const snapshot = queryCache.getQueryData(['feedback-items']) as VoteSnapshot
  if (!snapshot) return undefined

  queryCache.setQueryData(
    ['feedback-items'],
    snapshot.map((item) =>
      item.id === feedback_id
        ? {
            ...item,
            voted_by_me: !item.voted_by_me,
            vote_count: item.vote_count + (item.voted_by_me ? -1 : 1)
          }
        : item
    )
  )

  return snapshot
}

/**
 * Toggle the current member's vote on a feedback item. `onMutate`
 * optimistically flips the cached vote so the heart responds immediately;
 * `onError` restores the pre-toggle snapshot; `onSettled` invalidates to
 * reconcile with the server-authoritative count.
 */
export function useToggleFeedbackVoteMutation() {
  const queryCache = useQueryCache()
  return useMutation({
    mutation: (feedback_id: number) => toggleFeedbackVote(feedback_id),
    onMutate: (feedback_id: number) => ({
      snapshot: toggleVoteInCache(queryCache, feedback_id)
    }),
    onError: (_error, _vars, { snapshot }) => {
      if (snapshot) queryCache.setQueryData(['feedback-items'], snapshot)
    },
    onSettled: () => queryCache.invalidateQueries({ key: ['feedback-items'] })
  })
}
