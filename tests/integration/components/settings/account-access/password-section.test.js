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

const mockPasswordActions = {
  password: ref(''),
  confirm_password: ref(''),
  loading: ref(false),
  errors: ref({}),
  success: ref(false),
  submit: vi.fn()
}
vi.mock('@/components/settings/account-access/use-password-actions', () => ({
  usePasswordActions: () => mockPasswordActions
}))

import PasswordSection from '@/components/settings/account-access/password-section.vue'

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
      stubs: { UiTooltip: UiTooltipStub, transition: false },
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
  test('[obligation] typing into the password input advances the composable password ref', async () => {
    const wrapper = makeWrapper()
    const input = wrapper.find('[data-testid="account-access-modal__password-input"] input')

    await input.setValue('hunter22')

    expect(mockPasswordActions.password.value).toBe('hunter22')
  })

  test('[obligation] typing into the confirm-password input advances the composable confirm_password ref', async () => {
    const wrapper = makeWrapper()
    const input = wrapper.find('[data-testid="account-access-modal__password-confirm-input"] input')

    await input.setValue('hunter22')

    expect(mockPasswordActions.confirm_password.value).toBe('hunter22')
  })

  test('calls submit exactly once when the submit button is pressed', async () => {
    const wrapper = makeWrapper()
    await wrapper.find('[data-testid="account-access-modal__password-submit"]').trigger('click')
    expect(mockPasswordActions.submit).toHaveBeenCalledOnce()
  })

  test('[obligation] calls submit exactly once when the form is submitted (Enter key)', async () => {
    const wrapper = makeWrapper()
    await wrapper.find('form').trigger('submit')
    expect(mockPasswordActions.submit).toHaveBeenCalledOnce()
  })

  test('shows the success message instead of the form when success is true', () => {
    mockPasswordActions.success.value = true
    const wrapper = makeWrapper()

    expect(wrapper.find('[data-testid="account-access-modal__password-success"]').exists()).toBe(
      true
    )
    expect(wrapper.find('[data-testid="account-access-modal__password-input"]').exists()).toBe(
      false
    )
  })

  test('switching from form to success mid-mount runs the leave/enter transition hooks (gsap-mocked)', async () => {
    const wrapper = makeWrapper()
    mockPasswordActions.success.value = true
    await flushTransition()

    expect(wrapper.find('[data-testid="account-access-modal__password-success"]').exists()).toBe(
      true
    )
  })
})
