import { setInfiniteQueryData, useMutation, useQueryCache } from '@pinia/colada'
import { debounce } from '@/utils/debounce'
import { saveCard } from '../db'
import { cardsInDeckQueryKey } from '../queries/cards-page'
import { invalidateCardIndex } from './_invalidate'

type QueryCache = ReturnType<typeof useQueryCache>

type SaveCardVars = {
  card: Card
  values: Partial<Card>
}

/**
 * Optimistically merge `values` into the matching card inside the deck's cached
 * pages, in place of a refetch. Keeps the read model (view mode + the next
 * save's merge base) in lockstep with the edit without a network round-trip.
 * No-op when the deck isn't cached or the card lives on an unloaded page.
 */
function patchCardInDeckCache(queryCache: QueryCache, card: Card, values: Partial<Card>) {
  if (card.deck_id === undefined || card.id === undefined) return

  const key = cardsInDeckQueryKey(card.deck_id)
  if (!queryCache.getQueryData(key)) return

  // Each page is a `Card[]`, so the page-item type is `Card[]`.
  setInfiniteQueryData<Card[]>(queryCache, key, (old) => ({
    pages: (old?.pages ?? []).map((page) =>
      page.map((c) => (c.id === card.id ? { ...c, ...values } : c))
    ),
    pageParams: old?.pageParams ?? []
  }))
}

/**
 * Debounce is keyed by card id so concurrent edits to different cards don't
 * supersede each other. Superseded calls resolve with undefined.
 *
 * `onMutate` optimistically patches the cached card synchronously (before the
 * debounce fires) so view mode and the next save's merge base reflect the edit
 * immediately. This is a local cache write, not a refetch — it can't fight the
 * component-owned editor state the way a self-triggered `invalidate` would.
 * Bulk ops (delete, move, deck change) still invalidate explicitly.
 */
export function useSaveCardMutation() {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: ({ card, values }: SaveCardVars) =>
      debounce(() => saveCard(card, values), { key: `card-${card.id}` }),
    onMutate: ({ card, values }: SaveCardVars) => {
      patchCardInDeckCache(queryCache, card, values)
    },
    onSettled: () => {
      invalidateCardIndex(queryCache)
    }
  })
}
