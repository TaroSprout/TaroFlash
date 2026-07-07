import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick, reactive, ref } from 'vue'

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

// onComplete resolves on a microtask, not synchronously — a real GSAP tween
// never completes within the same call stack as the leave hook, and calling
// done() synchronously during a real (unstubbed) unmount transition crashes
// Vue's internal removal bookkeeping (`afterLeave` reads a detached parentNode).
vi.mock('gsap', () => ({
  gsap: {
    fromTo: vi.fn((_el, _from, opts) => {
      Promise.resolve().then(() => opts?.onComplete?.())
    }),
    to: vi.fn((_el, opts) => {
      Promise.resolve().then(() => opts?.onComplete?.())
    }),
    set: vi.fn()
  }
}))

// Individual refs the tests mutate via `.value`, wrapped in reactive() on the
// way out — mirrors the real composable, which wraps a plain object of refs
// so nested ref access auto-unwraps in the template (`auth.success`, not
// `auth.success.value`). Without reactive(), `v-if="!auth.success"` always
// reads a truthy Ref object and the success pane renders unconditionally.
const mockForgotPasswordRefs = {
  email: ref(''),
  errors: ref({}),
  loading: ref(false),
  all_filled: ref(false),
  submitError: ref(''),
  success: ref(false),
  submit: vi.fn()
}
const mockForgotPasswordActions = reactive(mockForgotPasswordRefs)
vi.mock('@/composables/auth/use-forgot-password-actions', () => ({
  useForgotPasswordActions: () => mockForgotPasswordActions
}))

import ForgotPasswordModal from '@/views/welcome/forgot-password/index.vue'

// ── Mount helper ─────────────────────────────────────────────────────────────

function makeWrapper(close = vi.fn()) {
  return mount(ForgotPasswordModal, {
    props: { close },
    global: { directives: { sfx: {} } }
  })
}

beforeEach(() => {
  mockEmitSfx.mockClear()
  mockForgotPasswordRefs.email.value = ''
  mockForgotPasswordRefs.errors.value = {}
  mockForgotPasswordRefs.loading.value = false
  mockForgotPasswordRefs.all_filled.value = false
  mockForgotPasswordRefs.submitError.value = ''
  mockForgotPasswordRefs.success.value = false
  mockForgotPasswordRefs.submit.mockReset()
})

describe('ForgotPasswordModal (forgot-password/index.vue)', () => {
  // ── structure ─────────────────────────────────────────────────────────────

  test('renders the dialog card', () => {
    const wrapper = makeWrapper()
    expect(wrapper.find('[data-testid="forgot-password-modal-card"]').exists()).toBe(true)
  })

  test('renders the form when not yet successful', () => {
    const wrapper = makeWrapper()
    expect(wrapper.find('[data-testid="forgot-password-modal"]').exists()).toBe(true)
  })

  test('renders the success panel once success is true', async () => {
    mockForgotPasswordRefs.success.value = true
    const wrapper = makeWrapper()
    await flushTransition()
    expect(wrapper.find('[data-testid="forgot-password-modal__success"]').exists()).toBe(true)
  })

  // ── sfx lifecycle ─────────────────────────────────────────────────────────

  test('plays wooden_chime_ring on mount', () => {
    makeWrapper()
    expect(mockEmitSfx).toHaveBeenCalledWith('wooden_chime_ring')
  })

  test('plays pop_up_close on unmount', () => {
    const wrapper = makeWrapper()
    mockEmitSfx.mockClear()
    wrapper.unmount()
    expect(mockEmitSfx).toHaveBeenCalledWith('pop_up_close')
  })

  // ── submit wiring ─────────────────────────────────────────────────────────

  test('calls auth.submit when the form emits submit', async () => {
    const wrapper = makeWrapper()
    await wrapper.find('[data-testid="forgot-password-modal__submit"]').trigger('click')
    expect(mockForgotPasswordRefs.submit).toHaveBeenCalledOnce()
  })

  // ── close wiring ──────────────────────────────────────────────────────────

  test('the dialog-card close event calls the close prop', async () => {
    const close = vi.fn()
    const wrapper = makeWrapper(close)
    await wrapper.find('[data-testid="dialog-card__close"]').trigger('click')
    expect(close).toHaveBeenCalledOnce()
  })

  test('the success panel close button calls the close prop', async () => {
    mockForgotPasswordRefs.success.value = true
    const close = vi.fn()
    const wrapper = makeWrapper(close)
    await flushTransition()

    await wrapper.find('[data-testid="forgot-password-modal__success-close"]').trigger('click')

    expect(close).toHaveBeenCalledOnce()
  })
})
