import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))
vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx, emitHoverSfx: vi.fn(), emitStudySfx: vi.fn() }))

import SuccessPanel from '@/views/settings/account-access/success-panel.vue'

function makeWrapper(props = {}) {
  return mount(SuccessPanel, {
    props: {
      icon: 'send',
      heading: 'Check your inbox',
      message: 'We sent you a confirmation link.',
      close: vi.fn(),
      ...props
    },
    global: { directives: { sfx: {} } }
  })
}

beforeEach(() => {
  mockEmitSfx.mockClear()
})

describe('SuccessPanel', () => {
  test('[obligation] plays the success_1 sfx on mount', () => {
    makeWrapper()
    expect(mockEmitSfx).toHaveBeenCalledWith('success_1')
  })

  test('[obligation] renders the passed icon, heading, and message props', () => {
    const wrapper = makeWrapper({
      icon: 'check',
      heading: 'All set',
      message: 'Your password was updated.'
    })

    expect(wrapper.find('[data-testid="ui-kit-icon"]').attributes('alt')).toBe('check')
    expect(wrapper.text()).toContain('All set')
    expect(wrapper.text()).toContain('Your password was updated.')
  })

  test('[obligation] calls the close prop when the close button is pressed', async () => {
    const close = vi.fn()
    const wrapper = makeWrapper({ close })

    await wrapper.find('[data-testid="account-access-success-panel__close"]').trigger('click')

    expect(close).toHaveBeenCalledOnce()
  })
})
