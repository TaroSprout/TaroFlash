import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, onMounted } from 'vue'
import FinishAnimation from '@/components/modals/study-session/finish-animation.vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))

vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))

// ── Burst stub ────────────────────────────────────────────────────────────────
// Immediately emits `done` on mount so tests don't rely on CSS animationend.

const BurstStub = defineComponent({
  emits: ['done'],
  setup(_props, { emit }) {
    onMounted(() => emit('done'))
    return () => h('div', { 'data-testid': 'burst-stub' })
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeFinishAnimation() {
  return mount(FinishAnimation, {
    global: { stubs: { Burst: BurstStub } }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('FinishAnimation', () => {
  beforeEach(() => {
    mockEmitSfx.mockClear()
  })

  test('plays sfx on mount', () => {
    makeFinishAnimation()
    expect(mockEmitSfx).toHaveBeenCalledWith('study.music_pizz_prompt')
  })

  test('emits done when Burst emits done', async () => {
    const wrapper = makeFinishAnimation()
    await flushPromises()
    expect(wrapper.emitted('done')).toHaveLength(1)
  })

  test('renders "Finished!" text', () => {
    const wrapper = makeFinishAnimation()
    expect(wrapper.text()).toContain('Finished!')
  })
})
