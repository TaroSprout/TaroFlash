import { useMutation, useQueryCache } from '@pinia/colada'
import { createPreset, updatePreset, type NewReviewPacingPreset } from '../db'

type UpsertPresetVars = NewReviewPacingPreset & { id?: number }

export function useUpsertPresetMutation() {
  const queryCache = useQueryCache()
  return useMutation({
    mutation: ({ id, ...preset }: UpsertPresetVars) =>
      id ? updatePreset({ id, ...preset }) : createPreset(preset),
    onSettled: () => {
      // Editing a preset re-paces every deck following it, so the decks' BE-resolved
      // pacing values are stale too — not just the preset list.
      queryCache.invalidateQueries({ key: ['review-pacing-presets'] })
      queryCache.invalidateQueries({ key: ['decks'] })
    }
  })
}
