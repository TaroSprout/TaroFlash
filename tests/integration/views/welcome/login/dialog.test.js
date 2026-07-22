import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, reactive } from 'vue'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mockSubmit, mockSubmitOAuth, mockOnAuthenticated, mockForgotOpen } = vi.hoisted(() => ({
  mockSubmit: vi.fn(),
  mockSubmitOAuth: vi.fn(),
  mockOnAuthenticated: vi.fn(),
  mockForgotOpen: vi.fn()
}))

vi.mock('@/sfx/bus', () => ({
  emitSfx: vi.fn(),
  emitHoverSfx: vi.fn()
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key) => key })
}))

const mockLoginActions = reactive({
  email: '',
  password: '',
  errors: {},
  loading: false,
  all_filled: false,
  submitError: '',
  submit: mockSubmit,
  submitOAuth: mockSubmitOAuth
})

vi.mock('@/composables/auth/use-login-actions', () => ({
  useLoginActions: () => mockLoginActions
}))

vi.mock('@/stores/session', () => ({
  useSessionStore: () => ({ onAuthenticated: mockOnAuthenticated })
}))

vi.mock('@/views/welcome/forgot-password/forgot-password-modal', () => ({
  useForgotPasswordModal: () => ({ open: mockForgotOpen })
}))

// ── Stubs ──────────────────────────────────────────────────────────────────────

const LoginFormStub = defineComponent({
  name: 'LoginForm',
  emits: ['submit', 'oauth', 'forgot-password', 'update:email', 'update:password'],
  setup(_props, { emit }) {
    return () =>
      h('div', { 'data-testid': 'login-form-stub' }, [
        h('button', { 'data-testid': 'trigger-submit', onClick: () => emit('submit') }),
        h('button', {
          'data-testid': 'trigger-forgot-password',
          onClick: () => emit('forgot-password')
        }),
        h('button', {
          'data-testid': 'trigger-update-email',
          onClick: () => emit('update:email', 'user@example.com')
        }),
        h('button', {
          'data-testid': 'trigger-update-password',
          onClick: () => emit('update:password', 'hunter22')
        })
      ])
  }
})

// ── Import ─────────────────────────────────────────────────────────────────────

import LoginDialog from '@/views/welcome/login/dialog.vue'

// ── Mount helper ───────────────────────────────────────────────────────────────

function mountDialog(props = {}) {
  return shallowMount(LoginDialog, {
    props,
    global: { stubs: { LoginForm: LoginFormStub } }
  })
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockSubmit.mockReset()
  mockSubmitOAuth.mockReset()
  mockOnAuthenticated.mockReset()
  mockForgotOpen.mockReset()
  mockLoginActions.email = ''
  mockLoginActions.password = ''
})

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('LoginDialog (login/dialog.vue)', () => {
  test('renders the login form', () => {
    const wrapper = mountDialog()
    expect(wrapper.find('[data-testid="login-form-stub"]').exists()).toBe(true)
  })

  // ── onSubmit — success ─────────────────────────────────────────────────────

  // [obligation] on success the dialog delegates to session.onAuthenticated()
  // (the single post-auth funnel) instead of pushing + calling close itself.
  test('calls session.onAuthenticated() on a successful submit [obligation]', async () => {
    mockSubmit.mockResolvedValueOnce('success')
    const close = vi.fn()
    const wrapper = mountDialog({ close })

    await wrapper.find('[data-testid="trigger-submit"]').trigger('click')
    await flushPromises()

    expect(mockOnAuthenticated).toHaveBeenCalledOnce()
    expect(close).not.toHaveBeenCalled()
  })

  test('does not call onAuthenticated on a failed submit [obligation]', async () => {
    mockSubmit.mockResolvedValueOnce('invalid')
    const close = vi.fn()
    const wrapper = mountDialog({ close })

    await wrapper.find('[data-testid="trigger-submit"]').trigger('click')
    await flushPromises()

    expect(mockOnAuthenticated).not.toHaveBeenCalled()
    expect(close).not.toHaveBeenCalled()
  })

  test('does not throw when close is omitted on a successful submit', async () => {
    mockSubmit.mockResolvedValueOnce('success')
    const wrapper = mountDialog()

    await wrapper.find('[data-testid="trigger-submit"]').trigger('click')
    await expect(flushPromises()).resolves.not.toThrow()
  })

  // ── v-model wiring ─────────────────────────────────────────────────────────

  test('forwards "update:email" from the form to auth.email', async () => {
    const wrapper = mountDialog()
    await wrapper.find('[data-testid="trigger-update-email"]').trigger('click')
    expect(mockLoginActions.email).toBe('user@example.com')
  })

  test('forwards "update:password" from the form to auth.password', async () => {
    const wrapper = mountDialog()
    await wrapper.find('[data-testid="trigger-update-password"]').trigger('click')
    expect(mockLoginActions.password).toBe('hunter22')
  })

  // ── oauth wiring ───────────────────────────────────────────────────────────

  test('delegates the "oauth" event to auth.submitOAuth', () => {
    const wrapper = mountDialog()
    wrapper.findComponent(LoginFormStub).vm.$emit('oauth', 'google')
    expect(mockSubmitOAuth).toHaveBeenCalledWith('google')
  })

  // ── onForgotPassword [obligation] ─────────────────────────────────────────

  describe('forgot-password wiring [obligation]', () => {
    test('closes the login dialog and opens the forgot-password modal [obligation]', async () => {
      const close = vi.fn()
      const wrapper = mountDialog({ close })

      await wrapper.find('[data-testid="trigger-forgot-password"]').trigger('click')

      expect(close).toHaveBeenCalledOnce()
      expect(mockForgotOpen).toHaveBeenCalledOnce()
    })

    test('does not throw when close is omitted [obligation]', async () => {
      const wrapper = mountDialog()

      await expect(
        wrapper.find('[data-testid="trigger-forgot-password"]').trigger('click')
      ).resolves.not.toThrow()
      expect(mockForgotOpen).toHaveBeenCalledOnce()
    })
  })
})
