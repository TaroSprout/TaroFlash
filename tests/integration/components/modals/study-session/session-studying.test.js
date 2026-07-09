import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import SessionStudying from '@/components/flashcard-session/session-studying/index.vue'

// ── Hoisted controller fake ────────────────────────────────────────────────────
// session-studying/index.vue is a dumb presentational shell — the FSRS session
// itself is owned by session-controller.ts (unit-tested directly). This suite
// only exercises the prop/event wiring between the injected controller and the
// child components it renders.

const { controller_state } = await vi.hoisted(async () => {
  const { ref } = await import('vue')
  return {
    controller_state: {
      mode: ref('studying'),
      cards: ref([{ id: 1 }, { id: 2 }]),
      current_card_side: ref('front'),
      current_index: ref(0),
      active_card: ref({ id: 1 }),
      active_card_preview: ref(undefined),
      is_starting_side: ref(true),
      show_all_ratings: ref(false),
      next_card: ref(undefined),
      next_card_side: ref('front'),
      preview_style: ref({}),
      is_cover: ref(false),
      loading: ref(false),
      editing: ref(false),
      saving: ref(false),
      startSession: vi.fn(),
      flipCurrentCard: vi.fn(),
      onDragProgress: vi.fn(),
      onNextCardFlipped: vi.fn(),
      onEditUpdate: vi.fn(),
      stopEdit: vi.fn(),
      onCardReviewed: vi.fn()
    }
  }
})

vi.mock('@/components/flashcard-session/composables/session-controller', () => ({
  useInjectedStudySessionController: () => controller_state
}))

// ── Stubs ─────────────────────────────────────────────────────────────────────

const mockRate = vi.fn()

const CardStageStub = defineComponent({
  name: 'CardStage',
  props: [
    'loading',
    'editing',
    'active_card',
    'active_card_preview',
    'current_card_side',
    'show_all_ratings',
    'next_card',
    'next_card_side',
    'preview_style'
  ],
  emits: [
    'started',
    'side-changed',
    'reviewed',
    'drag-progress',
    'drag-rating',
    'next-flipped',
    'edit-update'
  ],
  setup(_props, { expose }) {
    expose({ rate: mockRate })
    return () => h('div', { 'data-testid': 'card-stage-stub' })
  }
})

const SessionProgressStub = defineComponent({
  name: 'SessionProgress',
  props: ['editing', 'saving', 'is_cover', 'reviewed', 'total'],
  setup() {
    return () => h('div', { 'data-testid': 'session-progress-stub' })
  }
})

const RatingButtonsStub = defineComponent({
  name: 'RatingButtons',
  props: ['options', 'side', 'show_all_ratings', 'loading'],
  emits: ['started', 'rated'],
  setup(_props, { emit }) {
    return () =>
      h('div', { 'data-testid': 'rating-buttons-stub' }, [
        h('button', { 'data-testid': 'start-btn', onClick: () => emit('started') }),
        h('button', { 'data-testid': 'rate-btn', onClick: () => emit('rated', 3) })
      ])
  }
})

