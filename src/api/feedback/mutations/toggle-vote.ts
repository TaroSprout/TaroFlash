import { useMutation, useQueryCache } from '@pinia/colada'
import { toggleFeedbackVote } from '../db'

type QueryCache = ReturnType<typeof useQueryCache>
type VoteSnapshot = FeedbackItem[] | undefined

/**
 * Flips the vote and its tally on the loaded post straight away, so the heart
 * responds under the finger. Returns the state to undo back to.
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

/** Adds or takes back the member's vote on a post. */
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
