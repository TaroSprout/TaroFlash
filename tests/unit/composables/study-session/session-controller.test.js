import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { createApp, h, nextTick, ref } from 'vue'
import {
  provideStudySessionController,
  useInjectedStudySessionController
} from '@/views/study-session/composables/session-controller'

// ── Hoisted fakes for every sub-composable session-controller orchestrates ────
// session-controller.ts is a pure orchestration layer: it wires together
// useFlashcardSession, useCardPreview, useCardEdit, useActiveCardActions,
// useSessionCards, useFlushDeckReviews, useUpsertMemberMutation and
// useMemberStore. Each of those already has its own dedicated unit test, so
// here they're faked out entirely — this suite only exercises the
// orchestration contract described in the obligations.

const { mode, results, reviewed_count, is_cover, active_card, next_card, config } =
  await vi.hoisted(async () => {
    const { ref } = await import('vue')
    return {
      mode: ref('studying'),
      results: ref([]),
      reviewed_count: ref(0),
      is_cover: ref(false),
      active_card: ref({ id: 1, deck_id: 1 }),
      next_card: ref(undefined),
      config: { study_all_cards: false }
    }
  })

const { mockReviewCard, mockAwaitFlip, mockRestoreCards, mockStartSession } = vi.hoisted(() => ({
  mockReviewCard: vi.fn(),
  mockAwaitFlip: vi.fn().mockResolvedValue(undefined),
  mockRestoreCards: vi.fn(),
  mockStartSession: vi.fn()
}))

vi.mock('@/views/study-session/composables/flashcard-session', () => ({
  useFlashcardSession: () => ({
    mode,
    cards: ref([]),
    results,
    current_card_side: ref('front'),
    current_index: ref(0),
    active_card,
    active_card_preview: ref(undefined),
    reviewed_count,
    is_starting_side: ref(true),
    config,
    show_all_ratings: ref(false),
    next_card,
    is_cover,
    reviewCard: mockReviewCard,
    setCards: vi.fn(),
    restoreCards: mockRestoreCards,
    setSessionMeta: vi.fn(),
    startSession: mockStartSession,
    flipCurrentCard: vi.fn(),
    dropCard: vi.fn(),
    updateCard: vi.fn()
  })
}))

vi.mock('@/views/study-session/composables/card-preview', () => ({
  useCardPreview: () => ({
    next_card_side: ref('front'),
    preview_style: ref({}),
    onDragProgress: vi.fn(),
    onNextCardFlipped: vi.fn(),
    awaitFlip: mockAwaitFlip
  })
}))

vi.mock('@/views/study-session/composables/card-edit', () => ({
  useCardEdit: () => ({
    editing: ref(false),
    saving: ref(false),
    start: vi.fn(),
    stop: vi.fn(),
    update: vi.fn()
  })
}))

const { capturedActiveCardActionsOptions } = vi.hoisted(() => ({
  capturedActiveCardActionsOptions: { current: null }
}))

vi.mock('@/views/study-session/composables/card-actions', () => ({
  useActiveCardActions: (options) => {
    capturedActiveCardActionsOptions.current = options
    return {
      onMove: vi.fn(),
      onDelete: vi.fn()
    }
  }
}))

const { mockOnMissingDeck, capturedSessionCardsOptions } = vi.hoisted(() => ({
  mockOnMissingDeck: { current: null },
  capturedSessionCardsOptions: { current: null }
}))

vi.mock('@/views/study-session/composables/session-cards', () => ({
  useSessionCards: (options) => {
    mockOnMissingDeck.current = options.onMissingDeck
    capturedSessionCardsOptions.current = options
    return { loading: ref(false) }
  }
}))

const { mockFlushDeckReviews } = vi.hoisted(() => ({ mockFlushDeckReviews: vi.fn() }))

vi.mock('@/api/reviews', () => ({
  useFlushDeckReviews: () => mockFlushDeckReviews
}))

const { mockUpsertMember, mockMemberStore } = vi.hoisted(() => ({
  mockUpsertMember: { mutate: vi.fn() },
  mockMemberStore: {
    id: 'member-1',
    preferences: { study: { show_all_ratings: false } }
  }
}))

vi.mock('@/api/members', () => ({
  useUpsertMemberMutation: () => mockUpsertMember
}))

vi.mock('@/stores/member', () => ({
  useMemberStore: () => mockMemberStore
}))

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))

vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))

// ── Host components so provide/inject has a component context ─────────────────
// provide() only reaches descendant component instances, so the injected
// assertion needs a real parent → child pair, not a single setup() calling
// both. See .claude/rules/testing-composables.md.

