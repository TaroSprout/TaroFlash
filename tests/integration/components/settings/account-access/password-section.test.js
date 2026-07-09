import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))
vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx, emitHoverSfx: vi.fn(), emitStudySfx: vi.fn() }))

const mockPasswordActions = {
  password: ref(''),
  confirm_password: ref(''),
  loading: ref(false),
  errors: ref({}),
  success: ref(false),
  submit: vi.fn()
}
vi.mock('@/views/settings/account-access/use-password-actions', () => ({
  usePasswordActions: () => mockPasswordActions
}))

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
  mockPasswordActions.loading.value = false
  mockPasswordActions.errors.value = {}
  mockPasswordActions.success.value = false
  mockPasswordActions.submit.mockReset()
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
