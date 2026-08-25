import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const {
  useMutationSpy,
  invalidateSpy,
  upsertDeckMock,
  deleteDeckMock,
  refreshMock,
  deckCountData,
  deckLimit,
  getQueryDataMock,
  setQueryDataMock,
  useMemberDeckCountQuerySpy
} = vi.hoisted(() => {
  const refreshMock = vi.fn().mockResolvedValue(undefined)
  const deckCountData = { value: 0 }
  return {
    useMutationSpy: vi.fn((cfg) => cfg),
    invalidateSpy: vi.fn(),
    upsertDeckMock: vi.fn().mockResolvedValue(undefined),
    deleteDeckMock: vi.fn().mockResolvedValue(undefined),
    refreshMock,
    deckCountData,
    deckLimit: { value: null },
    getQueryDataMock: vi.fn(),
    setQueryDataMock: vi.fn(),
    useMemberDeckCountQuerySpy: vi.fn(() => ({ refresh: refreshMock, data: deckCountData }))
  }
})

vi.mock('@pinia/colada', () => ({
  useMutation: useMutationSpy,
  useQueryCache: () => ({
    invalidateQueries: invalidateSpy,
    getQueryData: getQueryDataMock,
    setQueryData: setQueryDataMock
  })
}))

vi.mock('@/api/decks/db', () => ({
  upsertDeck: upsertDeckMock,
  deleteDeck: deleteDeckMock
}))

vi.mock('@/api/decks/queries/count', () => ({
  useMemberDeckCountQuery: useMemberDeckCountQuerySpy
}))

vi.mock('@/stores/member', () => ({
  // Pinia unwraps a store's computed refs, so the real `member.deck_limit`
  // reads a plain value, not a ref — mirror that here with a getter.
  useMemberStore: () => ({
    get deck_limit() {
      return deckLimit.value
    }
  })
}))

import { useUpsertDeckMutation, DeckLimitError } from '@/api/decks/mutations/upsert'
import { useDeleteDeckMutation } from '@/api/decks/mutations/delete'

beforeEach(() => {
  useMutationSpy.mockClear()
  invalidateSpy.mockClear()
  upsertDeckMock.mockClear()
  deleteDeckMock.mockClear()
  refreshMock.mockClear()
  useMemberDeckCountQuerySpy.mockClear()
  getQueryDataMock.mockReset()
  setQueryDataMock.mockReset()
  deckCountData.value = 0
  deckLimit.value = null
})

function configFrom(hook) {
  hook()
  return useMutationSpy.mock.calls.at(-1)[0]
}

