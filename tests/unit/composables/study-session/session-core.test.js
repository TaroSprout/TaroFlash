import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { nextTick } from 'vue'
import { Rating } from 'ts-fsrs'
import { useStudySessionCore } from '@/components/study-session/composables/session-core'
import { readPersistedSession } from '@/components/study-session/composables/session-persistence'
import { card } from '../../../fixtures/card'

const { saveReviewMock } = vi.hoisted(() => ({
  saveReviewMock: vi.fn().mockResolvedValue(undefined)
}))

const { mockMemberStore, generatorParametersMock } = vi.hoisted(() => ({
  mockMemberStore: {
    preferences: {
      study: {
        show_all_ratings: true,
        desired_retention: 90,
        learning_steps: ['1m', '10m'],
        relearning_steps: ['10m']
      }
    }
  },
  generatorParametersMock: vi.fn()
}))

vi.mock('@/api/reviews', () => ({
  useSaveReviewMutation: () => ({
    mutate: vi.fn(),
    mutateAsync: saveReviewMock
  })
}))

vi.mock('@/stores/member', () => ({
  useMemberStore: () => mockMemberStore
}))

vi.mock('ts-fsrs', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    generatorParameters: (...args) => {
      generatorParametersMock(...args)
      return actual.generatorParameters(...args)
    }
  }
})

