import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { nextTick } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { createTestingPinia } from '@pinia/testing'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  toastError: vi.fn()
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mocks.push })
}))

vi.mock('@/composables/toast', () => ({
  useToast: () => ({ error: mocks.toastError })
}))

// ── Stubs ──────────────────────────────────────────────────────────────────────

const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  props: ['size', 'loading', 'iconLeft', 'fancyHover'],
  emits: ['press'],
  setup(_props, { slots, attrs, emit }) {
    return () => h('button', { ...attrs, onClick: () => emit('press') }, slots.default?.())
  }
})

const UiInputStub = defineComponent({
  name: 'UiInput',
  inheritAttrs: false,
  props: ['type', 'name', 'modelValue', 'placeholder', 'size', 'autocomplete'],
  emits: ['update:modelValue'],
  setup(props, { attrs, emit }) {
    return () =>
      h('input', {
        ...attrs,
        type: props.type,
        name: props.name,
        value: props.modelValue,
        onInput: (e) => emit('update:modelValue', e.target.value)
      })
  }
})

const UiDividerStub = defineComponent({
  name: 'UiDivider',
  props: ['label'],
  setup() {
    return () => h('hr', { 'data-testid': 'ui-divider' })
  }
})

// ── Import ─────────────────────────────────────────────────────────────────────

import LoginDialog from '@/views/welcome/login/index.vue'
import { useSessionStore } from '@/stores/session'

// ── Mount helper ───────────────────────────────────────────────────────────────

function mountLoginDialog() {
  const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true })

  const wrapper = mount(LoginDialog, {
    global: {
      plugins: [pinia],
      stubs: {
        UiButton: UiButtonStub,
        UiInput: UiInputStub,
        UiDivider: UiDividerStub
      }
    }
  })

  const session = useSessionStore(pinia)
  return { wrapper, session }
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('LoginDialog', () => {
  beforeEach(() => {
    mocks.push.mockReset()
    mocks.toastError.mockReset()
  })

  // ── Structure ──────────────────────────────────────────────────────────────

  test('renders the login dialog container', () => {
    const { wrapper } = mountLoginDialog()
    expect(wrapper.find('[data-testid="login-dialog"]').exists()).toBe(true)
  })

  test('renders the Google OAuth button', () => {
    const { wrapper } = mountLoginDialog()
    expect(wrapper.find('[data-testid="login-dialog__google"]').exists()).toBe(true)
  })

  test('renders the email input', () => {
    const { wrapper } = mountLoginDialog()
    expect(wrapper.find('[data-testid="login-dialog__email"]').exists()).toBe(true)
  })

  test('renders the password input', () => {
    const { wrapper } = mountLoginDialog()
    expect(wrapper.find('[data-testid="login-dialog__password"]').exists()).toBe(true)
  })

  test('renders the submit button', () => {
    const { wrapper } = mountLoginDialog()
    expect(wrapper.find('[data-testid="login-dialog__submit"]').exists()).toBe(true)
  })

  // ── Google OAuth ───────────────────────────────────────────────────────────

  test('clicking Google button calls session.signInOAuth with "google"', async () => {
    const { wrapper, session } = mountLoginDialog()
    await wrapper.find('[data-testid="login-dialog__google"]').trigger('click')
    expect(session.signInOAuth).toHaveBeenCalledWith('google')
  })

  // ── Form submit — success path ─────────────────────────────────────────────

  test('submit success calls session.login with email and password', async () => {
    const { wrapper, session } = mountLoginDialog()
    session.login.mockResolvedValue(undefined)

    const emailInput = wrapper.find('[data-testid="login-dialog__email"] input')
    const passwordInput = wrapper.find('[data-testid="login-dialog__password"] input')

    await emailInput.setValue('user@example.com')
    await passwordInput.setValue('secret123')

    await wrapper.find('[data-testid="login-dialog__submit"]').trigger('click')
    await flushPromises()

    expect(session.login).toHaveBeenCalledWith('user@example.com', 'secret123')
  })

  test('submit success routes to authenticated', async () => {
    const { wrapper, session } = mountLoginDialog()
    session.login.mockResolvedValue(undefined)

    await wrapper.find('[data-testid="login-dialog__submit"]').trigger('click')
    await flushPromises()

    expect(mocks.push).toHaveBeenCalledWith({ name: 'authenticated' })
  })

  // ── Form submit — failure path ─────────────────────────────────────────────

  test('submit failure calls toast.error with the error message', async () => {
    const { wrapper, session } = mountLoginDialog()
    session.login.mockRejectedValue(new Error('Invalid credentials'))

    await wrapper.find('[data-testid="login-dialog__submit"]').trigger('click')
    await flushPromises()

    expect(mocks.toastError).toHaveBeenCalledWith('Invalid credentials')
  })

  test('submit failure does not navigate', async () => {
    const { wrapper, session } = mountLoginDialog()
    session.login.mockRejectedValue(new Error('oops'))

    await wrapper.find('[data-testid="login-dialog__submit"]').trigger('click')
    await flushPromises()

    expect(mocks.push).not.toHaveBeenCalled()
  })

  // ── Loading state ──────────────────────────────────────────────────────────

  test('loading toggles on submit and off after completion', async () => {
    const { wrapper, session } = mountLoginDialog()

    let resolve_login
    session.login.mockReturnValue(new Promise((r) => (resolve_login = r)))

    // Trigger submit without awaiting full settlement
    wrapper.find('[data-testid="login-dialog__submit"]').trigger('click')
    await nextTick()

    // The submit UiButton stub is the one with data-testid="login-dialog__submit"
    // loading=true while in-flight; we assert via the stub's declared prop
    const allButtons = wrapper.findAllComponents(UiButtonStub)
    const submitBtn = allButtons.find((b) => b.attributes('data-testid') === 'login-dialog__submit')
    expect(submitBtn.props('loading')).toBe(true)

    // Resolve the login and wait for all promises
    resolve_login(undefined)
    await flushPromises()

    expect(submitBtn.props('loading')).toBe(false)
  })
})
