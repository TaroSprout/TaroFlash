import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  alertWarn: vi.fn(),
  authSubmit: vi.fn(),
  authLoading: false,
  authAllFilled: false,
  authErrors: {}
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mocks.push })
}))

vi.mock('@/composables/alert', () => ({
  useAlert: () => ({ warn: mocks.alertWarn })
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key) => key })
}))

// Mock useSignupActions — returns a reactive-like object with submit and state.
vi.mock('@/composables/auth/use-signup-actions', () => ({
  useSignupActions: () => ({
    submit: mocks.authSubmit,
    get loading() {
      return mocks.authLoading
    },
    get all_filled() {
      return mocks.authAllFilled
    },
    get errors() {
      return mocks.authErrors
    },
    username: '',
    email: '',
    password: '',
    confirm_password: ''
  })
}))

// ── Stubs ──────────────────────────────────────────────────────────────────────

const AppWindowStub = defineComponent({
  name: 'AppWindow',
  inheritAttrs: false,
  emits: ['close'],
  setup(_props, { slots, emit }) {
    return () =>
      h('div', { 'data-testid': 'signup-container' }, [
        h('button', { 'data-testid': 'app-window__close', onClick: () => emit('close') }),
        slots.default?.()
      ])
  }
})

const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  props: ['loading', 'disabled', 'clickWhenDisabled', 'fullWidth', 'size'],
  emits: ['press'],
  setup(props, { slots, attrs, emit }) {
    return () =>
      h(
        'button',
        {
          ...attrs,
          'data-loading': props.loading ? 'true' : undefined,
          'data-disabled': props.disabled ? 'true' : undefined,
          onClick: () => emit('press')
        },
        slots.default?.()
      )
  }
})

const SignupFormStub = defineComponent({
  name: 'SignupForm',
  props: ['auth'],
  emits: ['submit'],
  setup(_props, { emit }) {
    return () =>
      h('div', { 'data-testid': 'signup-form-stub' }, [
        h('button', { 'data-testid': 'signup-form-stub__submit', onClick: () => emit('submit') })
      ])
  }
})

// ── Import ─────────────────────────────────────────────────────────────────────

import SignupDialog from '@/views/welcome/signup/index.vue'

// ── Mount helper ───────────────────────────────────────────────────────────────

function mountSignupDialog({ close = vi.fn() } = {}) {
  return shallowMount(SignupDialog, {
    props: { close },
    global: {
      stubs: {
        AppWindow: AppWindowStub,
        UiButton: UiButtonStub,
        SignupForm: SignupFormStub
      }
    }
  })
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('SignupDialog (signup/index.vue)', () => {
  beforeEach(() => {
    mocks.push.mockReset()
    mocks.alertWarn.mockReset()
    mocks.authSubmit.mockReset()
    mocks.authLoading = false
    mocks.authAllFilled = false
    mocks.authErrors = {}
  })

  // ── Structure ──────────────────────────────────────────────────────────────

  test('renders the signup container', () => {
    const wrapper = mountSignupDialog()
    expect(wrapper.find('[data-testid="signup-container"]').exists()).toBe(true)
  })

  test('renders the signup body', () => {
    const wrapper = mountSignupDialog()
    expect(wrapper.find('[data-testid="signup__body"]').exists()).toBe(true)
  })

  test('renders the signup form', () => {
    const wrapper = mountSignupDialog()
    expect(wrapper.find('[data-testid="signup-form-stub"]').exists()).toBe(true)
  })

  test('renders the actions section', () => {
    const wrapper = mountSignupDialog()
    expect(wrapper.find('[data-testid="signup__actions"]').exists()).toBe(true)
  })

  // ── onSubmit: success path ─────────────────────────────────────────────────

  test('on success: pushes to /dashboard [obligation]', async () => {
    mocks.authSubmit.mockResolvedValueOnce('success')
    const close = vi.fn()
    const wrapper = mountSignupDialog({ close })

    // Trigger submit via the submit button press event
    const buttons = wrapper.findAllComponents({ name: 'UiButton' })
    const submitBtn = buttons[buttons.length - 1]
    await submitBtn.trigger('click')
    await flushPromises()

    expect(mocks.push).toHaveBeenCalledWith('/dashboard')
  })

  test('on success: calls close(true) [obligation]', async () => {
    mocks.authSubmit.mockResolvedValueOnce('success')
    const close = vi.fn()
    const wrapper = mountSignupDialog({ close })

    const buttons = wrapper.findAllComponents({ name: 'UiButton' })
    const submitBtn = buttons[buttons.length - 1]
    await submitBtn.trigger('click')
    await flushPromises()

    expect(close).toHaveBeenCalledWith(true)
  })

  // ── onSubmit: error path ───────────────────────────────────────────────────

  test('on error: shows alert.warn [obligation]', async () => {
    mocks.authSubmit.mockResolvedValueOnce('error')
    const close = vi.fn()
    const wrapper = mountSignupDialog({ close })

    const buttons = wrapper.findAllComponents({ name: 'UiButton' })
    const submitBtn = buttons[buttons.length - 1]
    await submitBtn.trigger('click')
    await flushPromises()

    expect(mocks.alertWarn).toHaveBeenCalled()
  })

  test('on error: modal stays open (close NOT called) [obligation]', async () => {
    mocks.authSubmit.mockResolvedValueOnce('error')
    const close = vi.fn()
    const wrapper = mountSignupDialog({ close })

    const buttons = wrapper.findAllComponents({ name: 'UiButton' })
    const submitBtn = buttons[buttons.length - 1]
    await submitBtn.trigger('click')
    await flushPromises()

    expect(close).not.toHaveBeenCalled()
  })

  // ── onSubmit: invalid path ─────────────────────────────────────────────────

  test('on invalid: modal stays open, no alert [obligation]', async () => {
    mocks.authSubmit.mockResolvedValueOnce('invalid')
    const close = vi.fn()
    const wrapper = mountSignupDialog({ close })

    const buttons = wrapper.findAllComponents({ name: 'UiButton' })
    const submitBtn = buttons[buttons.length - 1]
    await submitBtn.trigger('click')
    await flushPromises()

    expect(close).not.toHaveBeenCalled()
    expect(mocks.alertWarn).not.toHaveBeenCalled()
  })

  // ── form @submit wiring ────────────────────────────────────────────────────

  test('form submit event triggers onSubmit (calls auth.submit) [obligation]', async () => {
    mocks.authSubmit.mockResolvedValueOnce('invalid')
    const wrapper = mountSignupDialog()

    await wrapper.find('[data-testid="signup-form-stub__submit"]').trigger('click')
    await flushPromises()

    expect(mocks.authSubmit).toHaveBeenCalled()
  })

  // ── Cancel button ──────────────────────────────────────────────────────────

  test('cancel button calls close() with no argument', async () => {
    const close = vi.fn()
    const wrapper = mountSignupDialog({ close })

    const buttons = wrapper.findAllComponents({ name: 'UiButton' })
    const cancelBtn = buttons[0]
    await cancelBtn.trigger('click')

    expect(close).toHaveBeenCalledWith()
  })

  test('app-window close event calls close() with no argument', async () => {
    const close = vi.fn()
    const wrapper = mountSignupDialog({ close })

    await wrapper.find('[data-testid="app-window__close"]').trigger('click')

    expect(close).toHaveBeenCalledWith()
  })
})
