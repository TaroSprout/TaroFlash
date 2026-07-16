import { useMutation, useQueryCache } from '@pinia/colada'
import { createPreset, updatePreset, type NewReviewPacingPreset } from '../db'

type UpsertPresetVars = NewReviewPacingPreset & { id?: number }

export function useUpsertPresetMutation() {
  const queryCache = useQueryCache()
  return useMutation({
    mutation: ({ id, ...preset }: UpsertPresetVars) =>
      id ? updatePreset({ id, ...preset }) : createPreset(preset),
    onSettled: () => {
      queryCache.invalidateQueries({ key: ['review-pacing-presets'] })
    }
  })
}
