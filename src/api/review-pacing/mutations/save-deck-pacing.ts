import { useMutation, useQueryCache } from '@pinia/colada'
import { saveDeckPacing, type DeckPacing } from '../db'

/**
 * Persists one deck's pacing sidecar on its own. Preset actions write to the
 * server immediately, so the deck half of that work (a cleared override bag, a
 * re-pointed preset link) has to land immediately too — waiting for the modal's
 * Save would leave the two halves disagreeing until then.
 */
export function useSaveDeckPacingMutation() {
  const queryCache = useQueryCache()
  return useMutation({
    mutation: (pacing: DeckPacing) => saveDeckPacing(pacing),
    onSettled: () => {
      // The deck's pacing values are resolved server-side, so a changed link or
      // override bag restates every one of them.
      queryCache.invalidateQueries({ key: ['decks'] })
    }
  })
}
