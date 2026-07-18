import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import CardStage from '@/views/study-session/session-studying/card/card-stage.vue'
import { PrimedGradeKey } from '@/views/study-session/session-studying/card/primed-grade-context'

// ── Mocks ─────────────────────────────────────────────────────────────────────
// card-stage.vue no longer takes props or emits events — it self-injects the
// full controller + deck resolution + primed-grade context.

const {
  loading,
  editing,
  active_card,
  active_card_preview,
  display_side,
  next_card,
  next_card_side,
  preview_style,
  show_all_ratings
} = await vi.hoisted(async () => {
  const { ref } = await import('vue')
  return {
    loading: ref(false),
    editing: ref(false),
    active_card: ref(undefined),
    active_card_preview: ref(undefined),
    display_side: ref('front'),
    next_card: ref(undefined),
    next_card_side: ref('cover'),
    preview_style: ref({}),
    show_all_ratings: ref(false)
  }
})

const {
  mockStartSession,
  mockFlipCurrentCard,
  mockOnCardReviewed,
  mockOnDragProgress,
  mockOnNextCardFlipped,
  mockOnEditUpdate
} = vi.hoisted(() => ({
  mockStartSession: vi.fn(),
  mockFlipCurrentCard: vi.fn(),
  mockOnCardReviewed: vi.fn(),
  mockOnDragProgress: vi.fn(),
  mockOnNextCardFlipped: vi.fn(),
  mockOnEditUpdate: vi.fn()
}))

vi.mock('@/views/study-session/composables/session-controller', () => ({
  useInjectedStudySessionController: () => ({
    loading,
    editing,
    active_card,
    active_card_preview,
    display_side,
    next_card,
    next_card_side,
    preview_style,
    show_all_ratings,
    startSession: mockStartSession,
    flipCurrentCard: mockFlipCurrentCard,
    onCardReviewed: mockOnCardReviewed,
    onDragProgress: mockOnDragProgress,
    onNextCardFlipped: mockOnNextCardFlipped,
    onEditUpdate: mockOnEditUpdate
  })
}))

// Deck resolution is an inject seam; these tests don't exercise the cover
// carousel, so a single-cover (idle) resolution keeps it inert.
vi.mock('@/views/study-session/deck-resolution', () => ({
  useDeckResolution: () => ({ appearanceFor: () => ({}), covers: { value: [] } })
}))

const { mockRegister } = vi.hoisted(() => ({
  mockRegister: vi.fn().mockReturnValue(() => {})
}))

vi.mock('@/composables/ui/gestures', () => ({
  useGestures: vi.fn(() => ({ register: mockRegister }))
}))

vi.mock('@/composables/shortcuts', () => ({
  useShortcuts: vi.fn(() => ({
    register: vi.fn(),
    dispose: vi.fn(),
    clearScope: vi.fn()
  }))
}))

vi.mock('@/sfx/bus', () => ({
  emitSfx: vi.fn(),
  emitStudySfx: vi.fn(),
  emitHoverSfx: vi.fn()
}))

const { mockCoverCardBeforeEnter, mockCoverCardEnter } = vi.hoisted(() => ({
  mockCoverCardBeforeEnter: vi.fn(),
  mockCoverCardEnter: vi.fn((_el, done) => {
    done()
    return { kill: vi.fn() }
  })
}))

vi.mock('@/utils/animations/session-intro', () => ({
  coverCardBeforeEnter: mockCoverCardBeforeEnter,
  coverCardEnter: mockCoverCardEnter
}))

// ── Stubs ─────────────────────────────────────────────────────────────────────

const StudyCardStub = defineComponent({
  name: 'StudyCard',
  props: ['card', 'side', 'options', 'show_all_ratings', 'cover_override'],
  emits: ['started', 'side-changed', 'reviewed', 'drag-progress', 'drag-rating'],
  setup(props, { expose }) {
    // useCoverCarousel reads the active card's element via el(); expose it so the
    // carousel's watcher doesn't blow up resolving the (idle) card element.
    expose({ rate: vi.fn(), el: () => undefined })
    return () =>
      h('div', {
        'data-testid': 'study-card-stub',
        'data-show-all-ratings': props.show_all_ratings ?? null
      })
  }
})

