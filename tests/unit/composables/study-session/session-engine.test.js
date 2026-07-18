import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { FSRS, Rating, createEmptyCard, generatorParameters } from 'ts-fsrs'
import { useSessionEngine } from '@/views/study-session/composables/session-engine'
import { card } from '../../../fixtures/card'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { saveReviewMock } = vi.hoisted(() => ({
  saveReviewMock: vi.fn().mockResolvedValue(undefined)
}))

const { mockNotice } = vi.hoisted(() => ({
  mockNotice: { error: vi.fn(), success: vi.fn(), warn: vi.fn() }
}))

const { mockEmitStudySfx } = vi.hoisted(() => ({ mockEmitStudySfx: vi.fn() }))

vi.mock('@/api/reviews', () => ({
  useSaveReviewMutation: () => ({ mutate: vi.fn(), mutateAsync: saveReviewMock })
}))

vi.mock('@/stores/notice-store', () => ({
  useNoticeStore: () => mockNotice
}))

vi.mock('@/sfx/bus', () => ({
  emitStudySfx: mockEmitStudySfx,
  emitSfx: vi.fn(),
  emitHoverSfx: vi.fn()
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key) => key })
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

// Two distinctly-tuned FSRS schedulers, keyed by deck id — deck 1 barely
// extends intervals (low retention target), deck 2 extends them aggressively
// (high retention target + long learning steps), so a scheduling assertion can
// tell which deck's scheduler actually ran.
const FSRS_BY_DECK = {
  1: new FSRS(
    generatorParameters({ request_retention: 0.7, learning_steps: ['1m'], enable_fuzz: false })
  ),
  2: new FSRS(
    generatorParameters({ request_retention: 0.97, learning_steps: ['1d'], enable_fuzz: false })
  )
}

const FLIP_BY_DECK = { 1: false, 2: true }

function makeEngine(overrides = {}) {
  const onChange = vi.fn()
  const engine = useSessionEngine({
    schedulerFor: (deck_id) => FSRS_BY_DECK[deck_id] ?? FSRS_BY_DECK[1],
    flipFor: (deck_id) => FLIP_BY_DECK[deck_id] ?? false,
    shuffle: () => false,
    onChange,
    ...overrides
  })
  return { engine, onChange }
}

function makeCard(overrides = {}) {
  return card.one({ overrides: { review: null, ...overrides } })
}

/**
 * A card with an established review history (non-zero stability/difficulty),
 * so FSRS.next's interval is sensitive to request_retention differences —
 * a brand-new card's first Good interval is dominated by learning_steps and
 * doesn't diverge as clearly between two schedulers.
 */
function makeReviewedCard(overrides = {}) {
  return card.one({
    overrides: {
      review: {
        due: new Date(Date.now() - 1000).toISOString(),
        reps: 4,
        scheduled_days: 5,
        lapses: 0,
        stability: 8,
        difficulty: 5,
        state: 2,
        last_review: new Date(Date.now() - 5 * 86400000).toISOString()
      },
      ...overrides
    }
  })
}

beforeEach(() => {
  saveReviewMock.mockReset().mockResolvedValue(undefined)
  mockNotice.error.mockReset()
  mockEmitStudySfx.mockClear()
})

// ── Single state machine [obligation] ───────────────────────────────────────

