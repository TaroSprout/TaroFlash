import { useMutation, useQueryCache } from '@pinia/colada'
import { deleteDeck } from '../db'

export function useDeleteDeckMutation() {
  const queryCache = useQueryCache()
  return useMutation({
    mutation: (id: number) => deleteDeck(id),
    onSettled: (_data, error, id) => {
      queryCache.invalidateQueries({ key: ['decks'] })
      // Forget it rather than reload it — there's nothing left there to ask for.
      if (!error) queryCache.invalidateQueries({ key: ['deck', id] }, false)
    }
  })
}
