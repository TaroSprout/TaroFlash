import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import StudyFlipDoneFooter from '@/views/study-session/study-flip-done-footer.vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))
vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx, emitHoverSfx: vi.fn() }))

// ── Helpers ───────────────────────────────────────────────────────────────────

function mountFooter() {
  return mount(StudyFlipDoneFooter)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('StudyFlipDoneFooter', () => {
  beforeEach(() => {
    mockEmitSfx.mockClear()
  })

  test('renders the flip and done buttons', () => {
    const wrapper = mountFooter()
    expect(wrapper.find('[data-testid="study-flip-done-footer__flip"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="study-flip-done-footer__done"]').exists()).toBe(true)
  })

  // ── emits, no internal flip sfx of its own [obligation] ─────────────────────
  // The Flip button carries no :sfx prop — whoever handles @flip decides
  // whether and what to play. Only Done carries its own cue (card.saved).

  test('clicking flip emits "flip" and nothing else, and plays no press sound [obligation]', async () => {
    const wrapper = mountFooter()
    await wrapper.find('[data-testid="study-flip-done-footer__flip"]').trigger('click')

    expect(wrapper.emitted('flip')).toHaveLength(1)
    expect(wrapper.emitted('done')).toBeUndefined()
    expect(mockEmitSfx).not.toHaveBeenCalled()
  })

  test('clicking done emits "done" and nothing else, and plays card.saved [obligation]', async () => {
    const wrapper = mountFooter()
    await wrapper.find('[data-testid="study-flip-done-footer__done"]').trigger('click')

    expect(wrapper.emitted('done')).toHaveLength(1)
    expect(wrapper.emitted('flip')).toBeUndefined()
    expect(mockEmitSfx).toHaveBeenCalledWith('card.saved')
  })
})