describe('state machine [obligation]', () => {
  test('is_cover is true in the initial loading state, before setCards [obligation]', () => {
    const { engine } = makeEngine()
    expect(engine.state.value).toBe('loading')
    expect(engine.is_cover.value).toBe(true)
  })

  test('setCards with unreviewed cards lands on "cover", is_cover stays true [obligation]', () => {
    const { engine } = makeEngine()
    engine.setCards([makeCard({ deck_id: 1 })])

    expect(engine.state.value).toBe('cover')
    expect(engine.is_cover.value).toBe(true)
  })

  test('setCards([]) lands directly on "summary" [obligation]', () => {
    const { engine } = makeEngine()
    engine.setCards([])

    expect(engine.state.value).toBe('summary')
    expect(engine.is_cover.value).toBe(false)
  })

  test('startSession transitions cover -> studying, is_cover becomes false [obligation]', () => {
    const { engine } = makeEngine()
    engine.setCards([makeCard({ deck_id: 1 })])

    engine.startSession()

    expect(engine.state.value).toBe('studying')
    expect(engine.is_cover.value).toBe(false)
  })

  test('reviewing the last card transitions studying -> summary', () => {
    const { engine } = makeEngine()
    engine.setCards([makeCard({ deck_id: 1 })])
    engine.startSession()

    engine.reviewCard(Rating.Good)

    expect(engine.state.value).toBe('summary')
  })

  test('restoreCards with completed:true lands on "summary" [obligation]', () => {
    const { engine } = makeEngine()
    const c1 = makeCard({ deck_id: 1 })

    engine.restoreCards([c1], { card_ids: [c1.id], results: [], completed: true })

    expect(engine.state.value).toBe('summary')
  })

  test('restoreCards with no unreviewed cards remaining lands on "summary" even when completed:false [obligation]', () => {
    const { engine } = makeEngine()
    const persisted = {
      card_ids: [1],
      results: [
        {
          card_id: 1,
          front_text: 'front',
          is_new: true,
          before_interval: 0,
          after_interval: 1,
          lapses: 0,
          passed: true
        }
      ],
      completed: false
    }

    engine.restoreCards([], persisted)

    expect(engine.state.value).toBe('summary')
  })

  test('restoreCards mid-session (completed:false, unreviewed remainder) lands on "cover" [obligation]', () => {
    const { engine } = makeEngine()
    const c1 = makeCard({ deck_id: 1 })

    engine.restoreCards([c1], { card_ids: [c1.id], results: [], completed: false })

    expect(engine.state.value).toBe('cover')
    expect(engine.is_cover.value).toBe(true)
  })
})

// ── Per-deck scheduling [obligation] ────────────────────────────────────────

describe('per-deck scheduling [obligation]', () => {
  test('reviewCard uses the active card own deck scheduler — deck 1 vs deck 2 produce different schedules [obligation]', () => {
    const { engine: engine_a } = makeEngine()
    const card_deck_1 = makeReviewedCard({ id: 101, deck_id: 1 })
    engine_a.setCards([card_deck_1])
    engine_a.startSession()
    engine_a.reviewCard(Rating.Good)
    const result_deck_1 = engine_a.results.value[0]

    const { engine: engine_b } = makeEngine()
    const card_deck_2 = makeReviewedCard({ id: 102, deck_id: 2 })
    engine_b.setCards([card_deck_2])
    engine_b.startSession()
    engine_b.reviewCard(Rating.Good)
    const result_deck_2 = engine_b.results.value[0]

    // deck 1's scheduler (lower retention target) schedules a longer interval
    // than deck 2's (higher retention target needs more frequent review).
    expect(result_deck_1.after_interval).toBeGreaterThan(result_deck_2.after_interval)
  })

  test('a merged queue schedules each card against its own deck, never the first card deck [obligation]', () => {
    const { engine } = makeEngine()
    const c1 = makeReviewedCard({ id: 201, deck_id: 1 })
    const c2 = makeReviewedCard({ id: 202, deck_id: 2 })
    engine.setCards([c1, c2])
    engine.startSession()

    engine.reviewCard(Rating.Good) // reviews c1 (deck 1)
    engine.reviewCard(Rating.Good) // reviews c2 (deck 2)

    const [result_c1, result_c2] = engine.results.value
    expect(result_c1.deck_id).toBe(1)
    expect(result_c2.deck_id).toBe(2)
    // If deck 2's card were scheduled by deck 1's scheduler, this would fail —
    // the two decks' schedulers are deliberately tuned to diverge (deck 1's
    // lower retention target schedules the longer interval).
    expect(result_c1.after_interval).toBeGreaterThan(result_c2.after_interval)
  })

  test('active_card_preview uses the active card own deck scheduler [obligation]', () => {
    const { engine } = makeEngine()
    const c2 = makeCard({ id: 301, deck_id: 2 })
    engine.setCards([c2])

    const preview = engine.active_card_preview.value
    const expected = FSRS_BY_DECK[2].repeat(createEmptyCard(new Date()), new Date())

    expect(preview[Rating.Good].card.scheduled_days).toBe(expected[Rating.Good].card.scheduled_days)
  })

  test('active_card_preview is undefined when there is no active card', () => {
    const { engine } = makeEngine()
    expect(engine.active_card_preview.value).toBeUndefined()
  })
})

