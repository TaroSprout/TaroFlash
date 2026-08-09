import { useMutation, useQueryCache } from '@pinia/colada'
import { debounce } from '@/utils/debounce'
import { saveCard, type CardsPage } from '../db'
import { invalidateCardIndex } from './_invalidate'

type QueryCache = ReturnType<typeof useQueryCache>

type SaveCardVars = {
  card: Card
  values: Partial<Card>
}

/**
 * Writes an edit straight into the card wherever it's already been loaded —
 * every sort and every search the member has looked at, not just the one on screen.
 */
function patchCardInDeckCache(queryCache: QueryCache, card: Card, values: Partial<Card>) {
  if (card.deck_id === undefined || card.id === undefined) return

  queryCache.setQueriesData<{ pages: CardsPage[]; pageParams: unknown[] }>(
    { key: ['cards', card.deck_id, 'pages'] },
    (old) => ({
      pages: (old?.pages ?? []).map((page) => ({
        ...page,
        cards: page.cards.map((c) => (c.id === card.id ? { ...c, ...values } : c))
      })),
      pageParams: old?.pageParams ?? []
    })
  )
}

/**
 * Saves an edited card, one save per card no matter how fast the typing.
 *
 * The edit lands in the loaded copy straight away rather than being re-fetched,
 * so it can't fight the editor the member is still typing in.
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
