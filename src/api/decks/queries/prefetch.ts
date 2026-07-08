import { useQueryCache } from '@pinia/colada'
import { fetchMemberDecks } from '../db'

export function prefetchMemberDecks() {
  const cache = useQueryCache()
  const entry = cache.ensure({ key: ['decks'], query: fetchMemberDecks })
  // refresh(), not fetch() — reuses an in-flight request/skips a fresh one
  // instead of unconditionally aborting and restarting it.
  return cache.refresh(entry)
}
