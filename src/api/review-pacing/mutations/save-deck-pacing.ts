import { useMutation, useQueryCache } from '@pinia/colada'
import { saveDeckPacing, type DeckPacing } from '../db'

// Trap: a pin is presence, not difference →[K:pin-is-presence-not-difference]
/**
 * Saves which preset a deck follows and what it pins, on its own.
 *
 * Preset actions save the moment they're taken, so the deck's half has to land
 * with them — held back until Save, the two would disagree in between.
 */
export function useSaveDeckPacingMutation() {
  const queryCache = useQueryCache()
  return useMutation({
    mutation: (pacing: DeckPacing) => saveDeckPacing(pacing),
    onSettled: () => {
      // A changed preset link restates every one of the deck's pacing values.
      queryCache.invalidateQueries({ key: ['decks'] })
    }
  })
}
