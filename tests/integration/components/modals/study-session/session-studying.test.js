import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import SessionStudying from '@/views/study-session/session-studying/index.vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────
// session-studying/index.vue is now a bare presentational shell: it renders
// card-stage and exposes rate(), which forwards to the mounted card stage's
// own fling animation. Rating buttons and the flip/done footer live in the
// session's toolbar row now, wired at study-session/index.vue.

const mockRate = vi.fn()

const CardStageStub = defineComponent({
  name: 'CardStage',
  setup(_props, { expose }) {
    expose({ rate: mockRate })
    return () => h('div', { 'data-testid': 'card-stage-stub' })
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function mountSessionStudying(stubs = { CardStage: CardStageStub }) {
  return mount(SessionStudying, {
    global: { stubs }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SessionStudying (index.vue)', () => {
  beforeEach(() => {
    mockRate.mockClear()
  })

  // ── Structure ───────────────────────────────────────────────────────────────

  test('renders the session-flashcard root and card-stage', () => {
    const wrapper = mountSessionStudying()
    expect(wrapper.find('[data-testid="session-flashcard"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="study-session__main"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="card-stage-stub"]').exists()).toBe(true)
  })

  // ── clears the floating progress bar [obligation] ──────────────────────────

  test('carries pt-9 so its content clears the floating header progress bar [obligation]', () => {
    const wrapper = mountSessionStudying()
    expect(wrapper.find('[data-testid="session-flashcard"]').classes()).toContain('pt-9')
  })

  // ── exposed rate() delegates to the card stage [obligation] ────────────────

  test('rate() forwards the grade to the mounted card stage [obligation]', () => {
    const wrapper = mountSessionStudying()
    wrapper.vm.rate(3)
    expect(mockRate).toHaveBeenCalledWith(3)
  })
})
