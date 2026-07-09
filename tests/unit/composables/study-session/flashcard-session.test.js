import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { Rating } from 'ts-fsrs'
import { useFlashcardSession } from '@/components/flashcard-session/composables/flashcard-session'
import { card } from '../../../fixtures/card'

const { saveReviewMock } = vi.hoisted(() => ({
  saveReviewMock: vi.fn().mockResolvedValue(undefined)
}))

const { mockEmitSfx, mockEmitStudySfx } = vi.hoisted(() => ({
  mockEmitSfx: vi.fn(),
  mockEmitStudySfx: vi.fn()
}))

const { mockMemberStore } = vi.hoisted(() => ({
  mockMemberStore: {
    preferences: {
      study: { show_all_ratings: true, desired_retention: 90 }
    }
  }
}))

vi.mock('@/api/reviews', () => ({
  useSaveReviewMutation: () => ({ mutate: saveReviewMock, mutateAsync: saveReviewMock })
}))

vi.mock('@/sfx/bus', () => ({
  emitSfx: mockEmitSfx,
  emitStudySfx: mockEmitStudySfx,
  emitHoverSfx: vi.fn()
}))

vi.mock('@/stores/member', () => ({
  useMemberStore: () => mockMemberStore
}))

vi.mock('@/stores/notice-store', () => ({
  useNoticeStore: () => ({ error: vi.fn(), success: vi.fn(), warn: vi.fn() })
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key) => key })
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a card that is due now (no review or a recent due date). */
function makeDueCard(overrides = {}) {
  return card.one({ overrides })
}

/** Build a card with a future due date (not due yet). */
function makeNotDueCard(overrides = {}) {
  return card.one({ traits: 'with_not_due_review', overrides })
}