const StudyEditFooterStub = defineComponent({
  name: 'StudyEditFooter',
  props: ['is_starting_side'],
  emits: ['flip', 'done'],
  setup(_props, { emit }) {
    return () =>
      h('div', { 'data-testid': 'study-edit-footer-stub' }, [
        h('button', { 'data-testid': 'footer-flip-btn', onClick: () => emit('flip') }),
        h('button', { 'data-testid': 'footer-done-btn', onClick: () => emit('done') })
      ])
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function mountSessionStudying() {
  return mount(SessionStudying, {
    global: {
      stubs: {
        CardStage: CardStageStub,
        SessionProgress: SessionProgressStub,
        RatingButtons: RatingButtonsStub,
        StudyEditFooter: StudyEditFooterStub
      }
    }
  })
}

/** Leaves RatingButtons un-stubbed so the primed-grade provide/inject wiring is observable. */
function mountWithRealRatingButtons() {
  return mount(SessionStudying, {
    global: {
      stubs: {
        CardStage: CardStageStub,
        SessionProgress: SessionProgressStub,
        StudyEditFooter: StudyEditFooterStub
      }
    }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SessionStudying (index.vue)', () => {
  beforeEach(() => {
    controller_state.mode.value = 'studying'
    controller_state.cards.value = [{ id: 1 }, { id: 2 }]
    controller_state.current_card_side.value = 'front'
    controller_state.current_index.value = 0
    controller_state.active_card.value = { id: 1 }
    controller_state.is_cover.value = false
    controller_state.loading.value = false
    controller_state.editing.value = false
    controller_state.saving.value = false
    controller_state.show_all_ratings.value = false
    mockRate.mockClear()
    controller_state.startSession.mockClear()
    controller_state.flipCurrentCard.mockClear()
    controller_state.onDragProgress.mockClear()
    controller_state.onNextCardFlipped.mockClear()
    controller_state.onEditUpdate.mockClear()
    controller_state.stopEdit.mockClear()
    controller_state.onCardReviewed.mockClear()
  })

  // ── Structure ───────────────────────────────────────────────────────────────

  test('renders the session-flashcard root and card-stage/session-progress', () => {
    const wrapper = mountSessionStudying()
    expect(wrapper.find('[data-testid="session-flashcard"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="card-stage-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="session-progress-stub"]').exists()).toBe(true)
  })

  // ── mode fades the main content when not studying ─────────────────────────

  test('applies opacity-0/pointer-events-none to the main area when mode !== studying', async () => {
    controller_state.mode.value = 'completed'
    const wrapper = mountSessionStudying()

    const main = wrapper.find('[data-testid="study-session__main"]')
    expect(main.classes()).toContain('opacity-0')
    expect(main.classes()).toContain('pointer-events-none')
  })

  test('does not fade the main area while mode === studying', () => {
    const wrapper = mountSessionStudying()
    const main = wrapper.find('[data-testid="study-session__main"]')
    expect(main.classes()).not.toContain('opacity-0')
  })

  // ── editing swaps rating-buttons for study-edit-footer ─────────────────────

  test('renders rating-buttons when not editing', () => {
    controller_state.editing.value = false
    const wrapper = mountSessionStudying()
    expect(wrapper.find('[data-testid="rating-buttons-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="study-edit-footer-stub"]').exists()).toBe(false)
  })

  test('renders study-edit-footer when editing', () => {
    controller_state.editing.value = true
    const wrapper = mountSessionStudying()
    expect(wrapper.find('[data-testid="study-edit-footer-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="rating-buttons-stub"]').exists()).toBe(false)
  })

  // ── card-stage → controller wiring ──────────────────────────────────────────

  test('card-stage @started delegates to controller.startSession', async () => {
    const wrapper = mountSessionStudying()
    await wrapper.findComponent(CardStageStub).vm.$emit('started')
    expect(controller_state.startSession).toHaveBeenCalledOnce()
  })

  test('card-stage @side-changed delegates to controller.flipCurrentCard', async () => {
    const wrapper = mountSessionStudying()
    await wrapper.findComponent(CardStageStub).vm.$emit('side-changed')
    expect(controller_state.flipCurrentCard).toHaveBeenCalledOnce()
  })

  test('card-stage @reviewed delegates to controller.onCardReviewed with the grade', async () => {
    const wrapper = mountSessionStudying()
    await wrapper.findComponent(CardStageStub).vm.$emit('reviewed', 3)
    expect(controller_state.onCardReviewed).toHaveBeenCalledWith(3)
  })

  test('card-stage @edit-update delegates to controller.onEditUpdate', async () => {
    const wrapper = mountSessionStudying()
    await wrapper.findComponent(CardStageStub).vm.$emit('edit-update', 'new text')
    expect(controller_state.onEditUpdate).toHaveBeenCalledWith('new text')
  })

  // ── card-stage @drag-rating primes the rating-buttons highlight ────────────
  // primed_grade is a local ref provided down to rating-buttons via
  // providePrimedGrade — assert through the real rating-buttons tree instead of
  // a stub so the provide/inject wiring is actually exercised.

  test('card-stage @drag-rating primes the matching rating-buttons option as active', async () => {
    const wrapper = mountWithRealRatingButtons()

    await wrapper.findComponent(CardStageStub).vm.$emit('drag-rating', 1)

    expect(wrapper.find('[data-testid="rating-buttons__again"]').attributes('data-active')).toBe(
      'true'
    )
  })

  // ── rating-buttons → controller + card-stage wiring ─────────────────────────

  test('rating-buttons @started delegates to controller.startSession', async () => {
    const wrapper = mountSessionStudying()
    await wrapper.find('[data-testid="start-btn"]').trigger('click')
    expect(controller_state.startSession).toHaveBeenCalledOnce()
  })

  test('rating-buttons @rated triggers the fling animation on the card stage (stage.rate)', async () => {
    const wrapper = mountSessionStudying()
    await wrapper.find('[data-testid="rate-btn"]').trigger('click')
    expect(mockRate).toHaveBeenCalledWith(3)
  })

  // ── study-edit-footer → controller wiring ───────────────────────────────────

  test('study-edit-footer @flip delegates to controller.flipCurrentCard', async () => {
    controller_state.editing.value = true
    const wrapper = mountSessionStudying()
    await wrapper.find('[data-testid="footer-flip-btn"]').trigger('click')
    expect(controller_state.flipCurrentCard).toHaveBeenCalledOnce()
  })

  test('study-edit-footer @done delegates to controller.stopEdit', async () => {
    controller_state.editing.value = true
    const wrapper = mountSessionStudying()
    await wrapper.find('[data-testid="footer-done-btn"]').trigger('click')
    expect(controller_state.stopEdit).toHaveBeenCalledOnce()
  })

  // ── session-progress props reflect the controller ──────────────────────────

  test('session-progress receives is_cover/reviewed/total from the controller', () => {
    controller_state.is_cover.value = true
    controller_state.current_index.value = 1
    controller_state.cards.value = [{ id: 1 }, { id: 2 }, { id: 3 }]
    const wrapper = mountSessionStudying()

    const progress = wrapper.findComponent(SessionProgressStub)
    expect(progress.props('is_cover')).toBe(true)
    expect(progress.props('reviewed')).toBe(1)
    expect(progress.props('total')).toBe(3)
  })
})
