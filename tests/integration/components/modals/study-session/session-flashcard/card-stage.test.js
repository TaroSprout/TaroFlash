import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import CardStage from '@/components/study-session/session-flashcard/card-stage.vue'

// ── Mocks ─────────────────────────────────────────────────────────────────────

// Deck context is an inject seam; these tests don't exercise the cover carousel,
// so a single-cover (idle) context keeps it inert.
vi.mock('@/components/study-session/deck-context', () => ({
  useDeckContext: () => ref({ appearanceFor: () => ({}), covers: [] })
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
  return { id, front: 'Q', back: 'A', state: 'unreviewed' }
}

function mountCardStage(props = {}) {
  return mount(CardStage, {
    props: {
      loading: false,
      editing: false,
      current_card_side: 'front',
      next_card_side: 'cover',
      preview_style: {},
      ...props
    },
    attachTo: document.body,
    global: {
      stubs: {
        StudyCard: StudyCardStub,
        StudyCardEdit: StudyCardEditStub,
        Card: CardStub
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
  })

  // ── card_view computed [obligation] ────────────────────────────────────────

  test('renders nothing in the stage while loading [obligation]', async () => {
    const wrapper = mountCardStage({ loading: true })

    expect(wrapper.find('[data-testid="study-card-stub"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="study-card-edit-stub"]').exists()).toBe(false)
  })

  test('shows edit view when editing=true (and not loading) [obligation]', async () => {
    const wrapper = mountCardStage({
      loading: false,
      editing: true,
      active_card: makeCard()
    })

    expect(wrapper.find('[data-testid="study-card-edit-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="study-card-stub"]').exists()).toBe(false)
  })

  test('shows study-card when not loading and not editing [obligation]', async () => {
    const wrapper = mountCardStage({
      loading: false,
      editing: false,
      active_card: makeCard()
    })

    expect(wrapper.find('[data-testid="study-card-stub"]').exists()).toBe(true)
  })

  test('renders nothing when loading overrides editing [obligation]', async () => {
    // loading takes precedence over editing
    const wrapper = mountCardStage({
      loading: true,
      editing: true,
      active_card: makeCard()
    })

    expect(wrapper.find('[data-testid="study-card-edit-stub"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="study-card-stub"]').exists()).toBe(false)
  })

  // ── preview card ───────────────────────────────────────────────────────────

  test('shows preview card when not loading and next_card is defined', async () => {
    const wrapper = mountCardStage({
      loading: false,
      active_card: makeCard(1),
      next_card: makeCard(2),
      next_card_side: 'front'
    })

    expect(wrapper.find('[data-testid="study-card__preview"]').exists()).toBe(true)
  })

  test('does not show preview card when loading', async () => {
    const wrapper = mountCardStage({
      loading: true,
      next_card: makeCard(2)
    })

    expect(wrapper.find('[data-testid="study-card__preview"]').exists()).toBe(false)
  })

  test('does not show preview card when next_card is undefined', async () => {
    const wrapper = mountCardStage({
      loading: false,
      next_card: undefined
    })

    expect(wrapper.find('[data-testid="study-card__preview"]').exists()).toBe(false)
  })

  // ── active_card_preview forwarding [obligation] ───────────────────────────
  // CardStage forwards active_card_preview (not active_card.preview, which no
  // longer exists) to the active StudyCard's `options` prop.

  test('forwards active_card_preview prop as options on the active study-card [obligation]', async () => {
    const preview = { some: 'record-log' }
    const wrapper = mountCardStage({
      loading: false,
      active_card: makeCard(),
      active_card_preview: preview
    })

    expect(wrapper.findComponent(StudyCardStub).props('options')).toEqual(preview)
  })

  test('options is undefined on the active study-card when active_card_preview is not passed [obligation]', async () => {
    const wrapper = mountCardStage({ loading: false, active_card: makeCard() })

    expect(wrapper.findComponent(StudyCardStub).props('options')).toBeUndefined()
  })

  // ── event forwarding ───────────────────────────────────────────────────────

  test('forwards started event from study-card', async () => {
    const wrapper = mountCardStage({ loading: false, active_card: makeCard() })

    wrapper.findComponent(StudyCardStub).vm.$emit('started')

    expect(wrapper.emitted('started')).toHaveLength(1)
  })

  test('forwards side-changed event from study-card', async () => {
    const wrapper = mountCardStage({ loading: false, active_card: makeCard() })

    wrapper.findComponent(StudyCardStub).vm.$emit('side-changed')

    expect(wrapper.emitted('side-changed')).toHaveLength(1)
  })

  test('forwards reviewed event from study-card', async () => {
    const wrapper = mountCardStage({ loading: false, active_card: makeCard() })
    const { Rating } = await import('ts-fsrs')

    wrapper.findComponent(StudyCardStub).vm.$emit('reviewed', Rating.Good)

    expect(wrapper.emitted('reviewed')).toHaveLength(1)
    expect(wrapper.emitted('reviewed')[0][0]).toBe(Rating.Good)
  })

  test('forwards drag-progress event from study-card', async () => {
    const wrapper = mountCardStage({ loading: false, active_card: makeCard() })

    wrapper.findComponent(StudyCardStub).vm.$emit('drag-progress', 0.5, 0)

    expect(wrapper.emitted('drag-progress')).toHaveLength(1)
    expect(wrapper.emitted('drag-progress')[0]).toEqual([0.5, 0])
  })

  test('forwards drag-rating event from study-card [obligation]', async () => {
    const wrapper = mountCardStage({ loading: false, active_card: makeCard() })
    const { Rating } = await import('ts-fsrs')

    wrapper.findComponent(StudyCardStub).vm.$emit('drag-rating', Rating.Good)

    expect(wrapper.emitted('drag-rating')).toHaveLength(1)
    expect(wrapper.emitted('drag-rating')[0][0]).toBe(Rating.Good)
  })

  test('forwards drag-rating null from study-card [obligation]', async () => {
    const wrapper = mountCardStage({ loading: false, active_card: makeCard() })

    wrapper.findComponent(StudyCardStub).vm.$emit('drag-rating', null)

    expect(wrapper.emitted('drag-rating')).toHaveLength(1)
    expect(wrapper.emitted('drag-rating')[0][0]).toBeNull()
  })

  test('forwards show_all_ratings prop to study-card [obligation]', async () => {
    const wrapper = mountCardStage({
      loading: false,
      active_card: makeCard(),
      show_all_ratings: true
    })

    const stub = wrapper.findComponent(StudyCardStub)
    expect(stub.props('show_all_ratings')).toBe(true)
  })

  test('forwards next-flipped from preview card', async () => {
    const wrapper = mountCardStage({
      loading: false,
      active_card: makeCard(1),
      next_card: makeCard(2)
    })

    wrapper.findComponent(CardStub).vm.$emit('flip-complete')

    expect(wrapper.emitted('next-flipped')).toHaveLength(1)
  })

  // ── edit-update forwarding ─────────────────────────────────────────────────

  test('forwards edit-update event from study-card-edit', async () => {
    const wrapper = mountCardStage({
      loading: false,
      editing: true,
      active_card: makeCard()
    })

    wrapper.findComponent(StudyCardEditStub).vm.$emit('update', 'front', 'new text')

    expect(wrapper.emitted('edit-update')).toHaveLength(1)
    expect(wrapper.emitted('edit-update')[0]).toEqual(['front', 'new text'])
  })

  // ── rate() expose [obligation] ─────────────────────────────────────────────

  test('rate() is a no-op when study-card is not rendered (loading)', async () => {
    const wrapper = mountCardStage({ loading: true })

    // Should not throw
    expect(() => wrapper.vm.rate(1)).not.toThrow()
  })
})
