import { useMutation, useQueryCache } from '@pinia/colada'
import { deletePreset } from '../db'

export function useDeletePresetMutation() {
  const queryCache = useQueryCache()
  return useMutation({
    mutation: (id: number) => deletePreset(id),
    onSettled: () => {
      // Every deck that was following the preset falls back to its own settings.
      queryCache.invalidateQueries({ key: ['review-pacing-presets'] })
      queryCache.invalidateQueries({ key: ['decks'] })
    }
  })
}
