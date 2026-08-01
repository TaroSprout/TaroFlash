import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))
vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx, emitHoverSfx: vi.fn(), emitStudySfx: vi.fn() }))

const mockPasswordActions = {
  password: ref(''),
  confirm_password: ref(''),
  current_password: ref(''),
  code: ref(''),
  step: ref('password'),
  loading: ref(false),
  errors: ref({}),
  success: ref(false),
  submit: vi.fn(),
  resendCode: vi.fn()
}
vi.mock('@/views/settings/account-access/use-password-actions', () => ({
  usePasswordActions: () => mockPasswordActions
}))

const mockSession = { hasPassword: false }
vi.mock('@/stores/session', () => ({ useSessionStore: () => mockSession }))

import PasswordSection from '@/views/settings/account-access/password-section.vue'

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
  mockPasswordActions.current_password.value = ''
  mockPasswordActions.code.value = ''
  mockPasswordActions.step.value = 'password'
  mockPasswordActions.loading.value = false
  mockPasswordActions.errors.value = {}
  mockPasswordActions.success.value = false
  mockPasswordActions.submit.mockReset()
  mockPasswordActions.resendCode.mockReset()
  mockSession.hasPassword = false
})

describe('PasswordSection', () => {
  // ── Structure ─────────────────────────────────────────────────────────────

  test('renders the password section container — a pure form, always [obligation]', () => {
    const wrapper = makeWrapper()
    expect(wrapper.find('[data-testid="account-access-modal__password-section"]').exists()).toBe(
      true
    )
  })

  test('renders unchanged when success flips true — no internal success panel [obligation]', async () => {
    const wrapper = makeWrapper()
    mockPasswordActions.success.value = true
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="account-access-modal__password-section"]').exists()).toBe(
      true
    )
    expect(wrapper.find('[data-testid="account-access-modal__password-success"]').exists()).toBe(
      false
    )
  })

  // ── field wiring ──────────────────────────────────────────────────────────

  test('typing into the password input advances the composable password ref', async () => {
    const wrapper = makeWrapper()
    const input = wrapper.find('[data-testid="account-access-modal__password-input"] input')

    await input.setValue('hunter22')

    expect(mockPasswordActions.password.value).toBe('hunter22')
  })

  test('typing into the confirm-password input advances the composable confirm_password ref', async () => {
    const wrapper = makeWrapper()
    const input = wrapper.find('[data-testid="account-access-modal__password-confirm-input"] input')

    await input.setValue('hunter22')

    expect(mockPasswordActions.confirm_password.value).toBe('hunter22')
  })

  // ── submit wiring ─────────────────────────────────────────────────────────

  test('calls submit exactly once when the submit button is pressed', async () => {
    const wrapper = makeWrapper()
    await wrapper.find('[data-testid="account-access-modal__password-submit"]').trigger('click')
    expect(mockPasswordActions.submit).toHaveBeenCalledOnce()
  })

  test('calls submit exactly once when the form is submitted (Enter key)', async () => {
    const wrapper = makeWrapper()
    await wrapper.find('form').trigger('submit')
    expect(mockPasswordActions.submit).toHaveBeenCalledOnce()
  })

  // ── step-driven fields ────────────────────────────────────────────────────

  describe('step-driven fields', () => {
    test('does not render the current-password input when session.hasPassword is false', () => {
      mockSession.hasPassword = false
      const wrapper = makeWrapper()
      expect(
        wrapper.find('[data-testid="account-access-modal__password-current-input"]').exists()
      ).toBe(false)
    })

    test('renders the current-password input when session.hasPassword is true', () => {
      mockSession.hasPassword = true
      const wrapper = makeWrapper()
      expect(
        wrapper.find('[data-testid="account-access-modal__password-current-input"]').exists()
      ).toBe(true)
    })

    test('typing into the current-password input advances the composable current_password ref', async () => {
      mockSession.hasPassword = true
      const wrapper = makeWrapper()
      const input = wrapper.find(
        '[data-testid="account-access-modal__password-current-input"] input'
      )

      await input.setValue('currentpw1')

      expect(mockPasswordActions.current_password.value).toBe('currentpw1')
    })

    test('renders the code input instead of the password/confirm inputs when step is "code"', () => {
      mockPasswordActions.step.value = 'code'
      const wrapper = makeWrapper()

      expect(
        wrapper.find('[data-testid="account-access-modal__password-code-input"]').exists()
      ).toBe(true)
      expect(wrapper.find('[data-testid="account-access-modal__password-input"]').exists()).toBe(
        false
      )
    })

    test('typing into the code input advances the composable code ref', async () => {
      mockPasswordActions.step.value = 'code'
      const wrapper = makeWrapper()
      const input = wrapper.find('[data-testid="account-access-modal__password-code-input"] input')

      await input.setValue('123456')

      expect(mockPasswordActions.code.value).toBe('123456')
    })

    test('shows the resend-code button only on the "code" step', () => {
      mockPasswordActions.step.value = 'password'
      const passwordStep = makeWrapper()
      expect(
        passwordStep.find('[data-testid="account-access-modal__password-resend-code"]').exists()
      ).toBe(false)

      mockPasswordActions.step.value = 'code'
      const codeStep = makeWrapper()
      expect(
        codeStep.find('[data-testid="account-access-modal__password-resend-code"]').exists()
      ).toBe(true)
    })

    test('calls resendCode when the resend-code button is pressed', async () => {
      mockPasswordActions.step.value = 'code'
      const wrapper = makeWrapper()

      await wrapper
        .find('[data-testid="account-access-modal__password-resend-code"]')
        .trigger('click')

      expect(mockPasswordActions.resendCode).toHaveBeenCalledOnce()
    })
  })

  // ── emits 'success' exactly once when success flips true [obligation] ──────

  describe('emits "success" exactly once when success flips true [obligation]', () => {
    test('does not emit "success" while success is false [obligation]', () => {
      const wrapper = makeWrapper()
      expect(wrapper.emitted('success')).toBeUndefined()
    })

    test('emits "success" when success flips to true [obligation]', async () => {
      const wrapper = makeWrapper()
      mockPasswordActions.success.value = true
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('success')).toHaveLength(1)
    })

    test('does not re-emit when success stays true across another update [obligation]', async () => {
      const wrapper = makeWrapper()
      mockPasswordActions.success.value = true
      await wrapper.vm.$nextTick()
      mockPasswordActions.password.value = 'x'
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('success')).toHaveLength(1)
    })
  })
})