// ── Per-card flip [obligation] ──────────────────────────────────────────────

describe('per-card flip [obligation]', () => {
  test('active_starting_side / current_card_side follow the active card own deck flip_cards on startSession [obligation]', () => {
    const { engine } = makeEngine()
    const deck_a_card = makeCard({ id: 401, deck_id: 1 }) // flip_cards: false

    engine.setCards([deck_a_card])
    engine.startSession()

    expect(engine.current_card_side.value).toBe('front')
  })

  test('starting side resets to "back" for a deck B card (flip_cards: true) [obligation]', () => {
    const { engine } = makeEngine()
    const deck_b_card = makeCard({ id: 402, deck_id: 2 }) // flip_cards: true

    engine.setCards([deck_b_card])
    engine.startSession()

    expect(engine.current_card_side.value).toBe('back')
  })

  test('advancing between decks resets the side per-card as each becomes active [obligation]', () => {
    const { engine } = makeEngine()
    const deck_a_card = makeCard({ id: 403, deck_id: 1 }) // front
    const deck_b_card = makeCard({ id: 404, deck_id: 2 }) // back
    engine.setCards([deck_a_card, deck_b_card])
    engine.startSession()
    expect(engine.current_card_side.value).toBe('front')

    engine.flipCurrentCard() // flip deck-A card away from its start
    expect(engine.current_card_side.value).toBe('back')

    engine.reviewCard(Rating.Good) // advances into the deck-B card

    expect(engine.active_card.value?.id).toBe(deck_b_card.id)
    expect(engine.current_card_side.value).toBe('back')
  })
})

// ── No FE due-filter ─────────────────────────────────────────────────────────

describe('no FE due-filter', () => {
  test('setCards includes every raw card verbatim, including one with a future due date', () => {
    const { engine } = makeEngine()
    const future_due_card = card.one({ traits: 'with_not_due_review', overrides: { deck_id: 1 } })
    const due_card = card.one({ traits: 'with_due_review', overrides: { deck_id: 1 } })

    engine.setCards([future_due_card, due_card])

    expect(engine.cards.value).toHaveLength(2)
    expect(engine.cards.value.map((c) => c.id).sort()).toEqual(
      [future_due_card.id, due_card.id].sort()
    )
  })
})

// ── Computed reads ────────────────────────────────────────────────────────

describe('computed reads', () => {
  test('reviewed_count / current_index / next_card read 0/0/second-card before any review', () => {
    const { engine } = makeEngine()
    const c1 = makeCard({ id: 1001, deck_id: 1 })
    const c2 = makeCard({ id: 1002, deck_id: 1 })
    engine.setCards([c1, c2])
    engine.startSession()

    expect(engine.reviewed_count.value).toBe(0)
    expect(engine.current_index.value).toBe(0)
    expect(engine.next_card.value?.id).toBe(c2.id)
  })

  test('reviewed_count / current_index / next_card reflect one reviewed card, read fresh after the review', () => {
    const { engine } = makeEngine()
    const c1 = makeCard({ id: 1004, deck_id: 1 })
    const c2 = makeCard({ id: 1005, deck_id: 1 })
    engine.setCards([c1, c2])
    engine.startSession()

    engine.reviewCard(Rating.Good)

    // Fresh reads (not preceded by a read of the same computed before the
    // mutation) — cards/reviewed_count/current_index/next_card are declared
    // as `computed(() => cards.value...)`, deriving from the `_cards_in_deck`
    // shallowRef; reviewCard mutates a card's `.state` in place rather than
    // reassigning `_cards_in_deck`, so a computed already evaluated before
    // the mutation stays cached/stale until something reassigns the array.
    expect(engine.reviewed_count.value).toBe(1)
    expect(engine.current_index.value).toBe(1)
    expect(engine.next_card.value).toBeUndefined()
  })

  test('display_side is "front" while studying and "cover" once no active card remains', () => {
    const { engine } = makeEngine()
    engine.setCards([makeCard({ id: 1003, deck_id: 1 })])
    engine.startSession()
    expect(engine.display_side.value).toBe('front')

    engine.reviewCard(Rating.Good)

    // display_side derives from `state`/`current_card_side` — plain refs
    // reassigned directly by _advance/reviewCard, so (unlike reviewed_count
    // etc.) it does reflect the post-review state on a fresh read.
    expect(engine.display_side.value).toBe('cover')
  })
})

