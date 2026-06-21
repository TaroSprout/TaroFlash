import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mockSubmitOAuth } = vi.hoisted(() => ({
  mockSubmitOAuth: vi.fn()
}))

vi.mock('@/sfx/bus', () => ({
  emitSfx: vi.fn(),
  emitHoverSfx: vi.fn()
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key) => key })
}))

// ── Stubs ──────────────────────────────────────────────────────────────────────

// UiInput stub — renders a real <input> so v-model and events work.
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
  props: ['size', 'fancyHover', 'iconLeft'],
  emits: ['press'],
  setup(props, { slots, emit }) {
    return () =>
      h(
        'button',
        { 'data-testid': 'ui-button-stub', onClick: () => emit('press') },
        slots.default?.()
      )
  }
})

// ── Import ─────────────────────────────────────────────────────────────────────

import SignupForm from '@/views/welcome/signup/form.vue'

// ── Mount helper ───────────────────────────────────────────────────────────────

function mountForm({ errors = {}, modelValues = {} } = {}) {
  return mount(SignupForm, {
    props: {
      errors,
      username: modelValues.username ?? '',
      email: modelValues.email ?? '',
      password: modelValues.password ?? '',
      confirmPassword: modelValues.confirmPassword ?? ''
    },
    global: {
      stubs: {
        UiInput: UiInputStub,
        UiDivider: UiDividerStub,
        UiButton: UiButtonStub
      },
      directives: { sfx: {} }
    }
  })
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('SignupForm (signup/form.vue)', () => {
  // ── Structure ──────────────────────────────────────────────────────────────

  test('renders the sign-up form wrapper', () => {
    const wrapper = mountForm()
    expect(wrapper.find('[data-testid="signup__form"]').exists()).toBe(true)
  })

  test('renders the social auth section', () => {
    const wrapper = mountForm()
    expect(wrapper.find('[data-testid="social-auth"]').exists()).toBe(true)
  })

  test('renders the email-auth form element', () => {
    const wrapper = mountForm()
    expect(wrapper.find('[data-testid="email-auth"]').exists()).toBe(true)
    expect(wrapper.find('form[data-testid="email-auth"]').exists()).toBe(true)
  })

  // ── submit event ───────────────────────────────────────────────────────────

  test('emits submit when the <form> is submitted [obligation]', async () => {
    const wrapper = mountForm()
    await wrapper.find('form[data-testid="email-auth"]').trigger('submit')
    expect(wrapper.emitted('submit')).toHaveLength(1)
  })

  test('hidden submit button inside the form allows Enter-key submission [obligation]', () => {
    const wrapper = mountForm()
    const hiddenBtn = wrapper.find('button[type="submit"]')
    expect(hiddenBtn.exists()).toBe(true)
    expect(hiddenBtn.attributes('aria-hidden')).toBe('true')
  })

  // ── OAuth button ───────────────────────────────────────────────────────────

  test('pressing the Google button emits "oauth" with "google"', async () => {
    const wrapper = mountForm()
    const googleBtn = wrapper.find('[data-testid="social-auth"] [data-testid="ui-button-stub"]')
    await googleBtn.trigger('click')
    expect(wrapper.emitted('oauth')).toEqual([['google']])
  })

  // ── field inputs ───────────────────────────────────────────────────────────

  test('renders four input fields inside the email-auth form', () => {
    const wrapper = mountForm()
    const form = wrapper.find('[data-testid="email-auth"]')
    expect(form.findAll('input').length).toBe(4)
  })

  test('passes errors.username to the username input via error prop', () => {
    const wrapper = mountForm({ errors: { username: 'Required' } })
    const inputs = wrapper.findAllComponents({ name: 'UiInput' })
    expect(inputs[0].props('error')).toBe('Required')
  })

  test('passes errors.email to the email input via error prop', () => {
    const wrapper = mountForm({ errors: { email: 'Invalid email' } })
    const inputs = wrapper.findAllComponents({ name: 'UiInput' })
    expect(inputs[1].props('error')).toBe('Invalid email')
  })

  test('passes errors.password to the password input via error prop', () => {
    const wrapper = mountForm({ errors: { password: 'Too short' } })
    const inputs = wrapper.findAllComponents({ name: 'UiInput' })
    expect(inputs[2].props('error')).toBe('Too short')
  })

  test('passes errors.confirm_password to the confirm-password input via error prop', () => {
    const wrapper = mountForm({ errors: { confirm_password: 'Mismatch' } })
    const inputs = wrapper.findAllComponents({ name: 'UiInput' })
    expect(inputs[3].props('error')).toBe('Mismatch')
  })
})
