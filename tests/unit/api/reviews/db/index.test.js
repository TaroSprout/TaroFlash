import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  rpcMock: vi.fn()
}))

vi.mock('@/supabase-client', () => ({
  supabase: {
    rpc: mocks.rpcMock
  }
}))

vi.mock('@/utils/logger', () => ({ default: { error: vi.fn() } }))

import { saveReview, resetDeckReviews } from '@/api/reviews/db'

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mocks.rpcMock.mockReset()
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeCard(overrides = {}) {
  return {
    due: '2026-07-08T00:00:00.000Z',
    stability: 2.5,
    difficulty: 5,
    elapsed_days: 1,
    scheduled_days: 3,
    reps: 4,
    lapses: 0,
    last_review: '2026-07-06T00:00:00.000Z',
    state: 2,
    learning_steps: 1,
    ...overrides
  }
}

function makeLog(overrides = {}) {
  return {
    rating: 3,
    state: 1,
    due: '2026-07-08T00:00:00.000Z',
    stability: 2.5,
    difficulty: 5,
    scheduled_days: 3,
    review: '2026-07-07T00:00:00.000Z',
    ...overrides
  }
}

// ── saveReview ────────────────────────────────────────────────────────────────

describe('saveReview', () => {
  test('calls save_review RPC with p_card_id and the card state fields', async () => {
    mocks.rpcMock.mockResolvedValue({ error: null })
    const card = makeCard()
    const log = makeLog()

    await saveReview(42, card, log)

    expect(mocks.rpcMock).toHaveBeenCalledWith(
      'save_review',
      expect.objectContaining({
        p_card_id: 42,
        p_card: expect.objectContaining({
          due: card.due,
          stability: card.stability,
          difficulty: card.difficulty,
          elapsed_days: card.elapsed_days,
          scheduled_days: card.scheduled_days,
          reps: card.reps,
          lapses: card.lapses,
          state: card.state
        })
      })
    )
  })

  test('passes learning_steps under p_card sourced from card.learning_steps [obligation]', async () => {
    // Persists ts-fsrs's learning_steps step-index so a card resuming mid
    // learning/relearning sequence doesn't silently restart at step 0.
    mocks.rpcMock.mockResolvedValue({ error: null })
    const card = makeCard({ learning_steps: 2 })
    const log = makeLog()

    await saveReview(42, card, log)

    expect(mocks.rpcMock).toHaveBeenCalledWith(
      'save_review',
      expect.objectContaining({ p_card: expect.objectContaining({ learning_steps: 2 }) })
    )
  })

  test('falls back to null for p_last_review when the card has never been reviewed', async () => {
    mocks.rpcMock.mockResolvedValue({ error: null })
    const card = makeCard({ last_review: undefined })
    const log = makeLog()

    await saveReview(42, card, log)

    expect(mocks.rpcMock).toHaveBeenCalledWith(
      'save_review',
      expect.objectContaining({ p_card: expect.objectContaining({ last_review: null }) })
    )
  })

  test('passes the review-log fields under p_log', async () => {
    mocks.rpcMock.mockResolvedValue({ error: null })
    const card = makeCard()
    const log = makeLog({ rating: 4, state: 2 })

    await saveReview(42, card, log)

    expect(mocks.rpcMock).toHaveBeenCalledWith(
      'save_review',
      expect.objectContaining({
        p_log: expect.objectContaining({
          rating: 4,
          state: 2,
          due: log.due,
          stability: log.stability,
          difficulty: log.difficulty,
          scheduled_days: log.scheduled_days,
          review: log.review
        })
      })
    )
  })

  test('resolves without throwing when the RPC succeeds', async () => {
    mocks.rpcMock.mockResolvedValue({ error: null })
    await expect(saveReview(1, makeCard(), makeLog())).resolves.toBeUndefined()
  })

  test('logs and throws when the RPC returns an error', async () => {
    mocks.rpcMock.mockResolvedValue({ error: { message: 'boom' } })
    await expect(saveReview(1, makeCard(), makeLog())).rejects.toThrow('boom')
  })
})

// ── resetDeckReviews ──────────────────────────────────────────────────────────

describe('resetDeckReviews', () => {
  test('calls reset_deck_reviews RPC with p_deck_id', async () => {
    mocks.rpcMock.mockResolvedValue({ error: null })
    await resetDeckReviews(7)
    expect(mocks.rpcMock).toHaveBeenCalledWith('reset_deck_reviews', { p_deck_id: 7 })
  })

  test('resolves without throwing when the RPC succeeds', async () => {
    mocks.rpcMock.mockResolvedValue({ error: null })
    await expect(resetDeckReviews(7)).resolves.toBeUndefined()
  })

  test('logs and throws when the RPC returns an error', async () => {
    mocks.rpcMock.mockResolvedValue({ error: { message: 'nope' } })
    await expect(resetDeckReviews(7)).rejects.toThrow('nope')
  })
})
