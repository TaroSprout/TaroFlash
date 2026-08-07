import { useMutation, useQueryCache } from '@pinia/colada'
import { insertCard, type InsertCardParams } from '../db'
import { invalidateAllCardCounts, invalidateCardIndex, invalidateDeck } from './_invalidate'

export type { InsertCardParams }

export function useInsertCardMutation() {
  const queryCache = useQueryCache()
  return useMutation({
    mutation: (params: InsertCardParams) => insertCard(params),
    onSettled: (_data, _error, params) => {
      // A blank card carries nothing the deck's card pages don't already show:
      // the editor staged the row and `promoteTemp` fills in the id and rank the
      // insert returned, and an empty card can't be flagged a duplicate. Only
      // the deck's own counts moved, so skip re-reading the whole page. An
      // insert that does carry text (the audio-reader panel, a re-insert after a
      // failed eager save) has no such row on screen and still refetches.
      const blank = !params.front_text && !params.back_text

      invalidateDeck(queryCache, params.deck_id, { card_pages: !blank })
      invalidateAllCardCounts(queryCache)

      // The index maps front text → decks, so a card inserted without one adds
      // nothing to it.
      if (params.front_text) invalidateCardIndex(queryCache)
    }
  })
}
