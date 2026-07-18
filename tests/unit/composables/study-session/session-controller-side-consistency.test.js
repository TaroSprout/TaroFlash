import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { createApp, h, ref } from 'vue'
import { Rating } from 'ts-fsrs'
import {
  provideStudySessionController,
  useInjectedStudySessionController
} from '@/views/study-session/composables/session-controller'

// ── Real session-engine + real deck-resolution ────────────────────────────────
// Unlike session-controller.test.js (which fakes every sub-composable to
// isolate orchestration), this suite runs the REAL engine and REAL
// deck-resolution so the preview-flip side and the side the card actually
// opens on are derived exactly as production wires them. Only the
// data-fetching/animation/UI seams are faked.

const { mockAwaitFlip } = vi.hoisted(() => ({
  mockAwaitFlip: vi.fn().mockResolvedValue(undefined)
}))

vi.mock('@/views/study-session/composables/card-preview', () => ({
  useCardPreview: () => ({
    next_card_side: ref('cover'),
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

vi.mock('@/views/study-session/composables/card-actions', () => ({
  useActiveCardActions: () => ({ onMove: vi.fn(), onDelete: vi.fn() })
}))

const { capturedSessionCardsOptions, sessionDecks } = await vi.hoisted(async () => {
  const { ref } = await import('vue')
  return { capturedSessionCardsOptions: { current: null }, sessionDecks: ref([]) }
})

vi.mock('@/views/study-session/composables/session-cards', () => ({
  useSessionCards: (options) => {
    capturedSessionCardsOptions.current = options
    return { loading: ref(false), sessionDecks }
  }
}))

vi.mock('@/views/study-session/composables/session-prefs', () => ({
  useSessionPrefs: () => ({ show_all_ratings: ref(false), toggleRatings: vi.fn() })
}))

const { mockFlushDeckReviews, mockSaveReview } = vi.hoisted(() => ({
  mockFlushDeckReviews: vi.fn(),
  mockSaveReview: vi.fn().mockResolvedValue(undefined)
}))

vi.mock('@/api/reviews', () => ({
  useFlushDeckReviews: () => mockFlushDeckReviews,
  useSaveReviewMutation: () => ({ mutate: vi.fn(), mutateAsync: mockSaveReview })
}))

vi.mock('@/stores/notice-store', () => ({
  useNoticeStore: () => ({ error: vi.fn(), success: vi.fn(), warn: vi.fn() })
}))

vi.mock('@/sfx/bus', () => ({
  emitSfx: vi.fn(),
  emitHoverSfx: vi.fn()
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key) => key })
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSessionDeck(overrides = {}) {
  return {
    id: 1,
    title: 'Deck',
    starting_side: 'random',
    shuffle: false,
    cover_config: null,
    card_attributes: null,
    desired_retention: 90,
    learning_steps: ['1m', '10m'],
    relearning_steps: ['10m'],
    leech_threshold: 8,
    max_interval: null,
    ...overrides
  }
}

function makeCard(overrides = {}) {
  return { id: 1, deck_id: 1, front_text: 'Q', back_text: 'A', review: null, ...overrides }
}

const mounted_apps = []

function makeController(deck_ids = [1], decks = [makeSessionDeck({ id: 1 })]) {
  sessionDecks.value = decks
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
      controller = provideStudySessionController({ deck_ids, onClosed })
      return () => h(Child)
    }
  }

  const app = createApp({ render: () => h(Parent) })
  app.mount(document.createElement('div'))
  mounted_apps.push(app)

  return { controller, injected, onClosed }
}

beforeEach(() => {
  mockAwaitFlip.mockClear()
  mockFlushDeckReviews.mockClear()
  sessionDecks.value = []
  sessionStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
  while (mounted_apps.length > 0) mounted_apps.pop().unmount()
})

describe('onCardReviewed — preview flip side agrees with the side the next card opens on [obligation]', () => {
  test('the side passed to awaitFlip equals display_side once the engine advances to that card [obligation]', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9) // random deck -> 'back'

    const { controller } = makeController()
    const c1 = makeCard({ id: 1, deck_id: 1 })
    const c2 = makeCard({ id: 2, deck_id: 1 })

    capturedSessionCardsOptions.current.seed([c1, c2])
    controller.startSession()

    await controller.onCardReviewed(Rating.Good)

    expect(mockAwaitFlip).toHaveBeenCalledTimes(1)
    const [side_passed_to_flip] = mockAwaitFlip.mock.calls[0]

    expect(side_passed_to_flip).toBe('back')
    expect(controller.active_card.value?.id).toBe(c2.id)
    expect(controller.display_side.value).toBe(side_passed_to_flip)
  })

  test('holds for a "front"/"back" (non-random) deck as well', async () => {
    const { controller } = makeController([1], [makeSessionDeck({ id: 1, starting_side: 'back' })])
    const c1 = makeCard({ id: 1, deck_id: 1 })
    const c2 = makeCard({ id: 2, deck_id: 1 })

    capturedSessionCardsOptions.current.seed([c1, c2])
    controller.startSession()

    await controller.onCardReviewed(Rating.Good)

    const [side_passed_to_flip] = mockAwaitFlip.mock.calls[0]
    expect(side_passed_to_flip).toBe('back')
    expect(controller.active_card.value?.id).toBe(c2.id)
    expect(controller.display_side.value).toBe(side_passed_to_flip)
  })
})

describe('multi-deck merged session — each card resolves from its OWN deck [obligation]', () => {
  test('a card from deck 2 resolves its starting side from deck 2, not the active deck (deck 1) [obligation]', async () => {
    const { controller } = makeController(
      [1, 2],
      [
        makeSessionDeck({ id: 1, starting_side: 'front' }),
        makeSessionDeck({ id: 2, starting_side: 'back' })
      ]
    )
    const c1 = makeCard({ id: 1, deck_id: 1 })
    const c2 = makeCard({ id: 2, deck_id: 2 })

    capturedSessionCardsOptions.current.seed([c1, c2])
    controller.startSession()

    expect(controller.display_side.value).toBe('front')

    await controller.onCardReviewed(Rating.Good)

    expect(controller.active_card.value?.id).toBe(c2.id)
    expect(controller.display_side.value).toBe('back')
  })
})
