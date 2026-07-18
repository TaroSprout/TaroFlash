import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import SessionStudying from '@/views/study-session/session-studying/index.vue'

// ── Hoisted controller fake ────────────────────────────────────────────────────
// session-studying/index.vue is now a dumb presentational shell: card-stage,
// rating-buttons, and study-edit-footer all self-inject the controller
// directly (no more props/emit wiring for them), so this view only reads
// state/editing off the controller and forwards RatingButtons' @started/@rated.

const { mockStartSession } = vi.hoisted(() => ({ mockStartSession: vi.fn() }))

const { controller_state } = await vi.hoisted(async () => {
  const { ref } = await import('vue')
  return {
    controller_state: {
      state: ref('studying'),
      editing: ref(false),
      startSession: () => {}
    }
  }
})

vi.mock('@/views/study-session/composables/session-controller', () => ({
  useInjectedStudySessionController: () => controller_state
}))

// ── Stubs ─────────────────────────────────────────────────────────────────────
// card-stage / study-edit-footer no longer take props or emit events — they
// self-inject the controller, so the stub bodies here are minimal.

const mockRate = vi.fn()

const CardStageStub = defineComponent({
  name: 'CardStage',
  setup(_props, { expose }) {
    expose({ rate: mockRate })
    return () => h('div', { 'data-testid': 'card-stage-stub' })
  }
})

const SessionProgressStub = defineComponent({
  name: 'SessionProgress',
  setup() {
    return () => h('div', { 'data-testid': 'session-progress-stub' })
  }
})

const RatingButtonsStub = defineComponent({
  name: 'RatingButtons',
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
  setup() {
    return () => h('div', { 'data-testid': 'study-edit-footer-stub' })
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

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SessionStudying (index.vue)', () => {
  beforeEach(() => {
    controller_state.state.value = 'studying'
    controller_state.editing.value = false
    controller_state.startSession = mockStartSession
    mockRate.mockClear()
    mockStartSession.mockClear()
  })

  // ── Structure ───────────────────────────────────────────────────────────────

  test('renders the session-flashcard root and card-stage/session-progress', () => {
    const wrapper = mountSessionStudying()
    expect(wrapper.find('[data-testid="session-flashcard"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="card-stage-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="session-progress-stub"]').exists()).toBe(true)
  })

  // ── main area fades when state === "summary" [obligation] ─────────────────

  test('applies opacity-0/pointer-events-none to the main area when state === "summary" [obligation]', () => {
    controller_state.state.value = 'summary'
    const wrapper = mountSessionStudying()

    const main = wrapper.find('[data-testid="study-session__main"]')
    expect(main.classes()).toContain('opacity-0')
    expect(main.classes()).toContain('pointer-events-none')
  })

  test('does not fade the main area while state === "studying"', () => {
    const wrapper = mountSessionStudying()
    const main = wrapper.find('[data-testid="study-session__main"]')
    expect(main.classes()).not.toContain('opacity-0')
  })

  test('does not fade the main area while state === "cover" [obligation]', () => {
    controller_state.state.value = 'cover'
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

  // ── rating-buttons → controller + card-stage wiring ─────────────────────────

  test('rating-buttons @started delegates to controller.startSession', async () => {
    const wrapper = mountSessionStudying()
    await wrapper.find('[data-testid="start-btn"]').trigger('click')
    expect(mockStartSession).toHaveBeenCalledOnce()
  })

  test('rating-buttons @rated triggers the fling animation on the card stage (stage.rate)', async () => {
    const wrapper = mountSessionStudying()
    await wrapper.find('[data-testid="rate-btn"]').trigger('click')
    expect(mockRate).toHaveBeenCalledWith(3)
  })
})
