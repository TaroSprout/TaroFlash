import { describe, test, expect } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import SessionStudying from '@/views/study-session/session-studying/index.vue'

// ── Helpers ───────────────────────────────────────────────────────────────────
// session-studying/index.vue is a bare presentational shell around card-stage,
// which now self-injects the session controller directly (no rate() relay).

const CardStageStub = defineComponent({
  name: 'CardStage',
  setup() {
    return () => h('div', { 'data-testid': 'card-stage-stub' })
  }
})

function mountSessionStudying(stubs = { CardStage: CardStageStub }) {
  return mount(SessionStudying, {
    global: { stubs }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SessionStudying (index.vue)', () => {
  // ── Structure ───────────────────────────────────────────────────────────────

  test('renders the session-flashcard root and card-stage', () => {
    const wrapper = mountSessionStudying()
    expect(wrapper.find('[data-testid="session-flashcard"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="study-session__main"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="card-stage-stub"]').exists()).toBe(true)
  })

  // ── clears the floating progress bar ──────────────────────────

  test('carries pt-9 so its content clears the floating header progress bar', () => {
    const wrapper = mountSessionStudying()
    expect(wrapper.find('[data-testid="session-flashcard"]').classes()).toContain('pt-9')
  })
})
