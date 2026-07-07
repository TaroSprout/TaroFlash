import { describe, test, expect, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
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

const UiInputStub = defineComponent({
  name: 'UiInput',
  inheritAttrs: false,
  props: ['placeholder', 'error', 'size', 'type', 'name', 'autocomplete', 'modelValue'],
  emits: ['update:modelValue'],
  setup(props, { attrs, emit }) {
    return () =>
      h('input', {
        ...attrs,
        type: props.type ?? 'text',
        placeholder: props.placeholder,
        value: props.modelValue ?? '',
        onInput: (e) => emit('update:modelValue', e.target.value)
      })
  }
})

const UiDividerStub = defineComponent({
  name: 'UiDivider',
  setup() {
    return () => h('hr', { 'data-testid': 'divider-stub' })
  }
})

const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  props: ['size', 'iconLeft', 'loading', 'disabled', 'clickWhenDisabled'],
  emits: ['press'],
  setup(props, { slots, attrs, emit }) {
    return () =>
      h('button', { ...attrs, type: attrs.type, onClick: () => emit('press') }, slots.default?.())
  }
})

// ── Import ─────────────────────────────────────────────────────────────────────

import LoginForm from '@/views/welcome/login/form.vue'

// ── Mount helper ───────────────────────────────────────────────────────────────

function mountForm(props = {}) {
  return mount(LoginForm, {
    props: {
      email: '',
      password: '',
      errors: {},
      loading: false,
      allFilled: false,
      submitError: '',
      ...props
    },
    global: {
      stubs: { UiInput: UiInputStub, UiDivider: UiDividerStub, UiButton: UiButtonStub },
      directives: { sfx: {} }
    }
  })
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('LoginForm (login/form.vue)', () => {
  // ── Structure ──────────────────────────────────────────────────────────────

  test('renders the login dialog container', () => {
    const wrapper = mountForm()
    expect(wrapper.find('[data-testid="login-dialog"]').exists()).toBe(true)
  })

  test('renders the email input', () => {
    const wrapper = mountForm()
    expect(wrapper.find('[data-testid="login-dialog__email"]').exists()).toBe(true)
  })

  test('renders the password input', () => {
    const wrapper = mountForm()
    expect(wrapper.find('[data-testid="login-dialog__password"]').exists()).toBe(true)
  })

  test('renders the submit button', () => {
    const wrapper = mountForm()
    expect(wrapper.find('[data-testid="login-dialog__submit"]').exists()).toBe(true)
  })

  // ── submit event ───────────────────────────────────────────────────────────

  test('emits submit when the form is submitted', async () => {
    const wrapper = mountForm()
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('submit')).toHaveLength(1)
  })

  test('emits submit when the submit button is pressed', async () => {
    const wrapper = mountForm()
    await wrapper.find('[data-testid="login-dialog__submit"]').trigger('click')
    expect(wrapper.emitted('submit')).toHaveLength(1)
  })

  // ── field wiring ───────────────────────────────────────────────────────────

  test('typing into the email input advances the email model', async () => {
    const wrapper = mountForm()
    const input = wrapper.find('[data-testid="login-dialog__email"] input')
    await input.setValue('user@example.com')
    expect(wrapper.emitted('update:email')).toEqual([['user@example.com']])
  })

  test('typing into the password input advances the password model', async () => {
    const wrapper = mountForm()
    const input = wrapper.find('[data-testid="login-dialog__password"] input')
    await input.setValue('hunter22')
    expect(wrapper.emitted('update:password')).toEqual([['hunter22']])
  })

  // ── OAuth ──────────────────────────────────────────────────────────────────

  test('pressing the Google button emits "oauth" with "google"', async () => {
    const wrapper = mountForm()
    await wrapper.find('[data-testid="login-dialog__google"]').trigger('click')
    expect(wrapper.emitted('oauth')).toEqual([['google']])
  })

  // ── forgot-password button — regression: type="button" [obligation] ────────

  describe('forgot-password button [obligation]', () => {
    test('has type="button" so it never triggers native form submission [obligation]', () => {
      const wrapper = mountForm()
      const button = wrapper.find('[data-testid="login-dialog__forgot-password"]')
      expect(button.attributes('type')).toBe('button')
    })

    test('emits "forgot-password" exactly once on click [obligation]', async () => {
      const wrapper = mountForm()
      await wrapper.find('[data-testid="login-dialog__forgot-password"]').trigger('click')
      expect(wrapper.emitted('forgot-password')).toHaveLength(1)
    })

    test('does NOT emit "submit" when the forgot-password button is clicked [obligation]', async () => {
      const wrapper = mountForm()
      await wrapper.find('[data-testid="login-dialog__forgot-password"]').trigger('click')
      expect(wrapper.emitted('submit')).toBeUndefined()
    })
  })

  // ── errors / loading / disabled state ───────────────────────────────────────

  test('passes errors.email to the email input via error prop', () => {
    const wrapper = mountForm({ errors: { email: 'Invalid email' } })
    const inputs = wrapper.findAllComponents({ name: 'UiInput' })
    expect(inputs[0].props('error')).toBe('Invalid email')
  })

  test('passes errors.password to the password input via error prop', () => {
    const wrapper = mountForm({ errors: { password: 'Required' } })
    const inputs = wrapper.findAllComponents({ name: 'UiInput' })
    expect(inputs[1].props('error')).toBe('Required')
  })

  test('shows the submitError message when present', () => {
    const wrapper = mountForm({ submitError: 'Invalid credentials' })
    expect(wrapper.find('[data-testid="login-dialog__error"]').text()).toBe('Invalid credentials')
  })

  test('hides the error paragraph when submitError is empty', () => {
    const wrapper = mountForm()
    expect(wrapper.find('[data-testid="login-dialog__error"]').exists()).toBe(false)
  })

  test('passes the loading prop through to the submit button', () => {
    const wrapper = mountForm({ loading: true })
    const submit = wrapper
      .findAllComponents({ name: 'UiButton' })
      .find((c) => c.attributes('data-testid') === 'login-dialog__submit')
    expect(submit.props('loading')).toBe(true)
  })
})
