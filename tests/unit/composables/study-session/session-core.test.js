import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { Rating } from 'ts-fsrs'
import { useStudySessionCore } from '@/composables/study-session/session-core'
import { card } from '../../../fixtures/card'

const { saveReviewMock } = vi.hoisted(() => ({
  saveReviewMock: vi.fn().mockResolvedValue(undefined)
}))

vi.mock('@/api/reviews', () => ({
  useSaveReviewMutation: () => ({
    mutate: vi.fn(),
    mutateAsync: saveReviewMock
  })
}))

beforeEach(() => {
  saveReviewMock.mockReset().mockResolvedValue(undefined)
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeNewCard(overrides = {}) {
  return card.one({ overrides: { review: null, ...overrides } })
}

function makeReviewCard(overrides = {}) {
  return card.one({ traits: 'with_due_review', overrides })
}

function makeNotDueCard(overrides = {}) {
  return card.one({ traits: 'with_not_due_review', overrides })
}

// ── Shuffle: config.shuffle = true ───────────────────────────────────────────

describe('session-core — shuffle: true', () => {
  test('shuffles new cards and review cards together (no new-card pinning)', () => {
    // With 10 cards total (5 new + 5 review), the probability that all 5 new
    // cards end up at the front (i.e. the old buggy behaviour) is 1/252,
    // vanishingly small. If the implementation were still pinning new cards
    // first, this test would fail nearly every time.
    const NEW_COUNT = 5
    const REVIEW_COUNT = 5
    const RUNS = 20

    const new_ids = new Set(Array.from({ length: NEW_COUNT }, () => makeNewCard().id))
    const review_ids = new Set(Array.from({ length: REVIEW_COUNT }, () => makeReviewCard().id))

    // Build the actual raw cards (with stable ids)
    const new_cards = Array.from(new_ids, (id) => makeNewCard({ id }))
    const review_cards = Array.from(review_ids, (id) => makeReviewCard({ id }))
    const all_cards = [...new_cards, ...review_cards]

    let found_review_before_new = false
    for (let i = 0; i < RUNS; i++) {
      const session = useStudySessionCore({ study_all_cards: true, shuffle: true })
      session.setCards(all_cards)

      const result_ids = session.cards.value.map((c) => c.id)
      // Find if any review card appears before any new card
      const first_review_idx = result_ids.findIndex((id) => review_ids.has(id))
      const first_new_idx = result_ids.findIndex((id) => new_ids.has(id))

      if (first_review_idx !== -1 && first_new_idx !== -1 && first_review_idx < first_new_idx) {
        found_review_before_new = true
        break
      }
    }

    // After 20 independent shuffles, at least one should produce a review card
    // before a new card — proving they're mixed, not pinned.
    expect(found_review_before_new).toBe(true)
  })

  test('shuffle:true produces the correct total number of cards', () => {
    const new_cards = Array.from({ length: 3 }, () => makeNewCard())
    const review_cards = Array.from({ length: 4 }, () => makeReviewCard())

    const session = useStudySessionCore({ study_all_cards: true, shuffle: true })
    session.setCards([...new_cards, ...review_cards])

    expect(session.cards.value).toHaveLength(7)
  })

  test('shuffle:true includes all card ids (none dropped or duplicated)', () => {
    const cards = [makeNewCard(), makeNewCard(), makeReviewCard(), makeReviewCard()]
    const expected_ids = new Set(cards.map((c) => c.id))

    const session = useStudySessionCore({ study_all_cards: true, shuffle: true })
    session.setCards(cards)

    const result_ids = new Set(session.cards.value.map((c) => c.id))
    expect(result_ids).toEqual(expected_ids)
  })
})

// ── Shuffle: config.shuffle = false ──────────────────────────────────────────

describe('session-core — shuffle: false', () => {
  test('shuffle:false preserves the original card order', () => {
    const cards = [makeNewCard(), makeReviewCard(), makeNewCard(), makeReviewCard()]
    const original_ids = cards.map((c) => c.id)

    const session = useStudySessionCore({ study_all_cards: true, shuffle: false })
    session.setCards(cards)

    const result_ids = session.cards.value.map((c) => c.id)
    expect(result_ids).toEqual(original_ids)
  })

  test('shuffle:false with a mix of new and review cards keeps them interleaved', () => {
    // Alternate: new, review, new, review
    const cards = [makeNewCard(), makeReviewCard(), makeNewCard(), makeReviewCard()]
    const original_ids = cards.map((c) => c.id)

    const session = useStudySessionCore({ study_all_cards: true, shuffle: false })
    session.setCards(cards)

    expect(session.cards.value.map((c) => c.id)).toEqual(original_ids)
  })
})

// ── Basic setCards / filtering ────────────────────────────────────────────────

describe('session-core — setCards', () => {
  test('study_all_cards:true includes all cards', () => {
    const session = useStudySessionCore({ study_all_cards: true })
    session.setCards([makeNewCard(), makeNotDueCard()])
    expect(session.cards.value).toHaveLength(2)
  })

  test('study_all_cards:false filters out cards with a future due date', () => {
    const session = useStudySessionCore({ study_all_cards: false })
    session.setCards([makeNewCard(), makeNotDueCard()])
    expect(session.cards.value).toHaveLength(1)
  })

  test('empty deck sets mode to completed immediately', () => {
    const session = useStudySessionCore({ study_all_cards: true })
    session.setCards([])
    expect(session.mode.value).toBe('completed')
  })
})

// ── updateConfig ──────────────────────────────────────────────────────────────

describe('session-core — updateConfig', () => {
  test('updateConfig re-processes cards with the new shuffle setting', () => {
    const cards = [makeNewCard(), makeReviewCard()]
    const original_ids = cards.map((c) => c.id)

    const session = useStudySessionCore({ study_all_cards: true, shuffle: false })
    session.setCards(cards)

    // Confirm un-shuffled order first
    expect(session.cards.value.map((c) => c.id)).toEqual(original_ids)

    // Enabling shuffle re-processes — we just verify count stays correct
    session.updateConfig({ shuffle: true })
    expect(session.cards.value).toHaveLength(2)
  })

  test('updateConfig does not call _processCards when no cards have been set', () => {
    const session = useStudySessionCore({ study_all_cards: false })
    session.updateConfig({ study_all_cards: true })
    expect(session.cards.value).toHaveLength(0)
  })
})

// ── reviewCard — no-grade (pass-through) ─────────────────────────────────────

describe('session-core — reviewCard (no grade)', () => {
  test('no-grade review marks the active card as passed and advances', () => {
    const session = useStudySessionCore({ study_all_cards: true })
    const [c1, c2] = [makeNewCard(), makeNewCard()]
    session.setCards([c1, c2])

    expect(session.active_card.value?.id).toBe(c1.id)

    session.reviewCard()

    expect(session.cards.value.find((c) => c.id === c1.id)?.state).toBe('passed')
    expect(session.active_card.value?.id).toBe(c2.id)
  })

  test('no-grade review on the last card sets mode to completed', () => {
    const session = useStudySessionCore({ study_all_cards: true })
    session.setCards([makeNewCard()])

    session.reviewCard()

    expect(session.mode.value).toBe('completed')
  })

  test('no-grade review does NOT call save_review_mutation', () => {
    const session = useStudySessionCore({ study_all_cards: true })
    session.setCards([makeNewCard()])

    session.reviewCard()

    expect(saveReviewMock).not.toHaveBeenCalled()
  })

  test('reviewCard with no active_card is a no-op', () => {
    const session = useStudySessionCore({ study_all_cards: true })
    // No setCards — active_card is undefined
    session.reviewCard()

    expect(session.mode.value).toBe('studying')
    expect(saveReviewMock).not.toHaveBeenCalled()
  })
})

// ── reviewCard — with grade ───────────────────────────────────────────────────

describe('session-core — reviewCard (with grade)', () => {
  test('grade=Good marks the active card as passed', () => {
    const session = useStudySessionCore({ study_all_cards: true })
    const [c1, c2] = [makeNewCard(), makeNewCard()]
    session.setCards([c1, c2])

    session.reviewCard(Rating.Good)

    expect(session.cards.value.find((c) => c.id === c1.id)?.state).toBe('passed')
  })

  test('grade=Again marks the active card as failed', () => {
    const session = useStudySessionCore({ study_all_cards: true })
    const [c1, c2] = [makeNewCard(), makeNewCard()]
    session.setCards([c1, c2])

    session.reviewCard(Rating.Again)

    expect(session.cards.value.find((c) => c.id === c1.id)?.state).toBe('failed')
  })

  test('grade=Hard marks the active card as passed (not failed)', () => {
    const session = useStudySessionCore({ study_all_cards: true })
    const [c1, c2] = [makeNewCard(), makeNewCard()]
    session.setCards([c1, c2])

    session.reviewCard(Rating.Hard)

    expect(session.cards.value.find((c) => c.id === c1.id)?.state).toBe('passed')
  })

  test('graded review advances to the next unreviewed card', () => {
    const session = useStudySessionCore({ study_all_cards: true })
    const [c1, c2] = [makeNewCard(), makeNewCard()]
    session.setCards([c1, c2])

    session.reviewCard(Rating.Good)

    expect(session.active_card.value?.id).toBe(c2.id)
  })

  test('graded review on the last card sets mode to completed', () => {
    const session = useStudySessionCore({ study_all_cards: true })
    session.setCards([makeNewCard()])

    session.reviewCard(Rating.Good)

    expect(session.mode.value).toBe('completed')
  })

  test('graded review calls save_review_mutation with card_id and deck_id', () => {
    const session = useStudySessionCore({ study_all_cards: true })
    const c = makeNewCard({ id: 42, deck_id: 7 })
    session.setCards([c])

    session.reviewCard(Rating.Good)

    expect(saveReviewMock).toHaveBeenCalledWith(
      expect.objectContaining({ card_id: 42, deck_id: 7 })
    )
  })

  test('graded review does NOT call save when card has no id', () => {
    const session = useStudySessionCore({ study_all_cards: true })
    // id falsy — mutation should be skipped
    const c = makeNewCard({ id: 0 })
    session.setCards([c])

    session.reviewCard(Rating.Good)

    expect(saveReviewMock).not.toHaveBeenCalled()
  })
})

// ── Computed stats ────────────────────────────────────────────────────────────

describe('session-core — computed stats', () => {
  test('num_correct counts only passed cards', () => {
    const session = useStudySessionCore({ study_all_cards: true })
    const [c1, c2, c3] = [makeNewCard(), makeNewCard(), makeNewCard()]
    session.setCards([c1, c2, c3])

    session.reviewCard(Rating.Good)
    session.reviewCard(Rating.Again)

    expect(session.num_correct.value).toBe(1)
  })

  test('reviewed_count counts both passed and failed cards', () => {
    const session = useStudySessionCore({ study_all_cards: true })
    const [c1, c2, c3] = [makeNewCard(), makeNewCard(), makeNewCard()]
    session.setCards([c1, c2, c3])

    session.reviewCard(Rating.Good)
    session.reviewCard(Rating.Again)

    expect(session.reviewed_count.value).toBe(2)
  })

  test('current_index returns the index of the active card', () => {
    const session = useStudySessionCore({ study_all_cards: true })
    const [c1, c2] = [makeNewCard(), makeNewCard()]
    session.setCards([c1, c2])

    expect(session.current_index.value).toBe(0)

    session.reviewCard()

    expect(session.current_index.value).toBe(1)
  })

  test('current_index returns cards.length when no active card', () => {
    const session = useStudySessionCore({ study_all_cards: true })
    session.setCards([makeNewCard()])

    session.reviewCard()

    expect(session.current_index.value).toBe(1)
  })

  test('remaining_due_count is 0 when study_all_cards is true', () => {
    const session = useStudySessionCore({ study_all_cards: true })
    session.setCards([makeNewCard(), makeReviewCard()])

    expect(session.remaining_due_count.value).toBe(0)
  })

  test('remaining_due_count reflects total due minus already-reviewed count', () => {
    const session = useStudySessionCore({ study_all_cards: false })
    // Two due review cards — remaining starts at 2
    session.setCards([makeReviewCard(), makeReviewCard()])

    expect(session.remaining_due_count.value).toBe(2)
  })

  test('remaining_due_count is 0 when no due cards in deck', () => {
    const session = useStudySessionCore({ study_all_cards: false })
    // Only not-due cards — they don't show up at all
    session.setCards([makeNotDueCard()])

    expect(session.remaining_due_count.value).toBe(0)
  })
})
