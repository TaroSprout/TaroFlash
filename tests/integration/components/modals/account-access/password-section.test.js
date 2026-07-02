import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))
vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx, emitHoverSfx: vi.fn(), emitStudySfx: vi.fn() }))

const { coarseRef } = vi.hoisted(() => ({ coarseRef: { value: false } }))
vi.mock('@/composables/ui/media-query', () => ({ useMatchMedia: () => coarseRef }))

vi.mock('gsap', () => ({ gsap: { to: vi.fn((_el, opts) => opts?.onComplete?.()) } }))

const mockPasswordActions = {
  password: ref(''),
  confirm_password: ref(''),
  loading: ref(false),
  errors: ref({}),
  success: ref(false),
  submit: vi.fn()
}
vi.mock('@/components/modals/account-access/use-password-actions', () => ({
  usePasswordActions: () => mockPasswordActions
}))

import PasswordSection from '@/components/modals/account-access/password-section.vue'

// ── Stubs ─────────────────────────────────────────────────────────────────────

const UiTooltipStub = defineComponent({
  name: 'UiTooltip',
  inheritAttrs: false,
  props: ['element', 'gap', 'suppress', 'text', 'theme', 'theme_dark', 'position', 'visible'],
  setup(_props, { slots, attrs }) {
    return () => h('label', { ...attrs }, slots.default?.())
  }
})

function makeWrapper() {
  return mount(PasswordSection, {
    global: {
      stubs: { UiTooltip: UiTooltipStub },
      directives: { sfx: {} }
    }
  })
}

beforeEach(() => {
  mockPasswordActions.password.value = ''
  mockPasswordActions.confirm_password.value = ''
  mockPasswordActions.loading.value = false
  mockPasswordActions.errors.value = {}
  mockPasswordActions.success.value = false
  mockPasswordActions.submit.mockReset()
})

describe('PasswordSection', () => {
  test('[obligation] typing into the password input advances the composable password ref', async () => {
    const wrapper = makeWrapper()
    const input = wrapper.find('[data-testid="account-access-modal__password-input"] input')

    await input.setValue('hunter22')

    expect(mockPasswordActions.password.value).toBe('hunter22')
  })

  test('[obligation] typing into the confirm-password input advances the composable confirm_password ref', async () => {
    const wrapper = makeWrapper()
    const input = wrapper.find('[data-testid="account-access-modal__password-confirm-input"] input')

    await input.setValue('hunter22')

    expect(mockPasswordActions.confirm_password.value).toBe('hunter22')
  })

  test('calls submit when the submit button is pressed', async () => {
    const wrapper = makeWrapper()
    await wrapper.find('[data-testid="account-access-modal__password-submit"]').trigger('click')
    expect(mockPasswordActions.submit).toHaveBeenCalledOnce()
  })

  test('shows the success message instead of the form when success is true', () => {
    mockPasswordActions.success.value = true
    const wrapper = makeWrapper()

    expect(wrapper.find('[data-testid="account-access-modal__password-success"]').exists()).toBe(
      true
    )
    expect(wrapper.find('[data-testid="account-access-modal__password-input"]').exists()).toBe(
      false
    )
  })
})