const StudyCardEditStub = defineComponent({
  name: 'StudyCardEdit',
  props: ['card', 'side'],
  emits: ['update'],
  setup() {
    return () => h('div', { 'data-testid': 'study-card-edit-stub' })
  }
})

const CardStub = defineComponent({
  name: 'Card',
  props: ['side', 'card_attributes', 'cover_config'],
  emits: ['flip-complete'],
  setup() {
    return () => h('div', { 'data-testid': 'card-stub' })
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeCard(id = 1) {
  return { id, deck_id: 1, front: 'Q', back: 'A', state: 'unreviewed' }
}

function mountCardStage(overrides = {}) {
  loading.value = overrides.loading ?? false
  editing.value = overrides.editing ?? false
  active_card.value = 'active_card' in overrides ? overrides.active_card : undefined
  active_card_preview.value = overrides.active_card_preview
  display_side.value = overrides.display_side ?? 'front'
  next_card.value = 'next_card' in overrides ? overrides.next_card : undefined
  next_card_side.value = overrides.next_card_side ?? 'cover'
  show_all_ratings.value = overrides.show_all_ratings ?? false

  return mount(CardStage, {
    attachTo: document.body,
    global: {
      stubs: {
        StudyCard: StudyCardStub,
        StudyCardEdit: StudyCardEditStub,
        Card: CardStub
      },
      provide: {
        [PrimedGradeKey]: { value: null }
      }
    }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CardStage', () => {
  beforeEach(() => {
    mockRegister.mockClear()
    mockCoverCardBeforeEnter.mockClear()
    mockCoverCardEnter.mockClear()
    mockStartSession.mockClear()
    mockFlipCurrentCard.mockClear()
    mockOnCardReviewed.mockClear()
    mockOnDragProgress.mockClear()
    mockOnNextCardFlipped.mockClear()
    mockOnEditUpdate.mockClear()
  })

  // ── card_view computed [obligation] ────────────────────────────────────────

  test('renders nothing in the stage while loading [obligation]', () => {
    const wrapper = mountCardStage({ loading: true })

    expect(wrapper.find('[data-testid="study-card-stub"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="study-card-edit-stub"]').exists()).toBe(false)
  })

  test('shows edit view when editing=true (and not loading) [obligation]', () => {
    const wrapper = mountCardStage({ loading: false, editing: true, active_card: makeCard() })

    expect(wrapper.find('[data-testid="study-card-edit-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="study-card-stub"]').exists()).toBe(false)
  })

  test('shows study-card when not loading and not editing [obligation]', () => {
    const wrapper = mountCardStage({ loading: false, editing: false, active_card: makeCard() })

    expect(wrapper.find('[data-testid="study-card-stub"]').exists()).toBe(true)
  })

  test('renders nothing when loading overrides editing [obligation]', () => {
    const wrapper = mountCardStage({ loading: true, editing: true, active_card: makeCard() })

    expect(wrapper.find('[data-testid="study-card-edit-stub"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="study-card-stub"]').exists()).toBe(false)
  })

  // ── preview card ───────────────────────────────────────────────────────────

  test('shows preview card when not loading and next_card is defined', () => {
    const wrapper = mountCardStage({
      loading: false,
      active_card: makeCard(1),
      next_card: makeCard(2),
      next_card_side: 'front'
    })

    expect(wrapper.find('[data-testid="study-card__preview"]').exists()).toBe(true)
  })

  test('does not show preview card when loading', () => {
    const wrapper = mountCardStage({ loading: true, next_card: makeCard(2) })

    expect(wrapper.find('[data-testid="study-card__preview"]').exists()).toBe(false)
  })

  test('does not show preview card when next_card is undefined', () => {
    const wrapper = mountCardStage({ loading: false, next_card: undefined })

    expect(wrapper.find('[data-testid="study-card__preview"]').exists()).toBe(false)
  })

  // ── active_card_preview forwarding [obligation] ───────────────────────────

  test('forwards active_card_preview as options on the active study-card [obligation]', () => {
    const preview = { some: 'record-log' }
    const wrapper = mountCardStage({
      loading: false,
      active_card: makeCard(),
      active_card_preview: preview
    })

    expect(wrapper.findComponent(StudyCardStub).props('options')).toEqual(preview)
  })

  test('options is undefined on the active study-card when active_card_preview is not set [obligation]', () => {
    const wrapper = mountCardStage({ loading: false, active_card: makeCard() })

    expect(wrapper.findComponent(StudyCardStub).props('options')).toBeUndefined()
  })

  // ── event delegation straight to the injected controller [obligation] ─────

  test('study-card @started delegates to controller.startSession [obligation]', () => {
    const wrapper = mountCardStage({ loading: false, active_card: makeCard() })

    wrapper.findComponent(StudyCardStub).vm.$emit('started')

    expect(mockStartSession).toHaveBeenCalledOnce()
  })

  test('study-card @side-changed delegates to controller.flipCurrentCard [obligation]', () => {
    const wrapper = mountCardStage({ loading: false, active_card: makeCard() })

    wrapper.findComponent(StudyCardStub).vm.$emit('side-changed')

    expect(mockFlipCurrentCard).toHaveBeenCalledOnce()
  })

  test('study-card @reviewed delegates to controller.onCardReviewed with the grade [obligation]', async () => {
    const wrapper = mountCardStage({ loading: false, active_card: makeCard() })
    const { Rating } = await import('ts-fsrs')

    wrapper.findComponent(StudyCardStub).vm.$emit('reviewed', Rating.Good)

    expect(mockOnCardReviewed).toHaveBeenCalledWith(Rating.Good)
  })

  test('study-card @drag-progress delegates to controller.onDragProgress [obligation]', () => {
    const wrapper = mountCardStage({ loading: false, active_card: makeCard() })

    wrapper.findComponent(StudyCardStub).vm.$emit('drag-progress', 0.5, 0)

    expect(mockOnDragProgress).toHaveBeenCalledWith(0.5, 0)
  })

  test('study-card @drag-rating sets the primed_grade context ref [obligation]', () => {
    const primed = { value: null }
    loading.value = false
    editing.value = false
    active_card.value = makeCard()

    const wrapper = mount(CardStage, {
      attachTo: document.body,
      global: {
        stubs: { StudyCard: StudyCardStub, StudyCardEdit: StudyCardEditStub, Card: CardStub },
        provide: { [PrimedGradeKey]: primed }
      }
    })

    wrapper.findComponent(StudyCardStub).vm.$emit('drag-rating', 3)

    expect(primed.value).toBe(3)
  })

  test('forwards show_all_ratings from the controller to study-card [obligation]', () => {
    const wrapper = mountCardStage({
      loading: false,
      active_card: makeCard(),
      show_all_ratings: true
    })

    expect(wrapper.findComponent(StudyCardStub).props('show_all_ratings')).toBe(true)
  })

  test('preview card @flip-complete delegates to controller.onNextCardFlipped [obligation]', () => {
    const wrapper = mountCardStage({
      loading: false,
      active_card: makeCard(1),
      next_card: makeCard(2)
    })

    wrapper.findComponent(CardStub).vm.$emit('flip-complete')

    expect(mockOnNextCardFlipped).toHaveBeenCalledOnce()
  })

  // ── edit-update forwarding ─────────────────────────────────────────────────

  test('study-card-edit @update delegates to controller.onEditUpdate [obligation]', () => {
    const wrapper = mountCardStage({ loading: false, editing: true, active_card: makeCard() })

    wrapper.findComponent(StudyCardEditStub).vm.$emit('update', 'front', 'new text')

    expect(mockOnEditUpdate).toHaveBeenCalledWith('front', 'new text')
  })

  // ── rate() expose [obligation] ─────────────────────────────────────────────

  test('rate() is a no-op when study-card is not rendered (loading)', () => {
    const wrapper = mountCardStage({ loading: true })

    expect(() => wrapper.vm.rate(1)).not.toThrow()
  })
})