// Every makeController() mounts a fresh app whose watch(mode) keeps observing
// the shared hoisted `mode` ref for as long as the app stays mounted. Without
// unmounting between tests, earlier tests' watchers keep firing on later
// mode.value assignments and inflate call counts.
const mounted_apps = []

function makeController(overrides = {}) {
  const onFinished = vi.fn()
  const onClosed = vi.fn()
  let controller
  let injected

  const Child = {
    setup() {
      injected = useInjectedStudySessionController()
      return () => null
    }
  }

  const Parent = {
    setup() {
      controller = provideStudySessionController({
        decks: [{ id: 1 }, { id: 2 }],
        onFinished,
        onClosed,
        ...overrides
      })
      return () => h(Child)
    }
  }

  const app = createApp({ render: () => h(Parent) })
  app.mount(document.createElement('div'))
  mounted_apps.push(app)

  return { controller, injected, onFinished, onClosed, app }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('session-controller', () => {
  beforeEach(() => {
    mode.value = 'studying'
    results.value = []
    reviewed_count.value = 0
    is_cover.value = false
    active_card.value = { id: 1, deck_id: 1 }
    next_card.value = undefined
    mockReviewCard.mockClear()
    mockAwaitFlip.mockClear()
    mockRestoreCards.mockClear()
    mockStartSession.mockClear()
    mockFlushDeckReviews.mockClear()
    mockUpsertMember.mutate.mockClear()
    mockEmitSfx.mockClear()
    mockMemberStore.id = 'member-1'
    mockMemberStore.preferences = { study: { show_all_ratings: false } }
  })

  afterEach(() => {
    while (mounted_apps.length > 0) mounted_apps.pop().unmount()
  })

  // ── provide/inject wiring ────────────────────────────────────────────────

  test('useInjectedStudySessionController returns the same instance provideStudySessionController set up', () => {
    const { controller, injected, app } = makeController()
    expect(injected).toBe(controller)
    app.unmount()
  })

  test('useInjectedStudySessionController throws when nothing was provided above it', () => {
    const Orphan = {
      setup() {
        useInjectedStudySessionController()
        return () => null
      }
    }
    const app = createApp({ render: () => h(Orphan) })

    expect(() => app.mount(document.createElement('div'))).toThrow(
      'No StudySessionController provided above this component'
    )
  })

  // ── requestClose [obligation] ──────────────────────────────────────────────

  describe('requestClose [obligation]', () => {
    test('calls onClosed (not mode=completed) when is_cover is true', () => {
      is_cover.value = true
      reviewed_count.value = 5
      const { controller, onClosed } = makeController()

      controller.requestClose()

      expect(onClosed).toHaveBeenCalledOnce()
      expect(mode.value).toBe('studying')
    })

    test('calls onClosed when reviewed_count is 0, even if is_cover is false', () => {
      is_cover.value = false
      reviewed_count.value = 0
      const { controller, onClosed } = makeController()

      controller.requestClose()

      expect(onClosed).toHaveBeenCalledOnce()
      expect(mode.value).toBe('studying')
    })

    test('sets mode to "completed" (not onClosed) when not is_cover and reviewed_count > 0', () => {
      is_cover.value = false
      reviewed_count.value = 2
      const { controller, onClosed } = makeController()

      controller.requestClose()

      expect(onClosed).not.toHaveBeenCalled()
      expect(mode.value).toBe('completed')
    })
  })

  // ── watch(mode): onFinished fires only on the transition into 'completed' [obligation] ─

  describe('watch(mode) → finishSession [obligation]', () => {
    test('flips to "completed" fires onFinished(results) exactly once, with the session flushed per deck', async () => {
      results.value = [{ card_id: 1, passed: true }]
      const { onFinished } = makeController()

      mode.value = 'completed'
      await nextTick()

      expect(onFinished).toHaveBeenCalledOnce()
      expect(onFinished).toHaveBeenCalledWith(results.value)
      expect(mockFlushDeckReviews).toHaveBeenCalledTimes(2)
      expect(mockFlushDeckReviews).toHaveBeenCalledWith(1)
      expect(mockFlushDeckReviews).toHaveBeenCalledWith(2)
    })

    test('re-assigning mode to "studying" then back does not double-fire for the same completed transition', async () => {
      const { onFinished } = makeController()

      mode.value = 'studying'
      await nextTick()
      expect(onFinished).not.toHaveBeenCalled()
    })

    test('assigning mode="completed" a second time in a row (no intervening change) does not re-fire', async () => {
      const { onFinished } = makeController()

      mode.value = 'completed'
      await nextTick()
      onFinished.mockClear()
      mockFlushDeckReviews.mockClear()

      mode.value = 'completed'
      await nextTick()

      expect(onFinished).not.toHaveBeenCalled()
      expect(mockFlushDeckReviews).not.toHaveBeenCalled()
    })
  })

  // ── onCardReviewed no-op guards [obligation] ────────────────────────────────

  describe('onCardReviewed [obligation]', () => {
    test('is a no-op when there is no active_card.value.id', async () => {
      active_card.value = { id: undefined, deck_id: 1 }
      const { controller } = makeController()

      await controller.onCardReviewed('good')

      expect(mockReviewCard).not.toHaveBeenCalled()
    })

    test('is a no-op when mode is not "studying"', async () => {
      mode.value = 'completed'
      const { controller } = makeController()

      await controller.onCardReviewed('good')

      expect(mockReviewCard).not.toHaveBeenCalled()
    })

    test('reviews the card when active_card has an id and mode is "studying"', async () => {
      active_card.value = { id: 1, deck_id: 1 }
      mode.value = 'studying'
      const { controller } = makeController()

      await controller.onCardReviewed('good')

      expect(mockReviewCard).toHaveBeenCalledWith('good')
    })

    test('awaits the flip animation before reviewing when a next_card exists', async () => {
      active_card.value = { id: 1, deck_id: 1 }
      mode.value = 'studying'
      next_card.value = { id: 2 }
      const { controller } = makeController()

      await controller.onCardReviewed('good')

      expect(mockAwaitFlip).toHaveBeenCalledOnce()
      expect(mockReviewCard).toHaveBeenCalledWith('good')
    })
  })

  // ── toggleRatings [obligation] ──────────────────────────────────────────────

  describe('toggleRatings', () => {
    test('flips show_all_ratings and upserts the member preferences', () => {
      const { controller } = makeController()

      controller.toggleRatings()

      expect(controller.show_all_ratings.value).toBe(true)
      expect(mockEmitSfx).toHaveBeenCalledWith('snappy_button_5')
      expect(mockUpsertMember.mutate).toHaveBeenCalledWith({
        id: 'member-1',
        preferences: expect.objectContaining({
          study: expect.objectContaining({ show_all_ratings: true })
        })
      })
    })

    test('is a no-op upsert when the member store has no id', () => {
      mockMemberStore.id = undefined
      const { controller } = makeController()

      controller.toggleRatings()

      expect(mockUpsertMember.mutate).not.toHaveBeenCalled()
    })
  })

  // ── can_edit ─────────────────────────────────────────────────────────────

  test('can_edit is true only when not loading, not editing, and not is_cover', () => {
    is_cover.value = false
    const { controller } = makeController()
    expect(controller.can_edit.value).toBe(true)
  })

  test('can_edit is false while is_cover is true', () => {
    is_cover.value = true
    const { controller } = makeController()
    expect(controller.can_edit.value).toBe(false)
  })

  // ── onMissingDeck wiring: passed straight through to onClosed ──────────────

  test('useSessionCards onMissingDeck calls onClosed', () => {
    const { onClosed } = makeController()

    mockOnMissingDeck.current()

    expect(onClosed).toHaveBeenCalledOnce()
  })

  // ── getter wiring passed to sub-composables ─────────────────────────────────

  test('useActiveCardActions deck_id getter reads active_card.value.deck_id', () => {
    active_card.value = { id: 1, deck_id: 42 }
    makeController()

    expect(capturedActiveCardActionsOptions.current.deck_id()).toBe(42)
  })

  test('useSessionCards deckIds/studyAllCards getters read from the decks option and config', () => {
    config.study_all_cards = true
    makeController({ decks: [{ id: 10 }, { id: 20 }] })

    expect(capturedSessionCardsOptions.current.deckIds()).toEqual([10, 20])
    expect(capturedSessionCardsOptions.current.studyAllCards()).toBe(true)
    config.study_all_cards = false
  })

  // ── onRestore: refresh-restore drops the user back into the card, not the cover ─

  test('useSessionCards restore calls restoreCards and, while studying, resumes silently', () => {
    mode.value = 'studying'
    makeController()

    capturedSessionCardsOptions.current.restore('restore-arg')

    expect(mockRestoreCards).toHaveBeenCalledWith('restore-arg')
    expect(mockStartSession).toHaveBeenCalledWith({ silent: true })
  })

  test('useSessionCards restore does not resume when mode is not studying', () => {
    mode.value = 'completed'
    makeController()

    capturedSessionCardsOptions.current.restore('restore-arg')

    expect(mockRestoreCards).toHaveBeenCalledWith('restore-arg')
    expect(mockStartSession).not.toHaveBeenCalled()
  })
})
