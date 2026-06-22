import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount, shallowMount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import CardStage from '@/components/modals/study-session/session-flashcard/card-stage.vue'
import { DeckContextKey } from '@/components/modals/study-session/deck-context'

// ── Mocks ─────────────────────────────────────────────────────────────────────

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

// ── Stubs ─────────────────────────────────────────────────────────────────────

const StudyCardStub = defineComponent({
  name: 'StudyCard',
  props: ['card', 'side', 'options'],
  emits: ['started', 'side-changed', 'reviewed', 'drag-progress'],
  setup(_props, { expose, emit }) {
    expose({ rate: vi.fn() })
    return () => h('div', { 'data-testid': 'study-card-stub' })
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

const StudyCardSkeletonStub = defineComponent({
  name: 'StudyCardSkeleton',
  setup() {
    return () => h('div', { 'data-testid': 'study-card-skeleton' })
  }
})

const CardStub = defineComponent({
  name: 'Card',
  props: ['side', 'card_attributes'],
  emits: ['flip-complete'],
  setup() {
    return () => h('div', { 'data-testid': 'card-stub' })
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeCard(id = 1) {
  return { id, front: 'Q', back: 'A', state: 'unreviewed', preview: null }
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
      provide: {
        [DeckContextKey]: ref({ cover_config: undefined, card_attributes: undefined })
      },
      stubs: {
        StudyCard: StudyCardStub,
        StudyCardEdit: StudyCardEditStub,
        StudyCardSkeleton: StudyCardSkeletonStub,
        Card: CardStub
      }
    }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CardStage', () => {
  beforeEach(() => {
    mockRegister.mockClear()
  })

  // ── card_view computed [obligation] ────────────────────────────────────────

  test('shows skeleton when loading=true [obligation]', async () => {
    const wrapper = mountCardStage({ loading: true })

    expect(wrapper.find('[data-testid="study-card-skeleton"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="study-card-stub"]').exists()).toBe(false)
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
    expect(wrapper.find('[data-testid="study-card-skeleton"]').exists()).toBe(false)
  })

  test('shows skeleton instead of edit when loading overrides editing [obligation]', async () => {
    // loading takes precedence over editing
    const wrapper = mountCardStage({
      loading: true,
      editing: true,
      active_card: makeCard()
    })

    expect(wrapper.find('[data-testid="study-card-skeleton"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="study-card-edit-stub"]').exists()).toBe(false)
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
