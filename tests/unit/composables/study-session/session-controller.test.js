import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { createApp, h, nextTick, ref } from 'vue'
import {
  provideStudySessionController,
  useInjectedStudySessionController
} from '@/views/study-session/composables/session-controller'

// ── Hoisted fakes for every sub-composable the controller orchestrates ────────
// session-controller.ts is a pure composition root: it wires the deck
// resolution, the deck-blind engine, card edit/preview/actions, review
// flushing, and the prefs seam, then provides the whole bundle. Every
// sub-composable already has its own dedicated unit test, so here they're
// faked out entirely — this suite exercises only the orchestration contract.

const { state, results, reviewed_count, is_cover, active_card, next_card, cards } =
  await vi.hoisted(async () => {
    const { ref } = await import('vue')
    return {
      state: ref('studying'),
      results: ref([]),
      reviewed_count: ref(0),
      is_cover: ref(false),
      active_card: ref({ id: 1, deck_id: 1 }),
      next_card: ref(undefined),
      cards: ref([])
    }
  })

const { mockReviewCard, mockAwaitFlip, mockRestoreCards, mockStartSession, mockSetCards } =
  vi.hoisted(() => ({
    mockReviewCard: vi.fn(),
    mockAwaitFlip: vi.fn().mockResolvedValue(undefined),
    mockRestoreCards: vi.fn(),
    mockStartSession: vi.fn(),
    mockSetCards: vi.fn()
  }))

const { capturedEngineDeps } = vi.hoisted(() => ({ capturedEngineDeps: { current: null } }))

vi.mock('@/views/study-session/composables/session-engine', () => ({
  useSessionEngine: (deps) => {
    capturedEngineDeps.current = deps
    return {
      state,
      current_card_side: ref('front'),
      display_side: ref('front'),
      cards,
      results,
      reviewed_count,
      current_index: ref(0),
      is_starting_side: ref(true),
      active_card,
      active_card_preview: ref(undefined),
      next_card,
      is_cover,
      setCards: mockSetCards,
      restoreCards: mockRestoreCards,
      startSession: mockStartSession,
      flipCurrentCard: vi.fn(),
      reviewCard: mockReviewCard,
      dropCard: vi.fn(),
      updateCard: vi.fn()
    }
  }
}))

const { capturedResolution } = vi.hoisted(() => ({ capturedResolution: { current: null } }))

vi.mock('@/views/study-session/deck-resolution', () => ({
  buildDeckResolution: (decksGetter) => {
    const resolution = {
      appearanceFor: vi.fn(() => ({})),
      schedulerFor: vi.fn(),
      flipFor: vi.fn((deck_id) => deck_id === 2),
      thresholdFor: vi.fn(() => 8),
      covers: { value: [] },
      shuffle: { value: false },
      _decksGetter: decksGetter
    }
    capturedResolution.current = resolution
    return resolution
  },
  provideDeckResolution: vi.fn()
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
    return { onMove: vi.fn(), onDelete: vi.fn() }
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
    return { loading: ref(false), sessionDecks: ref([]) }
  }
}))

const { mockShowAllRatings, mockToggleRatings } = await vi.hoisted(async () => {
  const { ref } = await import('vue')
  return { mockShowAllRatings: ref(false), mockToggleRatings: vi.fn() }
})

vi.mock('@/views/study-session/composables/session-prefs', () => ({
  useSessionPrefs: () => ({
    show_all_ratings: mockShowAllRatings,
    toggleRatings: mockToggleRatings
  })
}))

const { mockFlushDeckReviews } = vi.hoisted(() => ({ mockFlushDeckReviews: vi.fn() }))

vi.mock('@/api/reviews', () => ({
  useFlushDeckReviews: () => mockFlushDeckReviews
}))

// ── Host components so provide/inject has a component context ─────────────────

const mounted_apps = []

