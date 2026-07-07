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
  props: ['loading', 'fullWidth', 'size'],
  emits: ['press'],
  setup(props, { slots, attrs, emit }) {
    return () =>
      h('button', { ...attrs, type: attrs.type, onClick: () => emit('press') }, slots.default?.())
  }
})

// ── Import ─────────────────────────────────────────────────────────────────────

import ResetPasswordForm from '@/views/welcome/reset-password/form.vue'

// ── Mount helper ───────────────────────────────────────────────────────────────

function mountForm(props = {}) {
  return mount(ResetPasswordForm, {
    props: {
      password: '',
      confirmPassword: '',
      errors: {},
      loading: false,
      ...props
    },
    global: {
      stubs: { UiInput: UiInputStub, UiButton: UiButtonStub },
      directives: { sfx: {} }
    }
  })
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('ResetPasswordForm (reset-password/form.vue)', () => {
  // ── Structure ──────────────────────────────────────────────────────────────

  test('renders the reset-password container', () => {
    const wrapper = mountForm()
    expect(wrapper.find('[data-testid="reset-password-modal"]').exists()).toBe(true)
  })

  test('renders the password input', () => {
    const wrapper = mountForm()
    expect(wrapper.find('[data-testid="reset-password-modal__password-input"]').exists()).toBe(true)
  })

  test('renders the confirm-password input', () => {
    const wrapper = mountForm()
    expect(
      wrapper.find('[data-testid="reset-password-modal__confirm-password-input"]').exists()
    ).toBe(true)
  })

  // ── field wiring ───────────────────────────────────────────────────────────

  test('typing into the password input advances the password model', async () => {
    const wrapper = mountForm()
    const input = wrapper.find('[data-testid="reset-password-modal__password-input"]')
    await input.setValue('hunter2222')
    expect(wrapper.emitted('update:password')).toEqual([['hunter2222']])
  })

  test('typing into the confirm-password input advances the confirmPassword model', async () => {
    const wrapper = mountForm()
    const input = wrapper.find('[data-testid="reset-password-modal__confirm-password-input"]')
    await input.setValue('hunter2222')
    expect(wrapper.emitted('update:confirmPassword')).toEqual([['hunter2222']])
  })

  // ── submit wiring — regression: submit button lives outside <form> [obligation]

  describe('submit button lives outside the <form> [obligation]', () => {
    test('the visible submit button is NOT a descendant of the <form> element [obligation]', () => {
      const wrapper = mountForm()
      const form = wrapper.find('form')
      expect(form.find('[data-testid="reset-password-modal__submit"]').exists()).toBe(false)
    })

    test('clicking the visible submit button emits "submit" exactly once [obligation]', async () => {
      const wrapper = mountForm()
      await wrapper.find('[data-testid="reset-password-modal__submit"]').trigger('click')
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

  test('passes errors.password to the password input via error prop', () => {
    const wrapper = mountForm({ errors: { password: 'Too short' } })
    const inputs = wrapper.findAllComponents({ name: 'UiInput' })
    expect(inputs[0].props('error')).toBe('Too short')
  })

  test('passes errors.confirm_password to the confirm-password input via error prop', () => {
    const wrapper = mountForm({ errors: { confirm_password: 'Mismatch' } })
    const inputs = wrapper.findAllComponents({ name: 'UiInput' })
    expect(inputs[1].props('error')).toBe('Mismatch')
  })

  test('passes the loading prop through to the submit button', () => {
    const wrapper = mountForm({ loading: true })
    expect(wrapper.findComponent({ name: 'UiButton' }).props('loading')).toBe(true)
  })
})