beforeEach(() => {
  saveReviewMock.mockReset().mockResolvedValue(undefined)
  generatorParametersMock.mockClear()
  mockMemberStore.preferences.study.show_all_ratings = true
  mockMemberStore.preferences.study.desired_retention = 90
  mockMemberStore.preferences.study.learning_steps = ['1m', '10m']
  mockMemberStore.preferences.study.relearning_steps = ['10m']
  sessionStorage.clear()
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

// ── show_all_ratings + desired_retention: member-wide, seeded from the store ─

describe('session-core — member preference seeding [obligation]', () => {
  test('show_all_ratings seeds from member_store.preferences.study.show_all_ratings [obligation]', () => {
    mockMemberStore.preferences.study.show_all_ratings = false
    const session = useStudySessionCore()
    expect(session.show_all_ratings.value).toBe(false)
  })

  test('show_all_ratings is a local ref, toggling it does not write back to the store [obligation]', () => {
    mockMemberStore.preferences.study.show_all_ratings = true
    const session = useStudySessionCore()
    session.show_all_ratings.value = false
    expect(mockMemberStore.preferences.study.show_all_ratings).toBe(true)
  })

  test('FSRS is seeded with request_retention = desired_retention / 100 [obligation]', () => {
    mockMemberStore.preferences.study.desired_retention = 82
    useStudySessionCore()
    expect(generatorParametersMock).toHaveBeenCalledWith(
      expect.objectContaining({ request_retention: 0.82 })
    )
  })

  test('FSRS is seeded with learning_steps/relearning_steps from member_store.preferences.study, not hardcoded to [] [obligation]', () => {
    // Regression guard: this was previously hardcoded to `[]` for both fields,
    // silently disabling learning/relearning steps regardless of member prefs.
    mockMemberStore.preferences.study.learning_steps = ['1m', '10m', '1d']
    mockMemberStore.preferences.study.relearning_steps = ['1m', '10m']
    useStudySessionCore()
    expect(generatorParametersMock).toHaveBeenCalledWith(
      expect.objectContaining({
        learning_steps: ['1m', '10m', '1d'],
        relearning_steps: ['1m', '10m']
      })
    )
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

// ── results — obligation tests ────────────────────────────────────────────────

describe('session-core — results (CardReviewResult capture)', () => {
  test('reviewCard(grade) captures before_interval BEFORE overwriting card state [obligation]', () => {
    // The central invariant: the before-interval must be the PRIOR scheduled_days,
    // captured at the moment of review, before FSRS overwrites card.review.
    const prior_scheduled_days = 10
    const session = useStudySessionCore({ study_all_cards: true })
    const c = card.one({
      traits: 'with_due_review',
      overrides: {
        review: {
          due: new Date(Date.now() - 1000).toISOString(),
          reps: 3,
          scheduled_days: prior_scheduled_days,
          lapses: 0,
          stability: 1.5,
          ease: 2.5,
          interval: 10,
          learning_steps: 0,
          state: 2,
          last_review: new Date(Date.now() - prior_scheduled_days * 86400000).toISOString()
        }
      }
    })
    session.setCards([c])

    session.reviewCard(Rating.Good)

    const result = session.results.value[0]
    expect(result).toBeDefined()
    expect(result.before_interval).toBe(prior_scheduled_days)
    expect(result.after_interval).not.toBe(prior_scheduled_days)
  })

  test('is_new is true for a card with no prior review (reps=0) [obligation]', () => {
    const session = useStudySessionCore({ study_all_cards: true })
    const c = makeNewCard({ id: 1, deck_id: 1 })
    session.setCards([c])

    session.reviewCard(Rating.Good)

    expect(session.results.value[0].is_new).toBe(true)
  })

  test('is_new is false when card has prior reviews (reps > 0) [obligation]', () => {
    const session = useStudySessionCore({ study_all_cards: true })
    const c = makeReviewCard({ id: 1, deck_id: 1 })
    session.setCards([c])

    session.reviewCard(Rating.Good)

    expect(session.results.value[0].is_new).toBe(false)
  })

  test('reviewCard() with no grade (auto-pass) does NOT push a result [obligation]', () => {
    const session = useStudySessionCore({ study_all_cards: true })
    const c = makeNewCard({ id: 1 })
    session.setCards([c])

    session.reviewCard()

    expect(session.results.value).toHaveLength(0)
  })

  test('reviewCard(grade) pushes exactly one result per graded review [obligation]', () => {
    const session = useStudySessionCore({ study_all_cards: true })
    const [c1, c2] = [makeNewCard({ id: 1, deck_id: 1 }), makeNewCard({ id: 2, deck_id: 1 })]
    session.setCards([c1, c2])

    session.reviewCard(Rating.Good)
    session.reviewCard(Rating.Again)

    expect(session.results.value).toHaveLength(2)
  })

  test('setCards clears results from a previous session [obligation]', () => {
    const session = useStudySessionCore({ study_all_cards: true })
    const [c1, c2] = [makeNewCard({ id: 1, deck_id: 1 }), makeNewCard({ id: 2, deck_id: 1 })]
    session.setCards([c1])
    session.reviewCard(Rating.Good)
    expect(session.results.value).toHaveLength(1)

    // Start a new session — results must reset
    session.setCards([c2])
    expect(session.results.value).toHaveLength(0)
  })

  test('passed = true for grade Hard [obligation]', () => {
    const session = useStudySessionCore({ study_all_cards: true })
    const c = makeNewCard({ id: 1, deck_id: 1 })
    session.setCards([c])

    session.reviewCard(Rating.Hard)

    expect(session.results.value[0].passed).toBe(true)
  })

  test('passed = true for grade Easy [obligation]', () => {
    const session = useStudySessionCore({ study_all_cards: true })
    const c = makeNewCard({ id: 1, deck_id: 1 })
    session.setCards([c])

    session.reviewCard(Rating.Easy)

    expect(session.results.value[0].passed).toBe(true)
  })

  test('passed = false for grade Again [obligation]', () => {
    const session = useStudySessionCore({ study_all_cards: true })
    const [c1, c2] = [makeNewCard({ id: 1, deck_id: 1 }), makeNewCard({ id: 2, deck_id: 1 })]
    session.setCards([c1, c2])

    session.reviewCard(Rating.Again)

    expect(session.results.value[0].passed).toBe(false)
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

// ── dropCard [obligation] ─────────────────────────────────────────────────────

describe('session-core — dropCard [obligation]', () => {
  test('removing the active card advances active_card to the next unreviewed card [obligation]', () => {
    const session = useStudySessionCore({ study_all_cards: true })
    const [c1, c2, c3] = [makeNewCard(), makeNewCard(), makeNewCard()]
    session.setCards([c1, c2, c3])

    expect(session.active_card.value?.id).toBe(c1.id)

    session.dropCard(c1.id)

    expect(session.active_card.value?.id).toBe(c2.id)
  })

  test('dropping the active card removes it from cards [obligation]', () => {
    const session = useStudySessionCore({ study_all_cards: true })
    const [c1, c2] = [makeNewCard(), makeNewCard()]
    session.setCards([c1, c2])

    session.dropCard(c1.id)

    expect(session.cards.value.find((c) => c.id === c1.id)).toBeUndefined()
    expect(session.cards.value).toHaveLength(1)
  })

  test('dropping the active card also removes it from the due pool (remaining_due_count decreases) [obligation]', () => {
    const session = useStudySessionCore({ study_all_cards: false })
    const [c1, c2] = [makeReviewCard(), makeReviewCard()]
    session.setCards([c1, c2])

    expect(session.remaining_due_count.value).toBe(2)

    session.dropCard(c1.id)

    expect(session.remaining_due_count.value).toBe(1)
  })

  test('removing the last remaining card sets mode to completed [obligation]', () => {
    const session = useStudySessionCore({ study_all_cards: true })
    const c1 = makeNewCard()
    session.setCards([c1])

    session.dropCard(c1.id)

    expect(session.mode.value).toBe('completed')
  })

  test('removing a non-active card leaves active_card unchanged [obligation]', () => {
    const session = useStudySessionCore({ study_all_cards: true })
    const [c1, c2, c3] = [makeNewCard(), makeNewCard(), makeNewCard()]
    session.setCards([c1, c2, c3])

    expect(session.active_card.value?.id).toBe(c1.id)

    session.dropCard(c3.id)

    // Active card must stay at c1 — only c3 was removed
    expect(session.active_card.value?.id).toBe(c1.id)
  })

  test('removing a non-active card removes it from cards but leaves the rest', () => {
    const session = useStudySessionCore({ study_all_cards: true })
    const [c1, c2, c3] = [makeNewCard(), makeNewCard(), makeNewCard()]
    session.setCards([c1, c2, c3])

    session.dropCard(c2.id)

    expect(session.cards.value.map((c) => c.id)).toEqual([c1.id, c3.id])
  })
})

// ── updateCard [obligation] ─────────────────────────────────────────────────────

describe('session-core — updateCard [obligation]', () => {
  test('patches the matching card in cards [obligation]', () => {
    const session = useStudySessionCore({ study_all_cards: true })
    const [c1, c2] = [makeNewCard(), makeNewCard()]
    session.setCards([c1, c2])

    session.updateCard(c1.id, { front_text: 'Updated front' })

    expect(session.cards.value.find((c) => c.id === c1.id)?.front_text).toBe('Updated front')
  })

  test('reassigns the cards array reference (shallowRef immutability) [obligation]', () => {
    const session = useStudySessionCore({ study_all_cards: true })
    const [c1, c2] = [makeNewCard(), makeNewCard()]
    session.setCards([c1, c2])
    const before = session.cards.value

    session.updateCard(c1.id, { front_text: 'Updated front' })

    expect(session.cards.value).not.toBe(before)
  })

  test('leaves non-matching cards untouched (value and reference) [obligation]', () => {
    const session = useStudySessionCore({ study_all_cards: true })
    const [c1, c2] = [makeNewCard(), makeNewCard()]
    session.setCards([c1, c2])
    const c2_before = session.cards.value.find((c) => c.id === c2.id)

    session.updateCard(c1.id, { front_text: 'Updated front' })

    const c2_after = session.cards.value.find((c) => c.id === c2.id)
    expect(c2_after).toBe(c2_before)
  })

  test('patches active_card when the patched card is the active one [obligation]', () => {
    const session = useStudySessionCore({ study_all_cards: true })
    const [c1, c2] = [makeNewCard(), makeNewCard()]
    session.setCards([c1, c2])

    expect(session.active_card.value?.id).toBe(c1.id)

    session.updateCard(c1.id, { front_text: 'Updated front' })

    expect(session.active_card.value?.front_text).toBe('Updated front')
  })

  test('does not touch active_card when the patched card is not the active one [obligation]', () => {
    const session = useStudySessionCore({ study_all_cards: true })
    const [c1, c2] = [makeNewCard(), makeNewCard()]
    session.setCards([c1, c2])
    const active_before = session.active_card.value

    session.updateCard(c2.id, { front_text: 'Updated front' })

    expect(session.active_card.value).toBe(active_before)
  })
})

// ── Persistence [obligation] ─────────────────────────────────────────────────

describe('session-core — persistence [obligation]', () => {
  test('setCards persists card_ids into sessionStorage [obligation]', async () => {
    const session = useStudySessionCore({ study_all_cards: true })
    const [c1, c2] = [makeNewCard(), makeNewCard()]
    session.setCards([c1, c2])
    await nextTick()

    const persisted = readPersistedSession()
    expect(persisted?.card_ids).toEqual([c1.id, c2.id])
    expect(persisted?.results).toEqual([])
  })

  test('setSessionMeta records deck_ids and config_override into the next persisted snapshot [obligation]', async () => {
    const session = useStudySessionCore({ study_all_cards: true })
    session.setSessionMeta([1, 2], { shuffle: true })
    session.setCards([makeNewCard()])
    await nextTick()

    const persisted = readPersistedSession()
    expect(persisted?.deck_ids).toEqual([1, 2])
    expect(persisted?.config_override).toEqual({ shuffle: true })
  })

  test('reviewCard(grade) updates the persisted results and card_ids, not just the initial seed [obligation]', async () => {
    const session = useStudySessionCore({ study_all_cards: true })
    const [c1, c2] = [makeNewCard({ id: 1, deck_id: 1 }), makeNewCard({ id: 2, deck_id: 1 })]
    session.setCards([c1, c2])
    await nextTick()
    expect(readPersistedSession()?.results).toEqual([])

    session.reviewCard(Rating.Good)
    await nextTick()

    const persisted = readPersistedSession()
    expect(persisted?.results).toHaveLength(1)
    expect(persisted?.results?.[0].card_id).toBe(c1.id)
  })

  test('reviewCard() with no grade also persists the resulting completed mode [obligation]', async () => {
    const session = useStudySessionCore({ study_all_cards: true })
    session.setCards([makeNewCard()])
    await nextTick()

    session.reviewCard()
    await nextTick()

    expect(readPersistedSession()?.mode).toBe('completed')
  })

  test('persisted results only carry CardReviewResult fields, no full card data [obligation]', async () => {
    const session = useStudySessionCore({ study_all_cards: true })
    session.setCards([makeNewCard({ id: 1, deck_id: 1 })])
    await nextTick()

    session.reviewCard(Rating.Good)
    await nextTick()

    const [result] = readPersistedSession()?.results ?? []
    expect(Object.keys(result).sort()).toEqual(
      [
        'card_id',
        'front_text',
        'is_new',
        'before_interval',
        'after_interval',
        'lapses',
        'passed'
      ].sort()
    )
  })

  test('dropCard on a non-active card persists the updated card_ids [obligation]', async () => {
    const session = useStudySessionCore({ study_all_cards: true })
    const [c1, c2, c3] = [makeNewCard(), makeNewCard(), makeNewCard()]
    session.setCards([c1, c2, c3])
    await nextTick()

    session.dropCard(c3.id)
    await nextTick()

    expect(readPersistedSession()?.card_ids).toEqual([c1.id, c2.id])
  })

  test('dropCard on the active card persists the updated card_ids [obligation]', async () => {
    const session = useStudySessionCore({ study_all_cards: true })
    const [c1, c2] = [makeNewCard(), makeNewCard()]
    session.setCards([c1, c2])
    await nextTick()

    session.dropCard(c1.id)
    await nextTick()

    expect(readPersistedSession()?.card_ids).toEqual([c2.id])
  })
})

// ── restoreCards [obligation] ────────────────────────────────────────────────

describe('session-core — restoreCards [obligation]', () => {
  test('rebuilds _cards_in_deck in the original persisted.card_ids order, not fetch order [obligation]', () => {
    const [c1, c2, c3] = [makeNewCard(), makeNewCard(), makeNewCard()]
    const persisted = {
      deck_ids: [1],
      card_ids: [c3.id, c1.id, c2.id],
      results: [],
      mode: 'studying'
    }

    const session = useStudySessionCore({ study_all_cards: true })
    session.restoreCards([c1, c2, c3], persisted)

    expect(session.cards.value.map((c) => c.id)).toEqual([c3.id, c1.id, c2.id])
  })

  test('excludes a raw card that is not present in persisted.card_ids (locked-queue guarantee) [obligation]', () => {
    const [c1, c2, extra] = [makeNewCard(), makeNewCard(), makeNewCard()]
    const persisted = {
      deck_ids: [1],
      card_ids: [c1.id, c2.id],
      results: [],
      mode: 'studying'
    }

    const session = useStudySessionCore({ study_all_cards: true })
    session.restoreCards([c1, c2, extra], persisted)

    expect(session.cards.value.map((c) => c.id)).toEqual([c1.id, c2.id])
    expect(session.cards.value.find((c) => c.id === extra.id)).toBeUndefined()
  })

  test('silently drops a persisted card_id with no matching fetched card [obligation]', () => {
    const c1 = makeNewCard()
    const persisted = {
      deck_ids: [1],
      card_ids: [c1.id, 999999],
      results: [],
      mode: 'studying'
    }

    const session = useStudySessionCore({ study_all_cards: true })
    expect(() => session.restoreCards([c1], persisted)).not.toThrow()

    expect(session.cards.value.map((c) => c.id)).toEqual([c1.id])
  })

  test('rebuilds an already-reviewed (passed) card as a minimal state-only stub, never re-fetched [obligation]', () => {
    const [c1, c2] = [makeNewCard(), makeNewCard()]
    const persisted = {
      deck_ids: [1],
      card_ids: [c1.id, c2.id],
      results: [
        {
          card_id: c1.id,
          front_text: 'Reviewed front',
          is_new: true,
          before_interval: 0,
          after_interval: 1,
          lapses: 0,
          passed: true
        }
      ],
      mode: 'studying'
    }

    const session = useStudySessionCore({ study_all_cards: true })
    // raw only contains the unreviewed remainder — c1 must NOT need to be fetched
    session.restoreCards([c2], persisted)

    const restored_c1 = session.cards.value.find((c) => c.id === c1.id)
    expect(restored_c1).toEqual({ id: c1.id, front_text: 'Reviewed front', state: 'passed' })
  })

  test('rebuilds an already-reviewed (failed) card with state="failed" [obligation]', () => {
    const c1 = makeNewCard()
    const persisted = {
      deck_ids: [1],
      card_ids: [c1.id],
      results: [
        {
          card_id: c1.id,
          front_text: 'Reviewed front',
          is_new: true,
          before_interval: 0,
          after_interval: 1,
          lapses: 1,
          passed: false
        }
      ],
      mode: 'studying'
    }

    const session = useStudySessionCore({ study_all_cards: true })
    session.restoreCards([], persisted)

    expect(session.cards.value.find((c) => c.id === c1.id)?.state).toBe('failed')
  })

  test('active_card lands on the first persisted.card_ids entry whose state resolves to unreviewed [obligation]', () => {
    const [c1, c2, c3] = [makeNewCard(), makeNewCard(), makeNewCard()]
    const persisted = {
      deck_ids: [1],
      card_ids: [c1.id, c2.id, c3.id],
      results: [
        {
          card_id: c1.id,
          front_text: 'Reviewed front',
          is_new: true,
          before_interval: 0,
          after_interval: 1,
          lapses: 0,
          passed: true
        }
      ],
      mode: 'studying'
    }

    const session = useStudySessionCore({ study_all_cards: true })
    session.restoreCards([c2, c3], persisted)

    expect(session.active_card.value?.id).toBe(c2.id)
  })

  test('mode resolves to completed when persisted.mode is "studying" but no unreviewed card remains [obligation]', () => {
    const persisted = {
      deck_ids: [1],
      card_ids: [999999],
      results: [],
      mode: 'studying'
    }

    const session = useStudySessionCore({ study_all_cards: true })
    // The only persisted id has no matching fetched card — dropped, leaving no unreviewed card.
    session.restoreCards([], persisted)

    expect(session.mode.value).toBe('completed')
    expect(session.active_card.value).toBeUndefined()
  })

  test('mode stays completed when persisted.mode is "completed", regardless of active_card [obligation]', () => {
    const c1 = makeNewCard()
    const persisted = {
      deck_ids: [1],
      card_ids: [c1.id],
      results: [],
      mode: 'completed'
    }

    const session = useStudySessionCore({ study_all_cards: true })
    session.restoreCards([c1], persisted)

    expect(session.mode.value).toBe('completed')
    expect(session.active_card.value?.id).toBe(c1.id)
  })

  test('restoreCards persists the rebuilt snapshot [obligation]', async () => {
    const c1 = makeNewCard()
    const persisted = {
      deck_ids: [7],
      card_ids: [c1.id],
      results: [],
      mode: 'studying'
    }

    const session = useStudySessionCore({ study_all_cards: true })
    session.restoreCards([c1], persisted)
    await nextTick()

    expect(readPersistedSession()?.card_ids).toEqual([c1.id])
  })
})
