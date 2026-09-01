// Regression coverage for the shared ['decks', 'count'] cache entry: Pinia
// Colada keys query options per cache entry, not per useQuery call site, so
// a second reader mounted with different options overwrites the first
// reader's — this only shows up once both call sites exist together.
// →[K:shared-cache-entry-options-last-mount-wins]
import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { PiniaColada, useQueryCache } from '@pinia/colada'
import { flushPromises } from '@vue/test-utils'

const { fetchMemberDeckCountMock, upsertDeckMock, deckLimit } = vi.hoisted(() => ({
  fetchMemberDeckCountMock: vi.fn(),
  upsertDeckMock: vi.fn().mockResolvedValue({ id: 42, title: 'brand new' }),
  deckLimit: { value: null }
}))

vi.mock('@/api/decks/db', () => ({
  fetchMemberDeckCount: fetchMemberDeckCountMock,
  upsertDeck: upsertDeckMock
}))

vi.mock('@/stores/member', () => ({
  useMemberStore: () => ({
    get deck_limit() {
      return deckLimit.value
    }
  })
}))

import { useMemberDeckCountQuery } from '@/api/decks/queries/count'
import { useUpsertDeckMutation, DeckLimitError } from '@/api/decks/mutations/upsert'

/**
 * Hosts the live reader and the mutation's re-check in the same Pinia Colada
 * cache, the way a rendered app would — deck settings/dashboard mounts the
 * former while it's open, and a create runs the latter against the same
 * ['decks', 'count'] entry.
 */
function mountBothReaders() {
  let live_reader, upsert_mutation, query_cache
  const app = createApp({
    setup() {
      live_reader = useMemberDeckCountQuery()
      upsert_mutation = useUpsertDeckMutation()
      query_cache = useQueryCache()
      return () => null
    }
  })
  app.use(createPinia())
  app.use(PiniaColada)
  app.mount(document.createElement('div'))
  return { app, live_reader, upsert_mutation, query_cache }
}

beforeEach(() => {
  fetchMemberDeckCountMock.mockReset()
  upsertDeckMock.mockClear()
  deckLimit.value = null
})

describe('shared ["decks", "count"] cache entry', () => {
  // The regression itself: mounting the mutation's own
  // useMemberDeckCountQuery(false) for the re-check used to overwrite the
  // live reader's options on the shared entry with a permanently-disabled
  // query, so an invalidation could never bring it back — a member who
  // deleted decks to get under the cap was still refused a create. A test
  // exercising the count query alone can't see this: it only appears once
  // both call sites share the one cache entry.
  test('an invalidation still refetches the live count after the mutation has run its re-check', async () => {
    fetchMemberDeckCountMock.mockResolvedValue(0)
    const { app, live_reader, query_cache } = mountBothReaders()
    await flushPromises()
    expect(live_reader.data.value).toBe(0)
    expect(fetchMemberDeckCountMock).toHaveBeenCalledTimes(1)

    await query_cache.invalidateQueries({ key: ['decks', 'count'] })
    await flushPromises()

    expect(fetchMemberDeckCountMock).toHaveBeenCalledTimes(2)
    expect(live_reader.data.value).toBe(0)

    app.unmount()
  })

  // Once the member deletes decks and the count entry is
  // invalidated back under the cap, a subsequent create must be allowed —
  // the exact user-facing symptom this branch's fix restores.
  test('a create is allowed once deletions bring the member back under the cap', async () => {
    deckLimit.value = 1
    fetchMemberDeckCountMock.mockResolvedValue(1) // at cap
    const { app, upsert_mutation, query_cache } = mountBothReaders()
    await flushPromises()

    await expect(upsert_mutation.mutateAsync({ title: 'brand new' })).rejects.toBeInstanceOf(
      DeckLimitError
    )
    expect(upsertDeckMock).not.toHaveBeenCalled()

    // Deletions drop the member's count; the deletion mutation's own
    // onSettled invalidates ['decks', 'count'] in the real app — simulate
    // that here and let the fresh fetch land.
    fetchMemberDeckCountMock.mockResolvedValue(0)
    await query_cache.invalidateQueries({ key: ['decks', 'count'] })
    await flushPromises()

    await expect(upsert_mutation.mutateAsync({ title: 'second deck' })).resolves.toEqual({
      id: 42,
      title: 'brand new'
    })
    expect(upsertDeckMock).toHaveBeenCalledWith({ title: 'second deck' })

    app.unmount()
  })

  // The create-time refusal must be driven by a live count, not
  // whatever the live reader happened to cache before the limit rose.
  test('a create is refused off a freshly fetched count, not a stale cached one', async () => {
    deckLimit.value = 2
    fetchMemberDeckCountMock.mockResolvedValue(0)
    const { app, live_reader, upsert_mutation } = mountBothReaders()
    await flushPromises()
    expect(live_reader.data.value).toBe(0)

    // Server-side count has since risen to the cap; `fetch()` in the
    // mutation always goes to the network, so the second call reflects it.
    fetchMemberDeckCountMock.mockResolvedValue(2)

    await expect(upsert_mutation.mutateAsync({ title: 'over the limit' })).rejects.toBeInstanceOf(
      DeckLimitError
    )
    expect(fetchMemberDeckCountMock).toHaveBeenCalledTimes(2)

    app.unmount()
  })
})