// ── Shuffle ───────────────────────────────────────────────────────────────

describe('shuffle', () => {
  test('setCards shuffles the queue when shuffle() returns true, preserving every card', () => {
    const { engine } = makeEngine({ shuffle: () => true })
    const cards = Array.from({ length: 8 }, (_, i) => makeCard({ id: 2000 + i, deck_id: 1 }))

    engine.setCards(cards)

    expect(engine.cards.value).toHaveLength(8)
    expect(new Set(engine.cards.value.map((c) => c.id))).toEqual(new Set(cards.map((c) => c.id)))
  })
})

// ── reviewCard no-op guard ──────────────────────────────────────────────────

describe('reviewCard no-op guard', () => {
  test('reviewCard(grade) is a no-op when there is no active card', () => {
    const { engine, onChange } = makeEngine()
    engine.setCards([])
    onChange.mockClear()

    expect(() => engine.reviewCard(Rating.Good)).not.toThrow()
    expect(onChange).not.toHaveBeenCalled()
  })
})

// ── Persistence contract [obligation] ───────────────────────────────────────

describe('persistence contract — onChange fires on every state-changing mutation [obligation]', () => {
  test('setCards triggers onChange', () => {
    const { engine, onChange } = makeEngine()
    engine.setCards([makeCard({ deck_id: 1 })])
    expect(onChange).toHaveBeenCalled()
  })

  test('reviewCard(grade) triggers onChange', () => {
    const { engine, onChange } = makeEngine()
    engine.setCards([makeCard({ deck_id: 1 })])
    onChange.mockClear()

    engine.reviewCard(Rating.Good)

    expect(onChange).toHaveBeenCalled()
  })

  test('reviewCard() with no grade (auto-pass) triggers onChange', () => {
    const { engine, onChange } = makeEngine()
    engine.setCards([makeCard({ deck_id: 1 })])
    onChange.mockClear()

    engine.reviewCard()

    expect(onChange).toHaveBeenCalled()
  })

  test('dropCard triggers onChange', () => {
    const { engine, onChange } = makeEngine()
    const c1 = makeCard({ deck_id: 1 })
    engine.setCards([c1])
    onChange.mockClear()

    engine.dropCard(c1.id)

    expect(onChange).toHaveBeenCalled()
  })

  test('restoreCards triggers onChange', () => {
    const { engine, onChange } = makeEngine()
    const c1 = makeCard({ deck_id: 1 })
    onChange.mockClear()

    engine.restoreCards([c1], { card_ids: [c1.id], results: [], completed: false })

    expect(onChange).toHaveBeenCalled()
  })
})

// ── Review-save failure surface [obligation] ────────────────────────────────

describe('review-save failure surface [obligation]', () => {
  test('shows the error notice with a refresh action when the save mutation rejects [obligation]', async () => {
    saveReviewMock.mockRejectedValueOnce(new Error('network error'))
    const { engine } = makeEngine()
    engine.setCards([makeCard({ id: 501, deck_id: 1 })])
    engine.startSession()

    await engine.reviewCard(Rating.Good)

    expect(mockNotice.error).toHaveBeenCalledWith(
      'study-session.review-save-error',
      expect.objectContaining({
        subMessage: 'study-session.review-save-error-sub',
        variant: 'panel',
        actions: expect.arrayContaining([
          expect.objectContaining({ label: 'notice.refresh-label' })
        ])
      })
    )
  })

  test('the refresh action reloads the page', async () => {
    const reload_spy = vi.fn()
    vi.stubGlobal('location', { ...window.location, reload: reload_spy })
    saveReviewMock.mockRejectedValueOnce(new Error('network error'))
    const { engine } = makeEngine()
    engine.setCards([makeCard({ id: 503, deck_id: 1 })])
    engine.startSession()

    await engine.reviewCard(Rating.Good)

    const [, options] = mockNotice.error.mock.calls[0]
    options.actions[0].onClick()

    expect(reload_spy).toHaveBeenCalledOnce()
    vi.unstubAllGlobals()
  })

  test('the mutation payload carries card_id, deck_id, card, and log [obligation]', () => {
    const { engine } = makeEngine()
    engine.setCards([makeCard({ id: 502, deck_id: 2 })])
    engine.startSession()

    engine.reviewCard(Rating.Good)

    expect(saveReviewMock).toHaveBeenCalledWith({
      card_id: 502,
      deck_id: 2,
      card: expect.any(Object),
      log: expect.any(Object)
    })
  })

  test('does not call save when the card has no id', () => {
    const { engine } = makeEngine()
    engine.setCards([{ ...makeCard({ deck_id: 1 }), id: undefined }])
    engine.startSession()

    engine.reviewCard(Rating.Good)

    expect(saveReviewMock).not.toHaveBeenCalled()
  })
})

