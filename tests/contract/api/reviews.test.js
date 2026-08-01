import { describe, test, expect, beforeEach, afterEach } from 'vite-plus/test'
import { signInAsTestUser } from '../setup.js'
import { createDeck, insertCardDirect } from '../fixtures.js'
import { saveReview, resetDeckReviews } from '@/api/reviews/db'

let session

beforeEach(async () => {
  session = await signInAsTestUser()
})

afterEach(async () => {
  await session?.cleanup()
  session = null
})

describe('saveReview (contract)', () => {
  test('writes the review row and review_logs entry for the card', async () => {
    const deck = await createDeck(session.client, session.userId)
    const card = await insertCardDirect(session.client, deck.id)

    const now = new Date()
    const card_state = {
      due: new Date(now.getTime() + 86_400_000).toISOString(),
      stability: 1.5,
      difficulty: 5,
      elapsed_days: 0,
      scheduled_days: 1,
      reps: 1,
      lapses: 0,
      last_review: now.toISOString(),
      state: 1
    }
    const log = {
      rating: 3,
      state: 1,
      due: card_state.due,
      stability: card_state.stability,
      difficulty: card_state.difficulty,
      scheduled_days: card_state.scheduled_days,
      review: now.toISOString()
    }

    await saveReview(card.id, card_state, log)

    const { data: review } = await session.client
      .from('reviews')
      .select('*')
      .eq('card_id', card.id)
      .single()
    expect(review).toMatchObject({
      card_id: card.id,
      stability: card_state.stability,
      difficulty: card_state.difficulty,
      reps: 1
    })

    const { data: logs } = await session.client
      .from('review_logs')
      .select('*')
      .eq('card_id', card.id)
    expect(logs).toHaveLength(1)
    expect(logs[0].rating).toBe(3)
  })

  test('replaying an identical review writes no duplicate review_logs row [obligation]', async () => {
    const deck = await createDeck(session.client, session.userId)
    const card = await insertCardDirect(session.client, deck.id)

    const now = new Date()
    const card_state = {
      due: new Date(now.getTime() + 86_400_000).toISOString(),
      stability: 1.5,
      difficulty: 5,
      elapsed_days: 0,
      scheduled_days: 1,
      reps: 1,
      lapses: 0,
      last_review: now.toISOString(),
      state: 1
    }
    const log = {
      rating: 3,
      state: 1,
      due: card_state.due,
      stability: card_state.stability,
      difficulty: card_state.difficulty,
      scheduled_days: card_state.scheduled_days,
      review: now.toISOString()
    }

    // Same (member, card, review-instant) twice — a retried save.
    await saveReview(card.id, card_state, log)
    await saveReview(card.id, card_state, log)

    const { data: logs } = await session.client
      .from('review_logs')
      .select('id')
      .eq('card_id', card.id)
    expect(logs).toHaveLength(1)
  })
})

describe('resetDeckReviews (contract)', () => {
  test('clears reviews + review_logs for every card in the deck', async () => {
    const deck = await createDeck(session.client, session.userId)
    const card = await insertCardDirect(session.client, deck.id)

    const now = new Date()
    await saveReview(
      card.id,
      {
        due: new Date(now.getTime() + 86_400_000).toISOString(),
        stability: 1.5,
        difficulty: 5,
        elapsed_days: 0,
        scheduled_days: 1,
        reps: 1,
        lapses: 0,
        last_review: now.toISOString(),
        state: 1
      },
      {
        rating: 3,
        state: 1,
        due: now.toISOString(),
        stability: 1.5,
        difficulty: 5,
        scheduled_days: 1,
        review: now.toISOString()
      }
    )

    await resetDeckReviews(deck.id)

    const { data: reviews } = await session.client
      .from('reviews')
      .select('id')
      .eq('card_id', card.id)
    expect(reviews).toEqual([])

    const { data: logs } = await session.client
      .from('review_logs')
      .select('id')
      .eq('card_id', card.id)
    expect(logs).toEqual([])
  })

  test('rejects when caller does not own the deck', async () => {
    const deck = await createDeck(session.client, session.userId)

    // Switch to a different user — signInAsTestUser swaps the global client.
    await session.cleanup()
    session = await signInAsTestUser()

    await expect(resetDeckReviews(deck.id)).rejects.toThrow(/not found|not owned/i)
  })
})
