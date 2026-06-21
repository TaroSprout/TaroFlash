import { describe, test, expect, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

vi.mock('@/sfx/bus', () => ({
  emitSfx: vi.fn(),
  emitHoverSfx: vi.fn()
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key) => key })
}))

// ── Stubs ──────────────────────────────────────────────────────────────────────

// Capture the panel slot to assert LoginDialog is rendered inside it.
let capturedPanelSlot = null

const UiDropdownButtonStub = defineComponent({
  name: 'UiDropdownButton',
  inheritAttrs: false,
  props: ['size', 'position', 'openOnTrigger', 'hideTrigger', 'iconLeft', 'variant', 'shadow'],
  setup(_props, { slots, attrs }) {
    capturedPanelSlot = slots.panel ?? null
    return () =>
      h('div', { ...attrs }, [
        slots.default?.(),
        slots.panel ? h('div', { 'data-testid': 'dropdown-panel' }, slots.panel()) : null
      ])
  }
})

const LoginDialogStub = defineComponent({
  name: 'LoginDialog',
  setup() {
    return () => h('div', { 'data-testid': 'login-dialog-stub' })
  }
})

// ── Import ─────────────────────────────────────────────────────────────────────

import LoginTrigger from '@/views/welcome/login/index.vue'

// ── Mount helper ───────────────────────────────────────────────────────────────

function mountLoginTrigger() {
  capturedPanelSlot = null
  return shallowMount(LoginTrigger, {
    global: {
      stubs: {
        UiDropdownButton: UiDropdownButtonStub,
        LoginDialog: LoginDialogStub
      }
    }
  })
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('LoginTrigger (login/index.vue)', () => {
  // ── Structure ──────────────────────────────────────────────────────────────

  test('renders the dropdown trigger with data-testid="login__trigger" [obligation]', () => {
    const wrapper = mountLoginTrigger()
    expect(wrapper.find('[data-testid="login__trigger"]').exists()).toBe(true)
  })

  test('provides a #panel slot to UiDropdownButton [obligation]', () => {
    mountLoginTrigger()
    expect(capturedPanelSlot).not.toBeNull()
    expect(typeof capturedPanelSlot).toBe('function')
  })

  test('renders LoginDialog inside the #panel slot [obligation]', () => {
    const wrapper = mountLoginTrigger()
    expect(wrapper.find('[data-testid="login-dialog-stub"]').exists()).toBe(true)
  })
})
