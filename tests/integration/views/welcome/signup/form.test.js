import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, useAttrs } from 'vue'

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

// UiTooltip wraps the label element; stub it so slot content renders in the tree.
const UiTooltipStub = defineComponent({
  name: 'UiTooltip',
  inheritAttrs: false,
  setup(_p, { slots }) {
    const attrs = useAttrs()
    return () => h('label', { ...attrs }, slots.default?.())
  }
})

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
        'data-testid': attrs['data-testid'] ?? 'ui-input-stub',
        type: props.type ?? 'text',
        placeholder: props.placeholder,
        value: props.modelValue ?? '',
        onInput: (e) => emit('update:modelValue', e.target.value)
      })
  }
})

// UiDivider stub
const UiDividerStub = defineComponent({
  name: 'UiDivider',
  setup() {
    return () => h('hr', { 'data-testid': 'divider-stub' })
  }
})

// UiButton stub
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

// ── Auth mock ──────────────────────────────────────────────────────────────────

function makeAuth(overrides = {}) {
  return {
    username: '',
    email: '',
    password: '',
    confirm_password: '',
    errors: {},
    submitOAuth: mockSubmitOAuth,
    ...overrides
  }
}

// ── Mount helper ───────────────────────────────────────────────────────────────

function mountForm(authOverrides = {}) {
  return mount(SignupForm, {
    props: { auth: makeAuth(authOverrides) },
    global: {
      stubs: {
        UiInput: UiInputStub,
        UiDivider: UiDividerStub,
        UiButton: UiButtonStub,
        UiTooltip: UiTooltipStub
      },
      directives: { sfx: {} }
    }
  })
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('SignupForm (signup/form.vue)', () => {
  beforeEach(() => {
    mockSubmitOAuth.mockReset()
  })

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
    // It must be screen-reader hidden so it doesn't appear as a second submit action.
    expect(hiddenBtn.attributes('aria-hidden')).toBe('true')
  })

  // ── OAuth button ───────────────────────────────────────────────────────────

  test('pressing the Google button calls auth.submitOAuth with "google"', async () => {
    const wrapper = mountForm()
    // The google button is the UiButton inside social-auth section
    const googleBtn = wrapper.find('[data-testid="social-auth"] [data-testid="ui-button-stub"]')
    await googleBtn.trigger('click')
    expect(mockSubmitOAuth).toHaveBeenCalledWith('google')
  })

  // ── field inputs ───────────────────────────────────────────────────────────

  test('renders four input fields inside the email-auth form', () => {
    const wrapper = mountForm()
    const form = wrapper.find('[data-testid="email-auth"]')
    // 4 UiInput stubs render as <input> elements
    expect(form.findAll('input').length).toBe(4)
  })

  test('passes auth.errors.username to the username input', () => {
    const wrapper = mountForm({ errors: { username: 'Required' } })
    const inputs = wrapper.findAllComponents({ name: 'UiInput' })
    expect(inputs[0].props('error')).toBe('Required')
  })

  test('passes auth.errors.email to the email input', () => {
    const wrapper = mountForm({ errors: { email: 'Invalid email' } })
    const inputs = wrapper.findAllComponents({ name: 'UiInput' })
    expect(inputs[1].props('error')).toBe('Invalid email')
  })

  test('passes auth.errors.password to the password input', () => {
    const wrapper = mountForm({ errors: { password: 'Too short' } })
    const inputs = wrapper.findAllComponents({ name: 'UiInput' })
    expect(inputs[2].props('error')).toBe('Too short')
  })

  test('passes auth.errors.confirm_password to the confirm-password input', () => {
    const wrapper = mountForm({ errors: { confirm_password: 'Mismatch' } })
    const inputs = wrapper.findAllComponents({ name: 'UiInput' })
    expect(inputs[3].props('error')).toBe('Mismatch')
  })
})