/** Build a card with a recent (past) due date. */
function makeDueTodayCard(overrides = {}) {
  return card.one({ traits: 'with_due_review', overrides })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useFlashcardSession', () => {
  beforeEach(() => {
    saveReviewMock.mockClear()
    mockEmitSfx.mockClear()
    mockEmitStudySfx.mockClear()
  })

  // ── setCards filtering ─────────────────────────────────────────────────────

  describe('setCards with study_all_cards: false (default)', () => {
    test('includes cards that have no review (never studied)', () => {
      const session = useFlashcardSession({ study_all_cards: false, retry_failed_cards: false })
      const cards = [makeDueCard({ review: null }), makeDueCard({ review: null })]

      session.setCards(cards)

      expect(session.cards.value).toHaveLength(2)
    })

    test('includes cards whose due date is in the past', () => {
      const session = useFlashcardSession({ study_all_cards: false, retry_failed_cards: false })
      const cards = [makeDueTodayCard()]

      session.setCards(cards)

      expect(session.cards.value).toHaveLength(1)
    })

    test('excludes cards whose due date is in the future', () => {
      const session = useFlashcardSession({ study_all_cards: false, retry_failed_cards: false })
      const cards = [makeNotDueCard(), makeNotDueCard(), makeDueCard({ review: null })]

      session.setCards(cards)

      // Only the card with no review (due immediately) should be included
      expect(session.cards.value).toHaveLength(1)
    })

    test('results in an empty deck when all cards are not due', () => {
      const session = useFlashcardSession({ study_all_cards: false, retry_failed_cards: false })
      const cards = [makeNotDueCard(), makeNotDueCard()]

      session.setCards(cards)

      expect(session.cards.value).toHaveLength(0)
    })
  })

  describe('setCards with study_all_cards: true', () => {
    test('includes all cards regardless of due date', () => {
      const session = useFlashcardSession({ study_all_cards: true, retry_failed_cards: false })
      const cards = [makeNotDueCard(), makeNotDueCard(), makeDueCard({ review: null })]

      session.setCards(cards)

      expect(session.cards.value).toHaveLength(3)
    })
  })

  // ── active_card ────────────────────────────────────────────────────────────

  test('active_card is the first unreviewed card after setCards', () => {
    const session = useFlashcardSession({ study_all_cards: true, retry_failed_cards: false })
    const cards = [makeDueCard({ review: null }), makeDueCard({ review: null })]

    session.setCards(cards)

    expect(session.active_card.value).toBeDefined()
    expect(session.active_card.value?.state).toBe('unreviewed')
    expect(session.active_card.value?.id).toBe(cards[0].id)
  })

  test('active_card is undefined when deck is empty', () => {
    const session = useFlashcardSession({ study_all_cards: false, retry_failed_cards: false })

    session.setCards([])

    expect(session.active_card.value).toBeUndefined()
  })

  // ── current_index ──────────────────────────────────────────────────────────

  test('current_index is 0 for the first card', () => {
    const session = useFlashcardSession({ study_all_cards: true, retry_failed_cards: false })
    const cards = [makeDueCard({ review: null }), makeDueCard({ review: null })]

    session.setCards(cards)

    expect(session.current_index.value).toBe(0)
  })

  test('current_index advances after reviewing a card', () => {
    const session = useFlashcardSession({ study_all_cards: true, retry_failed_cards: false })
    const cards = [makeDueCard({ review: null }), makeDueCard({ review: null })]

    session.setCards(cards)

    const item = Rating.Good
    session.reviewCard(item)

    expect(session.current_index.value).toBe(1)
  })

  test('current_index equals cards.length when no active card', () => {
    const session = useFlashcardSession({ study_all_cards: true, retry_failed_cards: false })

    session.setCards([])

    expect(session.current_index.value).toBe(0) // cards.length is 0
    expect(session.active_card.value).toBeUndefined()
  })

  // ── reviewCard with Rating.Good ────────────────────────────────────────────

  describe('reviewCard with Rating.Good', () => {
    test('marks the reviewed card as passed', () => {
      const session = useFlashcardSession({ study_all_cards: true, retry_failed_cards: false })
      const cards = [makeDueCard({ review: null }), makeDueCard({ review: null })]
      session.setCards(cards)

      const reviewed_card = session.active_card.value
      session.reviewCard(Rating.Good)

      const found = session.cards.value.find((c) => c.id === reviewed_card.id)
      expect(found?.state).toBe('passed')
    })

    test('advances to the next card', () => {
      const session = useFlashcardSession({ study_all_cards: true, retry_failed_cards: false })
      const cards = [makeDueCard({ review: null }), makeDueCard({ review: null })]
      session.setCards(cards)

      const first_id = session.active_card.value?.id
      session.reviewCard(Rating.Good)

      expect(session.active_card.value?.id).not.toBe(first_id)
    })

    test('resets current_card_side to front after review', () => {
      const session = useFlashcardSession({ study_all_cards: true, retry_failed_cards: false })
      const cards = [makeDueCard({ review: null }), makeDueCard({ review: null })]
      session.setCards(cards)

      session.current_card_side.value = 'back'
      session.reviewCard(Rating.Good)

      expect(session.current_card_side.value).toBe('front')
    })

    test('calls saveReview with the card id and updated review', () => {
      const session = useFlashcardSession({ study_all_cards: true, retry_failed_cards: false })
      const cards = [makeDueCard({ review: null })]
      session.setCards(cards)

      const card_id = session.active_card.value?.id
      session.reviewCard(Rating.Good)

      expect(saveReviewMock).toHaveBeenCalledWith({
        card_id,
        deck_id: expect.any(Number),
        card: expect.any(Object),
        log: expect.any(Object)
      })
    })
  })

  // ── reviewCard with Rating.Again ───────────────────────────────────────────

  describe('reviewCard with Rating.Again', () => {
    test('marks the reviewed card as failed', () => {
      const session = useFlashcardSession({ study_all_cards: true, retry_failed_cards: false })
      const cards = [makeDueCard({ review: null }), makeDueCard({ review: null })]
      session.setCards(cards)

      const reviewed_card = session.active_card.value
      session.reviewCard(Rating.Again)

      const found = session.cards.value.find((c) => c.id === reviewed_card.id)
      expect(found?.state).toBe('failed')
    })

    test('advances to the next card', () => {
      const session = useFlashcardSession({ study_all_cards: true, retry_failed_cards: false })
      const cards = [makeDueCard({ review: null }), makeDueCard({ review: null })]
      session.setCards(cards)

      const first_id = session.active_card.value?.id
      session.reviewCard(Rating.Again)

      expect(session.active_card.value?.id).not.toBe(first_id)
    })
  })

  // ── num_correct ────────────────────────────────────────────────────────────

  test('num_correct counts only cards in passed state', () => {
    const session = useFlashcardSession({ study_all_cards: true, retry_failed_cards: false })
    const cards = [
      makeDueCard({ review: null }),
      makeDueCard({ review: null }),
      makeDueCard({ review: null })
    ]
    session.setCards(cards)

    // Review all cards before reading num_correct — shallowRef mutations are untracked
    // so num_correct must be read fresh after all reviews are done.
    session.reviewCard(Rating.Good) // passed
    session.reviewCard(Rating.Again) // failed
    session.reviewCard(Rating.Good) // passed

    expect(session.num_correct.value).toBe(2)
  })

  // ── Mode completion ────────────────────────────────────────────────────────

  test('mode becomes completed when the last card is reviewed', () => {
    const session = useFlashcardSession({ study_all_cards: true, retry_failed_cards: false })
    const cards = [makeDueCard({ review: null })]
    session.setCards(cards)

    expect(session.mode.value).toBe('studying')

    session.reviewCard(Rating.Good)

    expect(session.mode.value).toBe('completed')
  })

  test('mode stays studying while cards remain unreviewed', () => {
    const session = useFlashcardSession({ study_all_cards: true, retry_failed_cards: false })
    const cards = [makeDueCard({ review: null }), makeDueCard({ review: null })]
    session.setCards(cards)

    session.reviewCard(Rating.Good)

    expect(session.mode.value).toBe('studying')
  })

  // ── Retry logic (removed — failed cards are never retried) ────────────────

  test('failed cards are NOT retried regardless of due date', () => {
    const session = useFlashcardSession({ study_all_cards: true })
    const cards = [makeDueTodayCard(), makeDueTodayCard()]
    session.setCards(cards)

    const original_length = session.cards.value.length
    session.reviewCard(Rating.Again)

    expect(session.cards.value.length).toBe(original_length)
  })

  // ── Edge cases ─────────────────────────────────────────────────────────────

  test('no API call if active card has no id', () => {
    const session = useFlashcardSession({ study_all_cards: true, retry_failed_cards: false })
    // Build a card with id explicitly set to undefined/null to simulate missing id
    const cardData = { ...makeDueCard({ review: null }), id: undefined }
    session.setCards([cardData])

    session.reviewCard(Rating.Good)

    expect(saveReviewMock).not.toHaveBeenCalled()
  })

  test('reviewCard is a no-op when there is no active card', () => {
    const session = useFlashcardSession({ study_all_cards: true, retry_failed_cards: false })
    session.setCards([])

    // Should not throw
    expect(() => session.reviewCard(Rating.Good)).not.toThrow()
    expect(saveReviewMock).not.toHaveBeenCalled()
  })

  // ── current_card_side initial state ────────────────────────────────────────

  test('current_card_side starts at "cover" after setCards', () => {
    const session = useFlashcardSession({ study_all_cards: true, retry_failed_cards: false })
    session.setCards([makeDueCard({ review: null })])

    expect(session.current_card_side.value).toBe('cover')
  })

  // ── startSession ───────────────────────────────────────────────────────────

  test('startSession sets current_card_side to "front" by default', () => {
    const session = useFlashcardSession({ study_all_cards: true, retry_failed_cards: false })
    session.setCards([makeDueCard({ review: null })])

    session.startSession()

    expect(session.current_card_side.value).toBe('front')
  })

  test('startSession sets current_card_side to "back" when flip_cards is true', () => {
    const session = useFlashcardSession({
      study_all_cards: true,
      retry_failed_cards: false,
      flip_cards: true
    })
    session.setCards([makeDueCard({ review: null })])

    session.startSession()

    expect(session.current_card_side.value).toBe('back')
  })

  // ── startSession sfx [obligation] ─────────────────────────────────────────

  test('startSession emits music_plink_chordyes sfx [obligation]', () => {
    const session = useFlashcardSession({ study_all_cards: true, retry_failed_cards: false })
    session.setCards([makeDueCard({ review: null })])

    session.startSession()

    expect(mockEmitStudySfx).toHaveBeenCalledWith('music_plink_chordyes')
  })

  test('startSession({ silent: true }) does NOT emit the start sfx [obligation]', () => {
    const session = useFlashcardSession({ study_all_cards: true, retry_failed_cards: false })
    session.setCards([makeDueCard({ review: null })])

    session.startSession({ silent: true })

    expect(mockEmitStudySfx).not.toHaveBeenCalledWith('music_plink_chordyes')
  })

  test('startSession({ silent: true }) still sets current_card_side [obligation]', () => {
    const session = useFlashcardSession({ study_all_cards: true, retry_failed_cards: false })
    session.setCards([makeDueCard({ review: null })])

    session.startSession({ silent: true })

    expect(session.current_card_side.value).toBe('front')
  })

  // ── flipCurrentCard ────────────────────────────────────────────────────────

  test('flipCurrentCard toggles from front to back', () => {
    const session = useFlashcardSession({ study_all_cards: true, retry_failed_cards: false })
    session.setCards([makeDueCard({ review: null })])
    session.startSession() // sets to 'front'

    session.flipCurrentCard()

    expect(session.current_card_side.value).toBe('back')
  })

  test('flipCurrentCard toggles from back to front', () => {
    const session = useFlashcardSession({ study_all_cards: true, retry_failed_cards: false })
    session.setCards([makeDueCard({ review: null })])
    session.startSession() // sets to 'front'
    session.flipCurrentCard() // sets to 'back'

    session.flipCurrentCard()

    expect(session.current_card_side.value).toBe('front')
  })

  // ── flipCurrentCard sfx [obligation] ──────────────────────────────────────
  // Emits transition_up when on the starting side (front → back), transition_down
  // when on the non-starting side (back → front). SFX is computed BEFORE the toggle.

  test('flipCurrentCard emits transition_up when on starting side (front) [obligation]', () => {
    const session = useFlashcardSession({ study_all_cards: true, retry_failed_cards: false })
    session.setCards([makeDueCard({ review: null })])
    session.startSession() // sets to 'front' — the starting side

    mockEmitStudySfx.mockClear()
    session.flipCurrentCard()

    expect(mockEmitStudySfx).toHaveBeenCalledWith('transition_up')
  })

  test('flipCurrentCard emits transition_down when NOT on starting side (back) [obligation]', () => {
    const session = useFlashcardSession({ study_all_cards: true, retry_failed_cards: false })
    session.setCards([makeDueCard({ review: null })])
    session.startSession() // 'front'
    session.flipCurrentCard() // now on 'back' — NOT starting side

    mockEmitStudySfx.mockClear()
    session.flipCurrentCard()

    expect(mockEmitStudySfx).toHaveBeenCalledWith('transition_down')
  })

  // ── is_starting_side ───────────────────────────────────────────────────────

  test('is_starting_side is false when on cover', () => {
    const session = useFlashcardSession({ study_all_cards: true, retry_failed_cards: false })
    session.setCards([makeDueCard({ review: null })])

    // After setCards, current_card_side is 'cover', starting_side is 'front'
    expect(session.is_starting_side.value).toBe(false)
  })

  test('is_starting_side is true after startSession', () => {
    const session = useFlashcardSession({ study_all_cards: true, retry_failed_cards: false })
    session.setCards([makeDueCard({ review: null })])

    session.startSession()

    expect(session.is_starting_side.value).toBe(true)
  })

  test('is_starting_side is false after flipping away from starting side', () => {
    const session = useFlashcardSession({ study_all_cards: true, retry_failed_cards: false })
    session.setCards([makeDueCard({ review: null })])
    session.startSession()

    session.flipCurrentCard()

    expect(session.is_starting_side.value).toBe(false)
  })

  // ── updateConfig ───────────────────────────────────────────────────────────

  test('updateConfig with study_all_cards:true re-includes previously excluded cards', () => {
    const session = useFlashcardSession({ study_all_cards: false, retry_failed_cards: false })
    const cards = [makeNotDueCard(), makeNotDueCard(), makeDueCard({ review: null })]
    session.setCards(cards)

    expect(session.cards.value).toHaveLength(1) // only the due card

    session.updateConfig({ study_all_cards: true })

    expect(session.cards.value).toHaveLength(3) // all cards
  })

  test('updateConfig does not call _processCards when no cards have been set', () => {
    const session = useFlashcardSession({ study_all_cards: false, retry_failed_cards: false })

    // No setCards call — updateConfig should be a no-op on card list
    session.updateConfig({ study_all_cards: true })

    expect(session.cards.value).toHaveLength(0)
  })

  // ── daily caps ─────────────────────────────────────────────────────────────
  // Daily caps are now applied server-side in get_study_session_cards. The FE
  // composable just consumes the pre-sliced result, so no FE-side test for
  // max_reviews_per_day / max_new_per_day belongs here.

  // ── shuffle ────────────────────────────────────────────────────────────────

  test('shuffle:true still returns the correct number of cards', () => {
    const cards = Array.from({ length: 5 }, () => makeDueCard({ review: null }))
    const session = useFlashcardSession({
      study_all_cards: true,
      retry_failed_cards: false,
      shuffle: true
    })
    session.setCards(cards)

    expect(session.cards.value).toHaveLength(5)
  })

  // ── reviewed_count ─────────────────────────────────────────────────────────

  test('reviewed_count is 0 before any card is reviewed', () => {
    const session = useFlashcardSession({ study_all_cards: true, retry_failed_cards: false })
    session.setCards([makeDueCard({ review: null }), makeDueCard({ review: null })])

    expect(session.reviewed_count.value).toBe(0)
  })

  test('reviewed_count increments after a Good review', () => {
    const session = useFlashcardSession({ study_all_cards: true, retry_failed_cards: false })
    session.setCards([makeDueCard({ review: null }), makeDueCard({ review: null })])

    session.reviewCard(Rating.Good)

    expect(session.reviewed_count.value).toBe(1)
  })

  test('reviewed_count counts both passed and failed cards', () => {
    const session = useFlashcardSession({ study_all_cards: true, retry_failed_cards: false })
    session.setCards([makeDueCard({ review: null }), makeDueCard({ review: null })])

    session.reviewCard(Rating.Good)
    session.reviewCard(Rating.Again)

    expect(session.reviewed_count.value).toBe(2)
  })

  // ── remaining_due_count ────────────────────────────────────────────────────

  test('remaining_due_count is 0 when study_all_cards is true', () => {
    const session = useFlashcardSession({ study_all_cards: true, retry_failed_cards: false })
    session.setCards([makeDueCard({ review: null }), makeDueCard({ review: null })])

    expect(session.remaining_due_count.value).toBe(0)
  })

  test('remaining_due_count equals number of due cards when nothing reviewed yet', () => {
    const session = useFlashcardSession({ study_all_cards: false, retry_failed_cards: false })
    session.setCards([makeDueCard({ review: null }), makeDueCard({ review: null })])

    expect(session.remaining_due_count.value).toBe(2)
  })

  test('remaining_due_count decreases after reviewing a due card', () => {
    const session = useFlashcardSession({ study_all_cards: false, retry_failed_cards: false })
    session.setCards([makeDueCard({ review: null }), makeDueCard({ review: null })])

    session.reviewCard(Rating.Good)

    expect(session.remaining_due_count.value).toBe(1)
  })

  test('remaining_due_count excludes cards with a future due date', () => {
    const session = useFlashcardSession({ study_all_cards: false, retry_failed_cards: false })
    // Only 1 of the 2 raw cards is actually due
    session.setCards([makeDueCard({ review: null }), makeNotDueCard()])

    expect(session.remaining_due_count.value).toBe(1)
  })

  // ── next_card ──────────────────────────────────────────────────────────────

  test('next_card is the second card when two unreviewed cards exist', () => {
    const session = useFlashcardSession({ study_all_cards: true, retry_failed_cards: false })
    const cards = [makeDueCard({ review: null }), makeDueCard({ review: null })]
    session.setCards(cards)

    expect(session.next_card.value?.id).toBe(cards[1].id)
  })

  test('next_card is undefined when only one card in the deck', () => {
    const session = useFlashcardSession({ study_all_cards: true, retry_failed_cards: false })
    session.setCards([makeDueCard({ review: null })])

    expect(session.next_card.value).toBeUndefined()
  })

  test('next_card skips already-reviewed cards', () => {
    const session = useFlashcardSession({ study_all_cards: true, retry_failed_cards: false })
    const cards = [
      makeDueCard({ review: null }),
      makeDueCard({ review: null }),
      makeDueCard({ review: null })
    ]
    session.setCards(cards)

    // Review first card — now on second card; next should be third
    session.reviewCard(Rating.Good)

    expect(session.next_card.value?.id).toBe(cards[2].id)
  })

  // ── dropCard [obligation] ──────────────────────────────────────────────────
  // Deleting/moving a card mid-session must reset the next active card back to
  // its starting side — otherwise a flipped card left the next card back-side-up.

  test('dropCard resets current_card_side to the starting side when a card remains [obligation]', () => {
    const session = useFlashcardSession({ study_all_cards: true, retry_failed_cards: false })
    const cards = [makeDueCard({ review: null }), makeDueCard({ review: null })]
    session.setCards(cards)
    session.startSession() // 'front'
    session.flipCurrentCard() // now 'back'

    session.dropCard(cards[0].id)

    expect(session.mode.value).toBe('studying')
    expect(session.active_card.value).toBeDefined()
    expect(session.current_card_side.value).toBe('front')
  })

  test('dropCard resets to "back" as the starting side when flip_cards is true [obligation]', () => {
    const session = useFlashcardSession({
      study_all_cards: true,
      retry_failed_cards: false,
      flip_cards: true
    })
    const cards = [makeDueCard({ review: null }), makeDueCard({ review: null })]
    session.setCards(cards)
    session.startSession() // 'back' — starting side when flipped
    session.flipCurrentCard() // now 'front'

    session.dropCard(cards[0].id)

    expect(session.current_card_side.value).toBe('back')
  })

  test('dropCard does not force a side change when no cards remain [obligation]', () => {
    const session = useFlashcardSession({ study_all_cards: true, retry_failed_cards: false })
    const cards = [makeDueCard({ review: null })]
    session.setCards(cards)
    session.startSession() // 'front'
    session.flipCurrentCard() // now 'back'

    session.dropCard(cards[0].id)

    expect(session.mode.value).toBe('completed')
    expect(session.active_card.value).toBeUndefined()
    expect(session.current_card_side.value).toBe('back')
  })

  // ── is_cover ───────────────────────────────────────────────────────────────

  test('is_cover is true before startSession', () => {
    const session = useFlashcardSession({ study_all_cards: true, retry_failed_cards: false })
    session.setCards([makeDueCard({ review: null })])

    expect(session.is_cover.value).toBe(true)
  })

  test('is_cover is false after startSession', () => {
    const session = useFlashcardSession({ study_all_cards: true, retry_failed_cards: false })
    session.setCards([makeDueCard({ review: null })])

    session.startSession()

    expect(session.is_cover.value).toBe(false)
  })
})
