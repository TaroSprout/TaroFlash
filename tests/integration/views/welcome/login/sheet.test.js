import { describe, test, expect, vi } from 'vite-plus/test'
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function mountSheet(close = vi.fn()) {
  return {
    close,
    wrapper: shallowMount(LoginSheet, {
      props: { close },
      global: { stubs: { LoginDialog: LoginDialogStub, MobileSheet: false } }
    })
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LoginSheet (welcome/login/sheet.vue)', () => {
  test('renders the login-dialog inside the mobile-sheet body', () => {
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

  test('mobile-sheet close event calls close()', async () => {
    const { wrapper, close } = mountSheet()
    await wrapper.findComponent({ name: 'MobileSheet' }).vm.$emit('close')
    expect(close).toHaveBeenCalledWith()
  })
})