function makeController(overrides = {}) {
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
      controller = provideStudySessionController({ deck_ids: [1, 2], onClosed, ...overrides })
      return () => h(Child)
    }
  }

  const app = createApp({ render: () => h(Parent) })
  app.mount(document.createElement('div'))
  mounted_apps.push(app)

  return { controller, injected, onClosed, app }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('session-controller', () => {
  beforeEach(() => {
    state.value = 'studying'
    results.value = []
    reviewed_count.value = 0
    is_cover.value = false
    active_card.value = { id: 1, deck_id: 1 }
    next_card.value = undefined
    cards.value = []
    mockReviewCard.mockClear()
    mockAwaitFlip.mockClear()
    mockRestoreCards.mockClear()
    mockStartSession.mockClear()
    mockSetCards.mockClear()
    mockFlushDeckReviews.mockClear()
    mockToggleRatings.mockClear()
    mockShowAllRatings.value = false
    capturedEngineDeps.current = null
    sessionStorage.clear()
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

  // ── requestClose ─────────────────────────────────────────────────────────

  describe('requestClose', () => {
    test('calls onClosed (does not transition to summary) when is_cover is true', () => {
      is_cover.value = true
      reviewed_count.value = 5
      const { controller, onClosed } = makeController()

      controller.requestClose()

      expect(onClosed).toHaveBeenCalledOnce()
      expect(state.value).toBe('studying')
    })

    test('calls onClosed when reviewed_count is 0, even if is_cover is false', () => {
      is_cover.value = false
      reviewed_count.value = 0
      const { controller, onClosed } = makeController()

      controller.requestClose()

      expect(onClosed).toHaveBeenCalledOnce()
      expect(state.value).toBe('studying')
    })

    test('sets state to "summary" (not onClosed) when not is_cover and reviewed_count > 0', () => {
      is_cover.value = false
      reviewed_count.value = 2
      const { controller, onClosed } = makeController()

      controller.requestClose()

      expect(onClosed).not.toHaveBeenCalled()
      expect(state.value).toBe('summary')
    })
  })

  // ── review flush on reaching summary [obligation] ───────────────────────

  describe('watch(state) — flush on the transition into summary [obligation]', () => {
    test('flushes every session deck once state flips to "summary" [obligation]', async () => {
      const { controller: _controller } = makeController()

      state.value = 'summary'
      await Promise.resolve()

      expect(mockFlushDeckReviews).toHaveBeenCalledTimes(2)
      expect(mockFlushDeckReviews).toHaveBeenCalledWith(1)
      expect(mockFlushDeckReviews).toHaveBeenCalledWith(2)
    })

    test('does not flush when state changes to something other than "summary"', async () => {
      makeController()

      state.value = 'cover'
      await Promise.resolve()

      expect(mockFlushDeckReviews).not.toHaveBeenCalled()
    })
  })

  // ── onCardReviewed no-op guards ──────────────────────────────────────────

  describe('onCardReviewed', () => {
    test('is a no-op when there is no active_card.value.id', async () => {
      active_card.value = { id: undefined, deck_id: 1 }
      const { controller } = makeController()

      await controller.onCardReviewed('good')

      expect(mockReviewCard).not.toHaveBeenCalled()
    })

    test('is a no-op when state is not "studying"', async () => {
      state.value = 'summary'
      const { controller } = makeController()

      await controller.onCardReviewed('good')

      expect(mockReviewCard).not.toHaveBeenCalled()
    })

    test('reviews the card when active_card has an id and state is "studying"', async () => {
      active_card.value = { id: 1, deck_id: 1 }
      state.value = 'studying'
      const { controller } = makeController()

      await controller.onCardReviewed('good')

      expect(mockReviewCard).toHaveBeenCalledWith('good')
    })

    test('awaits the flip animation, resolved to the next card own deck side, before reviewing [obligation]', async () => {
      active_card.value = { id: 1, deck_id: 1 }
      state.value = 'studying'
      next_card.value = { id: 2, deck_id: 2 }
      const { controller } = makeController()

      await controller.onCardReviewed('good')

      // flipFor(2) is mocked to true -> the next card (deck 2) flips to 'back'.
      expect(mockAwaitFlip).toHaveBeenCalledWith('back')
      expect(mockReviewCard).toHaveBeenCalledWith('good')
    })
  })

  // ── toggleRatings [obligation] ──────────────────────────────────────────

  test('toggleRatings delegates to the session-prefs seam', () => {
    const { controller } = makeController()
    controller.toggleRatings()
    expect(mockToggleRatings).toHaveBeenCalledOnce()
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

  test('useSessionCards deckIds getter reads from the deck_ids option', () => {
    makeController({ deck_ids: [10, 20] })

    expect(capturedSessionCardsOptions.current.deckIds()).toEqual([10, 20])
  })

  // ── engine deps: injected deck-resolution accessors, seed = engine.setCards ─

  test('the engine is wired to the deck-resolution schedulerFor/flipFor and shuffle accessors [obligation]', () => {
    makeController()

    expect(capturedEngineDeps.current.schedulerFor).toBe(capturedResolution.current.schedulerFor)
    expect(capturedEngineDeps.current.flipFor).toBe(capturedResolution.current.flipFor)
    expect(capturedEngineDeps.current.shuffle()).toBe(false)
  })

  test('useSessionCards seed is wired straight to engine.setCards [obligation]', () => {
    makeController()

    const cards_arg = [{ id: 1 }]
    capturedSessionCardsOptions.current.seed(cards_arg)

    expect(mockSetCards).toHaveBeenCalledWith(cards_arg)
  })

  // ── onRestore: refresh-restore drops the user back into the card, not the cover [obligation] ─

  test('onRestore calls restoreCards and, when not landing on summary, resumes silently [obligation]', () => {
    state.value = 'studying'
    makeController()

    const persisted = { card_ids: [1], results: [], completed: false }
    capturedSessionCardsOptions.current.restore(['raw-card'], persisted)

    expect(mockRestoreCards).toHaveBeenCalledWith(['raw-card'], {
      card_ids: [1],
      results: [],
      completed: false
    })
    expect(mockStartSession).toHaveBeenCalledWith({ silent: true })
  })

  test('onRestore does not resume when the engine lands on "summary" [obligation]', () => {
    state.value = 'summary'
    makeController()

    capturedSessionCardsOptions.current.restore(['raw-card'], {
      card_ids: [1],
      results: [],
      completed: true
    })

    expect(mockRestoreCards).toHaveBeenCalled()
    expect(mockStartSession).not.toHaveBeenCalled()
  })

  // ── persist contract: onChange writes {deck_ids, card_ids, results, completed} [obligation] ─

  test('engine onChange persists {deck_ids, card_ids, results, completed} via the persisted-session ref [obligation]', async () => {
    cards.value = [{ id: 1 }, { id: 2 }]
    results.value = [{ card_id: 1, passed: true }]
    state.value = 'studying'
    makeController({ deck_ids: [7, 8] })

    capturedEngineDeps.current.onChange()
    await nextTick()

    // The controller's persist() writes through usePersistedSession — assert
    // the write landed in sessionStorage under the shared storage key.
    const persisted = JSON.parse(sessionStorage.getItem('study-session'))
    expect(persisted).toEqual({
      deck_ids: [7, 8],
      card_ids: [1, 2],
      results: [{ card_id: 1, passed: true }],
      completed: false
    })
  })

  test('persist marks completed:true once state reaches "summary" [obligation]', async () => {
    state.value = 'summary'
    makeController({ deck_ids: [1] })

    capturedEngineDeps.current.onChange()
    await nextTick()

    const persisted = JSON.parse(sessionStorage.getItem('study-session'))
    expect(persisted.completed).toBe(true)
  })
})
