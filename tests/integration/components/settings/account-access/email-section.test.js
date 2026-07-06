import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'

// Vue Test Utils stubs the built-in <transition> by default (no lifecycle
// hooks fire). Wait through the real JS-hook cycle — 2x rAF even with
// `:css="false"` — so onLeave/onEnter run for real against the gsap mock.
async function flushTransition() {
  await nextTick()
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  await flushPromises()
}

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))
vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx, emitHoverSfx: vi.fn(), emitStudySfx: vi.fn() }))

vi.mock('@/sfx/directive', () => ({ vSfx: {} }))

const { coarseRef } = vi.hoisted(() => ({ coarseRef: { value: false } }))
vi.mock('@/composables/ui/media-query', () => ({ useMatchMedia: () => coarseRef }))

// onComplete resolves on a microtask, not synchronously — a real GSAP tween
// never completes within the same call stack as the leave hook, and calling
// done() synchronously during a real (unstubbed) unmount transition crashes
// Vue's internal removal bookkeeping (`afterLeave` reads a detached parentNode).
vi.mock('gsap', () => ({
  gsap: {
    to: vi.fn((_el, opts) => {
      Promise.resolve().then(() => opts?.onComplete?.())
    }),
    set: vi.fn()
  }
}))

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

// UiTooltip wraps @floating-ui/Teleport; stub renders the label element and
// forwards attrs/slot so the real <input> underneath is reachable and its
// v-model:value binding is exercised for real.
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
      stubs: { UiTooltip: UiTooltipStub, transition: false },
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
  test('[obligation] renders the composable current_email as the displayed value of the current-email input', () => {
    const wrapper = makeWrapper()
    const input = wrapper.find('[data-testid="account-access-modal__email-current-input"] input')
    expect(input.element.value).toBe('current@example.com')
  })

  test('[obligation] typing into the new-email input advances the composable email ref (not just the DOM value)', async () => {
    const wrapper = makeWrapper()
    const input = wrapper.find('[data-testid="account-access-modal__email-input"] input')

    await input.setValue('new@example.com')

    expect(mockEmailActions.email.value).toBe('new@example.com')
  })

  test('reflects the composable current_email when it changes', async () => {
    const wrapper = makeWrapper()
    mockEmailActions.current_email.value = 'updated@example.com'
    await wrapper.vm.$nextTick()

    const input = wrapper.find('[data-testid="account-access-modal__email-current-input"] input')
    expect(input.element.value).toBe('updated@example.com')
  })

  test('calls submit exactly once when the submit button is pressed', async () => {
    const wrapper = makeWrapper()
    await wrapper.find('[data-testid="account-access-modal__email-submit"]').trigger('click')
    expect(mockEmailActions.submit).toHaveBeenCalledOnce()
  })

  test('[obligation] calls submit exactly once when the form is submitted (Enter key)', async () => {
    const wrapper = makeWrapper()
    await wrapper.find('form').trigger('submit')
    expect(mockEmailActions.submit).toHaveBeenCalledOnce()
  })

  test('shows the pending message instead of the form when pending is true', async () => {
    mockEmailActions.pending.value = true
    const wrapper = makeWrapper()

    expect(wrapper.find('[data-testid="account-access-modal__email-pending"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="account-access-modal__email-current-input"]').exists()).toBe(
      false
    )
  })

  test('switching from form to pending mid-mount runs the leave/enter transition hooks (gsap-mocked)', async () => {
    const wrapper = makeWrapper()
    mockEmailActions.pending.value = true
    await flushTransition()

    expect(wrapper.find('[data-testid="account-access-modal__email-pending"]').exists()).toBe(true)
  })
})
