import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))
vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx, emitHoverSfx: vi.fn(), emitStudySfx: vi.fn() }))

import ForgotPasswordSuccess from '@/views/welcome/forgot-password/success.vue'

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockEmitSfx.mockClear()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

function mountSuccess(props = {}) {
  return mount(ForgotPasswordSuccess, {
    props: { close: vi.fn(), ...props },
    global: { directives: { sfx: {} } }
  })
}

describe('ForgotPasswordSuccess (forgot-password/success.vue)', () => {
  test('renders the success container', () => {
    const wrapper = mountSuccess()
    expect(wrapper.find('[data-testid="forgot-password-modal__success"]').exists()).toBe(true)
  })

  test('plays success_1 sfx on mount', () => {
    mountSuccess()
    expect(mockEmitSfx).toHaveBeenCalledWith('success_1')
  })

  test('calls the close prop when the close button is pressed', async () => {
    const close = vi.fn()
    const wrapper = mountSuccess({ close })
    await wrapper.find('[data-testid="forgot-password-modal__success-close"]').trigger('click')
    expect(close).toHaveBeenCalledOnce()
  })
})
