import { useMutation, useQueryCache } from '@pinia/colada'
import { upsertDeck } from '../db'
import { MEMBER_DECK_COUNT_QUERY } from '../queries/count'
import { useMemberStore } from '@/stores/member'

type QueryCache = ReturnType<typeof useQueryCache>

/** Thrown when the deck-limit re-check (run right before the write) finds the
 * member is actually over their plan's cap — distinguishes a limit refusal
 * from an ordinary write failure so the caller can show the limit alert
 * instead of the generic error toast. */
export class DeckLimitError extends Error {}

let temp_id_counter = 0

/**
 * Inserts a not-yet-saved deck into the cached list, dimmed and unopenable
 * until the write confirms. Only for a create (`deck.id` is unset) — an
 * update leaves the cache alone until `onSettled` invalidates it. Returns the
 * `client_key` the pending row was inserted under, so it can be found again.
 */
function insertPendingDeck(queryCache: QueryCache, deck: Deck): string | undefined {
  if (deck.id !== undefined) return undefined

  const current = queryCache.getQueryData(['decks']) as Deck[] | undefined
  const client_key = crypto.randomUUID()
  const pending: Deck = { ...deck, id: --temp_id_counter, pending: true, client_key }

  queryCache.setQueryData(['decks'], [...(current ?? []), pending])

  return client_key
}

/** Replaces the pending row with the confirmed deck, keeping `client_key` so
 * the grid doesn't re-key it and replay the pop-in. */
function confirmPendingDeck(queryCache: QueryCache, client_key: string, deck: Deck) {
  const current = queryCache.getQueryData(['decks']) as Deck[] | undefined
  if (!current) return

  queryCache.setQueryData(
    ['decks'],
    current.map((d) => (d.client_key === client_key ? { ...deck, client_key } : d))
  )
}

/** Drops the pending row — a failed create, or the limit re-check pulling it back. */
function removePendingDeck(queryCache: QueryCache, client_key: string) {
  const current = queryCache.getQueryData(['decks']) as Deck[] | undefined
  if (!current) return

  queryCache.setQueryData(
    ['decks'],
    current.filter((d) => d.client_key !== client_key)
  )
}

export function useUpsertDeckMutation() {
  const queryCache = useQueryCache()
  const member = useMemberStore()

  return useMutation({
    mutation: async (deck: Deck) => {
      if (deck.id === undefined) {
        // Reach the entry through the cache: mounting a query here would overwrite the live reader's options.
        const count_entry = queryCache.ensure(MEMBER_DECK_COUNT_QUERY)
        await queryCache.fetch(count_entry)
        // Mirrors useCan().createDeck — duplicated rather than imported, since
        // that composable pulls in this module's own barrel. →[K:decks-barrel-cycle-drops-runtime-exports]
        const limit = member.deck_limit
        const count = count_entry.state.value.data ?? 0
        if (limit !== null && count >= limit) throw new DeckLimitError()
      }

      return upsertDeck(deck)
    },
    onMutate: (deck: Deck) => ({ client_key: insertPendingDeck(queryCache, deck) }),
    onSuccess: (created, _deck, { client_key }) => {
      if (client_key) confirmPendingDeck(queryCache, client_key, created)
    },
    onError: (_error, _deck, { client_key }) => {
      if (client_key) removePendingDeck(queryCache, client_key)
    },
    onSettled: (_data, error, deck) => {
      // Nothing landed server-side and onError already rolled back, so a refetch only doubles the toast.
      if (error) return

      queryCache.invalidateQueries({ key: ['decks'] })
      if (deck.id !== undefined) queryCache.invalidateQueries({ key: ['deck', deck.id] })
    }
  })
}
