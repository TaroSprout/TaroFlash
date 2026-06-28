import { useMutation, useQueryCache } from '@pinia/colada'
import { debounce } from '@/utils/debounce'
import { saveCard } from '../db'
import { invalidateCardIndex } from './_invalidate'

type QueryCache = ReturnType<typeof useQueryCache>

type SaveCardVars = {
  card: Card
  values: Partial<Card>
}

/**
 * Optimistically merge `values` into the matching card across ALL of the deck's
 * cached views (default sort, any active filter, any active sort). Uses a key
 * prefix so the patch lands regardless of which sort_by / query is currently
 * active in the cache.
 */
function patchCardInDeckCache(queryCache: QueryCache, card: Card, values: Partial<Card>) {
  if (card.deck_id === undefined || card.id === undefined) return

  queryCache.setQueriesData<{ pages: Card[][]; pageParams: unknown[] }>(
    { key: ['cards', card.deck_id, 'pages'] },
    (old) => ({
      pages: (old?.pages ?? []).map((page) =>
        page.map((c) => (c.id === card.id ? { ...c, ...values } : c))
      ),
      pageParams: old?.pageParams ?? []
    })
  )
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
