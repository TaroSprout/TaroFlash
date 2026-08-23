import { useMutation, useQueryCache } from '@pinia/colada'
import { deleteDeck } from '../db'

type QueryCache = ReturnType<typeof useQueryCache>
type DeleteContext = Deck[] | undefined

/** Drops the deck from the cached list immediately, so its card leaves the grid without waiting on the write. */
function removeDeckFromCache(queryCache: QueryCache, id: number): DeleteContext {
  const snapshot = queryCache.getQueryData(['decks']) as DeleteContext
  if (!snapshot) return undefined

  queryCache.setQueryData(
    ['decks'],
    snapshot.filter((d) => d.id !== id)
  )

  return snapshot
}

export function useDeleteDeckMutation() {
  const queryCache = useQueryCache()
  return useMutation({
    mutation: (id: number) => deleteDeck(id),
    onMutate: (id: number) => ({
      snapshot: removeDeckFromCache(queryCache, id)
    }),
    onError: (_error, _id, { snapshot }) => {
      if (snapshot) queryCache.setQueryData(['decks'], snapshot)
    },
    onSettled: (_data, error, id) => {
      queryCache.invalidateQueries({ key: ['decks'] })
      // Forget it rather than reload it — there's nothing left there to ask for.
      if (!error) queryCache.invalidateQueries({ key: ['deck', id] }, false)
    }
  })
}
