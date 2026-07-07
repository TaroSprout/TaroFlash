import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))
vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx, emitHoverSfx: vi.fn(), emitStudySfx: vi.fn() }))

const mockEmailActions = {
  current_email: ref('current@example.com'),
  email: ref(''),
  loading: ref(false),
  error: ref(''),
  pending: ref(false),
  submit: vi.fn()
}
vi.mock('@/components/settings/account-access/use-email-actions', () => ({
  useEmailActions: () => mockEmailActions
}))

import EmailSection from '@/components/settings/account-access/email-section.vue'

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
  return mount(EmailSection, {
    global: {
      stubs: { UiTooltip: UiTooltipStub },
      directives: { sfx: {} }
    }
  })
}

beforeEach(() => {
  mockEmailActions.current_email.value = 'current@example.com'
  mockEmailActions.email.value = ''
  mockEmailActions.loading.value = false
  mockEmailActions.error.value = ''
  mockEmailActions.pending.value = false
  mockEmailActions.submit.mockReset()
})

describe('EmailSection', () => {
  // ── Structure ─────────────────────────────────────────────────────────────

  test('renders the email section container — a pure form, always [obligation]', () => {
    const wrapper = makeWrapper()
    expect(wrapper.find('[data-testid="account-access-modal__email-section"]').exists()).toBe(true)
  })

  test('renders unchanged when pending flips true — no internal pending panel [obligation]', async () => {
    const wrapper = makeWrapper()
    mockEmailActions.pending.value = true
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="account-access-modal__email-section"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="account-access-modal__email-pending"]').exists()).toBe(false)
  })

  // ── field wiring ──────────────────────────────────────────────────────────

  test('typing into the new-email input advances the composable email ref (not just the DOM value)', async () => {
    const wrapper = makeWrapper()
    const input = wrapper.find('[data-testid="account-access-modal__email-input"] input')

    await input.setValue('new@example.com')

    expect(mockEmailActions.email.value).toBe('new@example.com')
  })

  // ── submit wiring ─────────────────────────────────────────────────────────

  test('calls submit exactly once when the submit button is pressed', async () => {
    const wrapper = makeWrapper()
    await wrapper.find('[data-testid="account-access-modal__email-submit"]').trigger('click')
    expect(mockEmailActions.submit).toHaveBeenCalledOnce()
  })

  test('calls submit exactly once when the form is submitted (Enter key)', async () => {
    const wrapper = makeWrapper()
    await wrapper.find('form').trigger('submit')
    expect(mockEmailActions.submit).toHaveBeenCalledOnce()
  })

  // ── errors ────────────────────────────────────────────────────────────────

  test('passes the composable error to the email input as tooltip text', () => {
    mockEmailActions.error.value = 'Taken'
    const wrapper = makeWrapper()
    const input = wrapper.find('[data-testid="account-access-modal__email-input"]')
    expect(input.findComponent(UiTooltipStub).props('text')).toBe('Taken')
  })

  // ── emits 'pending' exactly once when pending flips true [obligation] ──────

  describe('emits "pending" exactly once when pending flips true [obligation]', () => {
    test('does not emit "pending" while pending is false [obligation]', () => {
      const wrapper = makeWrapper()
      expect(wrapper.emitted('pending')).toBeUndefined()
    })

    test('emits "pending" when pending flips to true [obligation]', async () => {
      const wrapper = makeWrapper()
      mockEmailActions.pending.value = true
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('pending')).toHaveLength(1)
    })

    test('does not re-emit when pending stays true across another update [obligation]', async () => {
      const wrapper = makeWrapper()
      mockEmailActions.pending.value = true
      await wrapper.vm.$nextTick()
      mockEmailActions.email.value = 'x@example.com'
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('pending')).toHaveLength(1)
    })
  })
})
