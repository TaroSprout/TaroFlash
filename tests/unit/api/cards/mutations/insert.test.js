import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const {
  useMutationSpy,
  insertCardMock,
  invalidateDeckMock,
  invalidateAllCardCountsMock,
  invalidateCardIndexMock,
  queryCache
} = vi.hoisted(() => ({
  useMutationSpy: vi.fn((cfg) => cfg),
  insertCardMock: vi.fn(),
  invalidateDeckMock: vi.fn(),
  invalidateAllCardCountsMock: vi.fn(),
  invalidateCardIndexMock: vi.fn(),
  queryCache: { the: 'cache' }
}))

vi.mock('@pinia/colada', () => ({
  useMutation: useMutationSpy,
  useQueryCache: () => queryCache
}))

vi.mock('@/api/cards/db', () => ({
  insertCard: insertCardMock
}))

vi.mock('@/api/cards/mutations/_invalidate', () => ({
  invalidateDeck: invalidateDeckMock,
  invalidateAllCardCounts: invalidateAllCardCountsMock,
  invalidateCardIndex: invalidateCardIndexMock
}))

import { useInsertCardMutation } from '@/api/cards/mutations/insert'

beforeEach(() => {
  useMutationSpy.mockClear()
  insertCardMock.mockClear()
  invalidateDeckMock.mockClear()
  invalidateAllCardCountsMock.mockClear()
  invalidateCardIndexMock.mockClear()
})

function configFrom() {
  useInsertCardMutation()
  return useMutationSpy.mock.calls[0][0]
}

describe('useInsertCardMutation', () => {
  test('mutation delegates to insertCard with the given params', async () => {
    const { mutation } = configFrom()
    const params = { deck_id: 10, rank: 'a0', front_text: 'Q', back_text: 'A' }
    insertCardMock.mockResolvedValueOnce({ id: 1, rank: 'a0' })

    await mutation(params)

    expect(insertCardMock).toHaveBeenCalledWith(params)
  })

  // a blank eager insert (empty front + back) skips the card-pages
  // refetch — the row is already on screen via promoteTemp — and skips the
  // card-index invalidation, since an empty front indexes nothing.
  describe('onSettled — blank insert (eager create)', () => {
    test('skips the deck card-pages invalidation', () => {
      const { onSettled } = configFrom()
      const params = { deck_id: 10, rank: 'a0', front_text: '', back_text: '' }

      onSettled(undefined, undefined, params)

      expect(invalidateDeckMock).toHaveBeenCalledWith(queryCache, 10, { card_pages: false })
    })

    test('skips the card-index invalidation', () => {
      const { onSettled } = configFrom()
      const params = { deck_id: 10, rank: 'a0', front_text: '', back_text: '' }

      onSettled(undefined, undefined, params)

      expect(invalidateCardIndexMock).not.toHaveBeenCalled()
    })

    test('still invalidates the member-wide card counts', () => {
      const { onSettled } = configFrom()
      const params = { deck_id: 10, rank: 'a0', front_text: '', back_text: '' }

      onSettled(undefined, undefined, params)

      expect(invalidateAllCardCountsMock).toHaveBeenCalledWith(queryCache)
    })

    test('treats undefined front/back text the same as empty strings', () => {
      const { onSettled } = configFrom()
      const params = { deck_id: 10, rank: 'a0' }

      onSettled(undefined, undefined, params)

      expect(invalidateDeckMock).toHaveBeenCalledWith(queryCache, 10, { card_pages: false })
      expect(invalidateCardIndexMock).not.toHaveBeenCalled()
    })
  })

  // an insert carrying text — the audio-reader add-card panel, or
  // a re-insert after a failed eager save — has no row already on screen and
  // genuinely needs both refetches.
  describe('onSettled — insert carrying text', () => {
    test('refetches the deck card pages when front_text is present', () => {
      const { onSettled } = configFrom()
      const params = { deck_id: 10, rank: 'a0', front_text: 'Q', back_text: '' }

      onSettled(undefined, undefined, params)

      expect(invalidateDeckMock).toHaveBeenCalledWith(queryCache, 10, { card_pages: true })
    })

    test('invalidates the card index when front_text is present', () => {
      const { onSettled } = configFrom()
      const params = { deck_id: 10, rank: 'a0', front_text: 'Q', back_text: '' }

      onSettled(undefined, undefined, params)

      expect(invalidateCardIndexMock).toHaveBeenCalledWith(queryCache)
    })

    test('refetches the deck card pages when only back_text is present', () => {
      const { onSettled } = configFrom()
      const params = { deck_id: 10, rank: 'a0', front_text: '', back_text: 'A' }

      onSettled(undefined, undefined, params)

      expect(invalidateDeckMock).toHaveBeenCalledWith(queryCache, 10, { card_pages: true })
    })

    test('does not invalidate the card index when only back_text is present (index keys on front)', () => {
      const { onSettled } = configFrom()
      const params = { deck_id: 10, rank: 'a0', front_text: '', back_text: 'A' }

      onSettled(undefined, undefined, params)

      expect(invalidateCardIndexMock).not.toHaveBeenCalled()
    })
  })
})
