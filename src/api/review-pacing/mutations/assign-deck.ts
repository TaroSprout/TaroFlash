import { useMutation, useQueryCache } from '@pinia/colada'
import { assignDeckPreset, setDeckPacingOverrides, unassignDeckPreset } from '../db'

type AssignDeckPresetVars = { deck_id: number; preset_id: number }

function useInvalidateDeck() {
  const queryCache = useQueryCache()
  return (deck_id: number) => {
    queryCache.invalidateQueries({ key: ['decks'] })
    queryCache.invalidateQueries({ key: ['deck', deck_id] })
  }
}

export function useAssignDeckPresetMutation() {
  const invalidate = useInvalidateDeck()
  return useMutation({
    mutation: ({ deck_id, preset_id }: AssignDeckPresetVars) =>
      assignDeckPreset(deck_id, preset_id),
    onSettled: (_data, _error, { deck_id }) => invalidate(deck_id)
  })
}

type SetDeckPacingOverridesVars = { deck_id: number; overrides: DeckReviewPacingOverrides }

export function useSetDeckPacingOverridesMutation() {
  const invalidate = useInvalidateDeck()
  return useMutation({
    mutation: ({ deck_id, overrides }: SetDeckPacingOverridesVars) =>
      setDeckPacingOverrides(deck_id, overrides),
    onSettled: (_data, _error, { deck_id }) => invalidate(deck_id)
  })
}

export function useUnassignDeckPresetMutation() {
  const invalidate = useInvalidateDeck()
  return useMutation({
    mutation: (deck_id: number) => unassignDeckPreset(deck_id),
    onSettled: (_data, _error, deck_id) => invalidate(deck_id)
  })
}