describe('useUpsertDeckMutation', () => {
  // [obligation] useDeckEditor calls useUpsertDeckMutation() unconditionally,
  // for both an existing deck's edit and a new deck's create. Passing
  // `false` here is what keeps that mount from auto-fetching the deck count
  // (see queries.test.js's `enabled param` suite for the false → no-fetch
  // proof at the query layer) — the create-only limit check still runs it
  // explicitly below via `.refresh()`.
  test('instantiates useMemberDeckCountQuery with enabled=false [obligation]', () => {
    configFrom(useUpsertDeckMutation)
    expect(useMemberDeckCountQuerySpy).toHaveBeenCalledWith(false)
  })

  test('mutation delegates to upsertDeck for an update (id present), skipping the count refresh', async () => {
    const { mutation } = configFrom(useUpsertDeckMutation)
    await mutation({ id: 1, title: 'new' })
    expect(upsertDeckMock).toHaveBeenCalledWith({ id: 1, title: 'new' })
    expect(refreshMock).not.toHaveBeenCalled()
  })

  test('the deck payload handed to upsertDeck carries no pending or client_key field [obligation]', async () => {
    const { mutation } = configFrom(useUpsertDeckMutation)
    const deck = { id: 1, title: 'new' }
    await mutation(deck)
    const sent = upsertDeckMock.mock.calls.at(-1)[0]
    expect(sent).not.toHaveProperty('pending')
    expect(sent).not.toHaveProperty('client_key')
  })

  describe('deck-limit re-check on create', () => {
    test('awaits deck_count_query.refresh() before writing, only when deck.id is undefined', async () => {
      const { mutation } = configFrom(useUpsertDeckMutation)
      await mutation({ title: 'brand new' })
      expect(refreshMock).toHaveBeenCalledTimes(1)
      expect(upsertDeckMock).toHaveBeenCalledWith({ title: 'brand new' })
    })

    test('throws DeckLimitError when the member is at or over a non-null limit', async () => {
      deckLimit.value = 5
      deckCountData.value = 5
      const { mutation } = configFrom(useUpsertDeckMutation)

      await expect(mutation({ title: 'brand new' })).rejects.toBeInstanceOf(DeckLimitError)
      expect(upsertDeckMock).not.toHaveBeenCalled()
    })

    test('throws when the count is already over the limit', async () => {
      deckLimit.value = 5
      deckCountData.value = 9
      const { mutation } = configFrom(useUpsertDeckMutation)

      await expect(mutation({ title: 'brand new' })).rejects.toBeInstanceOf(DeckLimitError)
    })

    test('does not throw when under the limit', async () => {
      deckLimit.value = 5
      deckCountData.value = 4
      const { mutation } = configFrom(useUpsertDeckMutation)

      await expect(mutation({ title: 'brand new' })).resolves.toBeUndefined()
      expect(upsertDeckMock).toHaveBeenCalledWith({ title: 'brand new' })
    })

    test('a null limit (unlimited) never throws, whatever the count [obligation]', async () => {
      deckLimit.value = null
      deckCountData.value = 999
      const { mutation } = configFrom(useUpsertDeckMutation)

      await expect(mutation({ title: 'brand new' })).resolves.toBeUndefined()
    })

    test('an update (id defined) skips the re-check entirely, even over the limit [obligation]', async () => {
      deckLimit.value = 1
      deckCountData.value = 99
      const { mutation } = configFrom(useUpsertDeckMutation)

      await expect(mutation({ id: 3, title: 'existing' })).resolves.toBeUndefined()
      expect(refreshMock).not.toHaveBeenCalled()
    })
  })

  describe('onMutate — pending insert', () => {
    test('inserts a pending row into the ["decks"] cache only when deck.id is undefined [obligation]', () => {
      getQueryDataMock.mockReturnValue([{ id: 1, title: 'existing' }])
      const { onMutate } = configFrom(useUpsertDeckMutation)

      const { client_key } = onMutate({ title: 'brand new' })

      expect(typeof client_key).toBe('string')
      expect(setQueryDataMock).toHaveBeenCalledWith(
        ['decks'],
        expect.arrayContaining([
          { id: 1, title: 'existing' },
          expect.objectContaining({ title: 'brand new', pending: true, client_key })
        ])
      )
    })

    test('an update (deck.id present) inserts nothing and returns no client_key [obligation]', () => {
      const { onMutate } = configFrom(useUpsertDeckMutation)

      const { client_key } = onMutate({ id: 7, title: 'existing' })

      expect(client_key).toBeUndefined()
      expect(setQueryDataMock).not.toHaveBeenCalled()
    })

    test('the pending row gets a unique negative temp id, decrementing across concurrent creates [obligation]', () => {
      getQueryDataMock.mockReturnValue([])
      const { onMutate } = configFrom(useUpsertDeckMutation)

      onMutate({ title: 'first' })
      const first_pending = setQueryDataMock.mock.calls[0][1].at(-1)

      onMutate({ title: 'second' })
      const second_pending = setQueryDataMock.mock.calls[1][1].at(-1)

      expect(first_pending.id).toBeLessThan(0)
      expect(second_pending.id).toBeLessThan(0)
      expect(first_pending.id).not.toBe(second_pending.id)
    })

    test('falls back to an empty list when the cache holds nothing yet', () => {
      getQueryDataMock.mockReturnValue(undefined)
      const { onMutate } = configFrom(useUpsertDeckMutation)

      onMutate({ title: 'first' })

      expect(setQueryDataMock).toHaveBeenCalledWith(
        ['decks'],
        expect.arrayContaining([expect.objectContaining({ title: 'first', pending: true })])
      )
    })
  })

  describe('onSuccess — confirm pending row', () => {
    test('replaces the pending row in place, preserving its client_key [obligation]', () => {
      const client_key = 'pending-key-1'
      getQueryDataMock.mockReturnValue([
        { id: -1, title: 'brand new', pending: true, client_key },
        { id: 2, title: 'other' }
      ])
      const { onSuccess } = configFrom(useUpsertDeckMutation)

      onSuccess({ id: 42, title: 'brand new' }, { title: 'brand new' }, { client_key })

      expect(setQueryDataMock).toHaveBeenCalledWith(
        ['decks'],
        [
          { id: 42, title: 'brand new', client_key },
          { id: 2, title: 'other' }
        ]
      )
    })

    test('does nothing when client_key is undefined (update path) [obligation]', () => {
      const { onSuccess } = configFrom(useUpsertDeckMutation)
      onSuccess(
        { id: 42, title: 'updated' },
        { id: 42, title: 'updated' },
        { client_key: undefined }
      )
      expect(setQueryDataMock).not.toHaveBeenCalled()
    })

    test('does nothing when the cache holds no list at all', () => {
      getQueryDataMock.mockReturnValue(undefined)
      const { onSuccess } = configFrom(useUpsertDeckMutation)
      onSuccess({ id: 42, title: 'brand new' }, { title: 'brand new' }, { client_key: 'some-key' })
      expect(setQueryDataMock).not.toHaveBeenCalled()
    })
  })

  describe('onError — rollback pending row', () => {
    test('removes the pending row when client_key is present [obligation]', () => {
      const client_key = 'pending-key-2'
      getQueryDataMock.mockReturnValue([
        { id: -1, title: 'brand new', pending: true, client_key },
        { id: 2, title: 'other' }
      ])
      const { onError } = configFrom(useUpsertDeckMutation)

      onError(new Error('boom'), { title: 'brand new' }, { client_key })

      expect(setQueryDataMock).toHaveBeenCalledWith(['decks'], [{ id: 2, title: 'other' }])
    })

    test('does nothing when client_key is undefined (update path) [obligation]', () => {
      const { onError } = configFrom(useUpsertDeckMutation)
      onError(new Error('boom'), { id: 2, title: 'x' }, { client_key: undefined })
      expect(setQueryDataMock).not.toHaveBeenCalled()
    })

    test('does nothing when the cache holds no list at all', () => {
      getQueryDataMock.mockReturnValue(undefined)
      const { onError } = configFrom(useUpsertDeckMutation)
      onError(new Error('boom'), { title: 'brand new' }, { client_key: 'some-key' })
      expect(setQueryDataMock).not.toHaveBeenCalled()
    })
  })

  test('onSettled invalidates ["decks"] so the dashboard list refreshes', () => {
    const { onSettled } = configFrom(useUpsertDeckMutation)
    onSettled(undefined, undefined, { id: 42, title: 'x' })
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['decks'] })
  })

  test('onSettled invalidates ["deck", id] so the detail view refreshes when it exists', () => {
    const { onSettled } = configFrom(useUpsertDeckMutation)
    onSettled(undefined, undefined, { id: 42, title: 'x' })
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['deck', 42] })
  })

  test('onSettled skips ["deck", id] invalidation when the deck has no id (insert path)', () => {
    const { onSettled } = configFrom(useUpsertDeckMutation)
    onSettled(undefined, undefined, { title: 'brand new' })
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['decks'] })
    const detailCalls = invalidateSpy.mock.calls.filter((c) => c[0].key[0] === 'deck')
    expect(detailCalls).toHaveLength(0)
  })

  test('onSettled skips both invalidations on a failed create — nothing changed server-side [obligation]', () => {
    const { onSettled } = configFrom(useUpsertDeckMutation)
    onSettled(undefined, new Error('boom'), { title: 'x' })
    expect(invalidateSpy).not.toHaveBeenCalled()
  })

  test('onSettled skips both invalidations on a failed update, including ["deck", id] [obligation]', () => {
    const { onSettled } = configFrom(useUpsertDeckMutation)
    onSettled(undefined, new Error('boom'), { id: 1, title: 'x' })
    expect(invalidateSpy).not.toHaveBeenCalled()
  })
})

describe('useDeleteDeckMutation', () => {
  test('mutation delegates to deleteDeck with the id', async () => {
    const { mutation } = configFrom(useDeleteDeckMutation)
    await mutation(42)
    expect(deleteDeckMock).toHaveBeenCalledWith(42)
  })

  test('onSettled invalidates ["decks"] so the dashboard list refreshes', () => {
    const { onSettled } = configFrom(useDeleteDeckMutation)
    onSettled(undefined, undefined, 42)
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['decks'] })
  })

  test('on success, invalidates ["deck", id] with refetchActive=false so no 404 refetch', () => {
    const { onSettled } = configFrom(useDeleteDeckMutation)
    onSettled(undefined, undefined, 42)
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['deck', 42] }, false)
  })

  test('on error, skips ["deck", id] invalidation (row still exists, keep cache)', () => {
    const { onSettled } = configFrom(useDeleteDeckMutation)
    onSettled(undefined, new Error('boom'), 42)
    const detailCalls = invalidateSpy.mock.calls.filter((c) => c[0].key[0] === 'deck')
    expect(detailCalls).toHaveLength(0)
    // List invalidation still fires regardless — harmless on error
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['decks'] })
  })
})
