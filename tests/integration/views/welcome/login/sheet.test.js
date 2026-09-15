import { describe, test, expect, vi } from 'vite-plus/test'
import AppWindow from '@/components/layout-kit/app-window/index.vue'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key) => key })
}))

const LoginDialogStub = defineComponent({
  name: 'LoginDialog',
  props: ['close'],
  setup() {
    return () => h('div', { 'data-testid': 'login-dialog-stub' })
  }
})

import LoginSheet from '@/views/welcome/login/sheet.vue'
import { OVERLAY_CONTEXT_KEY } from '@/composables/overlay/overlay-context'
import { makeOverlayContext } from '@tests/fixtures/overlay'

// ── Helpers ───────────────────────────────────────────────────────────────────

function mountSheet(overrides = {}) {
  const close = vi.fn()
  const dismiss = vi.fn()
  return {
    close,
    dismiss,
    wrapper: shallowMount(LoginSheet, {
      global: {
        stubs: { LoginDialog: LoginDialogStub, AppWindow: false, OverlaySurface: false },
        provide: { [OVERLAY_CONTEXT_KEY]: makeOverlayContext({ close, dismiss, ...overrides }) }
      }
    })
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LoginSheet (welcome/login/sheet.vue)', () => {
  test('renders the login-dialog inside the app-window body', () => {
    const { wrapper } = mountSheet()
    expect(wrapper.find('[data-testid="login-sheet__body"]').exists()).toBe(true)
    expect(
      wrapper
        .find('[data-testid="login-sheet__body"]')
        .findComponent({ name: 'LoginDialog' })
        .exists()
    ).toBe(true)
  })

  test('forwards close to login-dialog', () => {
    const { wrapper, close } = mountSheet()
    expect(wrapper.findComponent({ name: 'LoginDialog' }).props('close')).toBe(close)
  })

  test('app-window close event calls dismiss', async () => {
    const { wrapper, dismiss } = mountSheet()
    await wrapper.findComponent(AppWindow).vm.$emit('close')
    expect(dismiss).toHaveBeenCalled()
  })
})
