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

const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  props: ['loading', 'disabled', 'clickWhenDisabled', 'fullWidth', 'size'],
  emits: ['press'],
  setup(props, { slots, attrs, emit }) {
    return () =>
      h('button', { ...attrs, type: attrs.type, onClick: () => emit('press') }, slots.default?.())
  }
})

// ── Import ─────────────────────────────────────────────────────────────────────

import ForgotPasswordForm from '@/views/welcome/forgot-password/form.vue'

// ── Mount helper ───────────────────────────────────────────────────────────────

function mountForm(props = {}) {
  return mount(ForgotPasswordForm, {
    props: {
      email: '',
      errors: {},
      loading: false,
      allFilled: false,
      submitError: '',
      ...props
    },
    global: {
      stubs: { UiInput: UiInputStub, UiButton: UiButtonStub },
      directives: { sfx: {} }
    }
  })
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('ForgotPasswordForm (forgot-password/form.vue)', () => {
  // ── Structure ──────────────────────────────────────────────────────────────

  test('renders the forgot-password container', () => {
    const wrapper = mountForm()
    expect(wrapper.find('[data-testid="forgot-password-modal"]').exists()).toBe(true)
  })

  test('renders the email input', () => {
    const wrapper = mountForm()
    expect(wrapper.find('[data-testid="forgot-password-modal__email-input"]').exists()).toBe(true)
  })

  // ── submit wiring — regression: submit button lives outside <form> [obligation]

  describe('submit button lives outside the <form> [obligation]', () => {
    test('the visible submit button is NOT a descendant of the <form> element [obligation]', () => {
      const wrapper = mountForm()
      const form = wrapper.find('form')
      expect(form.find('[data-testid="forgot-password-modal__submit"]').exists()).toBe(false)
    })

    test('clicking the visible submit button emits "submit" exactly once [obligation]', async () => {
      const wrapper = mountForm()
      await wrapper.find('[data-testid="forgot-password-modal__submit"]').trigger('click')
      expect(wrapper.emitted('submit')).toHaveLength(1)
    })

    test('a hidden sr-only submit button inside the form supports Enter-key submission [obligation]', () => {
      const wrapper = mountForm()
      const hiddenBtn = wrapper.find('form button[type="submit"]')
      expect(hiddenBtn.exists()).toBe(true)
      expect(hiddenBtn.attributes('aria-hidden')).toBe('true')
    })

    test('submitting the form (Enter key) emits "submit" exactly once [obligation]', async () => {
      const wrapper = mountForm()
      await wrapper.find('form').trigger('submit')
      expect(wrapper.emitted('submit')).toHaveLength(1)
    })
  })

  // ── errors / state ────────────────────────────────────────────────────────

  test('passes errors.email to the email input via error prop', () => {
    const wrapper = mountForm({ errors: { email: 'Required' } })
    expect(wrapper.findComponent({ name: 'UiInput' }).props('error')).toBe('Required')
  })

  test('shows the submitError message when present', () => {
    const wrapper = mountForm({ submitError: 'Something went wrong' })
    expect(wrapper.find('[data-testid="forgot-password-modal__error"]').text()).toBe(
      'Something went wrong'
    )
  })

  test('hides the error paragraph when submitError is empty', () => {
    const wrapper = mountForm()
    expect(wrapper.find('[data-testid="forgot-password-modal__error"]').exists()).toBe(false)
  })

  test('passes the loading prop through to the submit button', () => {
    const wrapper = mountForm({ loading: true })
    expect(wrapper.findComponent({ name: 'UiButton' }).props('loading')).toBe(true)
  })
})