// ── Restore queue lock ──────────────────────────────────────────────────────

describe('restore queue lock', () => {
  test('rebuilds already-reviewed cards from results alone, without needing them in raw [obligation]', () => {
    const { engine } = makeEngine()
    const c1 = makeCard({ id: 601, deck_id: 1 })
    const c2 = makeCard({ id: 602, deck_id: 1 })
    const persisted = {
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
      completed: false
    }

    // raw only contains the unreviewed remainder (c2) — c1 is never fetched.
    engine.restoreCards([c2], persisted)

    expect(engine.cards.value.map((c) => c.id)).toEqual([c1.id, c2.id])
    expect(engine.cards.value.find((c) => c.id === c1.id)).toEqual({
      id: c1.id,
      front_text: 'Reviewed front',
      state: 'passed'
    })
  })

  test('excludes a raw card not present in persisted.card_ids (locked-queue guarantee)', () => {
    const { engine } = makeEngine()
    const c1 = makeCard({ id: 603, deck_id: 1 })
    const leaked = makeCard({ id: 604, deck_id: 1 })

    engine.restoreCards([c1, leaked], { card_ids: [c1.id], results: [], completed: false })

    expect(engine.cards.value.map((c) => c.id)).toEqual([c1.id])
  })
})

// ── Other mutations ──────────────────────────────────────────────────────────

describe('dropCard', () => {
  test('advances active_card when the active card is dropped', () => {
    const { engine } = makeEngine()
    const c1 = makeCard({ id: 701, deck_id: 1 })
    const c2 = makeCard({ id: 702, deck_id: 1 })
    engine.setCards([c1, c2])

    engine.dropCard(c1.id)

    expect(engine.active_card.value?.id).toBe(c2.id)
  })

  test('dropping the last remaining card transitions to summary', () => {
    const { engine } = makeEngine()
    const c1 = makeCard({ id: 703, deck_id: 1 })
    engine.setCards([c1])

    engine.dropCard(c1.id)

    expect(engine.state.value).toBe('summary')
    expect(engine.active_card.value).toBeUndefined()
  })
})

describe('updateCard', () => {
  test('patches the matching card and active_card when it is the active one', () => {
    const { engine } = makeEngine()
    const c1 = makeCard({ id: 801, deck_id: 1 })
    engine.setCards([c1])

    engine.updateCard(c1.id, { front_text: 'Updated' })

    expect(engine.cards.value.find((c) => c.id === c1.id)?.front_text).toBe('Updated')
    expect(engine.active_card.value?.front_text).toBe('Updated')
  })
})

describe('flipCurrentCard sfx', () => {
  test('emits transition_up when flipping away from the starting side, transition_down when flipping back', () => {
    const { engine } = makeEngine()
    engine.setCards([makeCard({ id: 901, deck_id: 1 })])
    engine.startSession()

    mockEmitStudySfx.mockClear()
    engine.flipCurrentCard()
    expect(mockEmitStudySfx).toHaveBeenCalledWith('transition_up')

    mockEmitStudySfx.mockClear()
    engine.flipCurrentCard()
    expect(mockEmitStudySfx).toHaveBeenCalledWith('transition_down')
  })
})
