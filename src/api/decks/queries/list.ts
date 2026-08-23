import { useQuery, useQueryCache } from '@pinia/colada'
import { fetchMemberDecks } from '../db'

export function useMemberDecksQuery() {
  const queryCache = useQueryCache()

  return useQuery({
    key: ['decks'],
    query: async () => {
      const fresh = await fetchMemberDecks()

      // Carries a confirmed create's `client_key` forward across this refetch —
      // otherwise the freshly-fetched row (which never carries one) re-keys the
      // grid item and replays its pop-in the moment this query settles.
      const previous = queryCache.getQueryData(['decks']) as Deck[] | undefined
      const keys = new Map(
        (previous ?? []).filter((d) => d.client_key).map((d) => [d.id, d.client_key])
      )
      if (keys.size === 0) return fresh

      return fresh.map((d) => (keys.has(d.id) ? { ...d, client_key: keys.get(d.id) } : d))
    }
  })
}
