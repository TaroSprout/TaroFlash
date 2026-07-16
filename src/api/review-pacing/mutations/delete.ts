import { useMutation, useQueryCache } from '@pinia/colada'
import { deletePreset } from '../db'

export function useDeletePresetMutation() {
  const queryCache = useQueryCache()
  return useMutation({
    mutation: (id: number) => deletePreset(id),
    onSettled: () => {
      // Deleting a preset also reverts any deck that had it assigned (FK is
      // ON DELETE SET NULL) — decks need a refetch too, not just the list.
      queryCache.invalidateQueries({ key: ['review-pacing-presets'] })
      queryCache.invalidateQueries({ key: ['decks'] })
    }
  })
}
