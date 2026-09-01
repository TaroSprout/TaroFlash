import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const { useMutationSpy, useQueryCacheSpy, invalidateSpy, saveReviewMock } = vi.hoisted(() => ({
  useMutationSpy: vi.fn((cfg) => cfg),
  useQueryCacheSpy: vi.fn(() => ({ invalidateQueries: invalidateSpy })),
  invalidateSpy: vi.fn(),
  saveReviewMock: vi.fn().mockResolvedValue(undefined)
}))

vi.mock('@pinia/colada', () => ({
  useMutation: useMutationSpy,
  useQueryCache: useQueryCacheSpy
}))

vi.mock('@/api/reviews/db', () => ({
  saveReview: saveReviewMock
}))

import { useSaveReviewMutation, useFlushDeckReviews } from '@/api/reviews/mutations/save'

beforeEach(() => {
  useMutationSpy.mockClear()
  useQueryCacheSpy.mockClear()
  invalidateSpy.mockClear()
  saveReviewMock.mockClear()
  saveReviewMock.mockResolvedValue(undefined)
})

function configFrom(hook) {
  hook()
  return useMutationSpy.mock.calls[0][0]
}

describe('useSaveReviewMutation', () => {
  test('mutation delegates to saveReview with card_id, card, log (deck_id is not persisted)', async () => {
    const { mutation } = configFrom(useSaveReviewMutation)

    const vars = {
      card_id: 42,
      deck_id: 7,
      card: { due: 'x', stability: 1 },
      log: { rating: 3 }
    }
    await mutation(vars)

    expect(saveReviewMock).toHaveBeenCalledWith(42, vars.card, vars.log)
    expect(saveReviewMock).toHaveBeenCalledTimes(1)
  })

  // Cache invalidation now lives entirely in useFlushDeckReviews, fired once
  // per deck at session summary — a per-review onSettled here would refetch
  // the deck list on every rating instead of once per session.
  test('does not touch the query cache at all — no onSettled, no useQueryCache call', () => {
    const config = configFrom(useSaveReviewMutation)

    expect(config.onSettled).toBeUndefined()
    expect(useQueryCacheSpy).not.toHaveBeenCalled()
    expect(invalidateSpy).not.toHaveBeenCalled()
  })
})

describe('useFlushDeckReviews', () => {
  // ['decks'] is the newly added key — it's what the dashboard's due counts read.
  // exact: true keeps it off ['decks', 'count'], which no review can ever change.
  test('invalidates ["deck", deck_id] and ["cards", deck_id] per deck, and ["decks"] exactly once', () => {
    const flush = useFlushDeckReviews()

    flush([7, 9])

    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['deck', 7] })
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['cards', 7] })
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['deck', 9] })
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['cards', 9] })
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['decks'], exact: true })
    expect(invalidateSpy).toHaveBeenCalledTimes(5)
  })
})
