import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick, ref } from 'vue'

// Vue Test Utils stubs the built-in <transition> by default (no lifecycle
// hooks fire). Wait through the real JS-hook cycle — 2x rAF even with
// `:css="false"` — so onLeave/onEnter run for real against the gsap mock.
async function flushTransition() {
  await nextTick()
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  await flushPromises()
}

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockEmitSfx, mockPush } = vi.hoisted(() => ({
  mockEmitSfx: vi.fn(),
  mockPush: vi.fn()
}))
vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx, emitHoverSfx: vi.fn(), emitStudySfx: vi.fn() }))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush })
}))

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

// The real composable returns a plain object of refs (no reactive() wrapper)
// and the component destructures it, so each ref auto-unwraps as a top-level
// setup binding in the template — a plain object of refs mirrors that shape.
const mockResetPasswordRefs = {
  password: ref(''),
  confirm_password: ref(''),
  loading: ref(false),
  errors: ref({}),
  success: ref(false),
  submit: vi.fn()
}
vi.mock('@/composables/auth/use-reset-password-actions', () => ({
  useResetPasswordActions: () => mockResetPasswordRefs
}))

import ResetPasswordModal from '@/views/welcome/reset-password/index.vue'

// ── Mount helper ─────────────────────────────────────────────────────────────

function makeWrapper(close = vi.fn()) {
  return mount(ResetPasswordModal, {
    props: { close },
    global: { directives: { sfx: {} } }
  })
}

beforeEach(() => {
  // Only fake setTimeout/clearTimeout — the success-page transition relies on
  // real requestAnimationFrame (flushTransition), which a full fake-timer
  // install would also stub and hang forever.
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  mockEmitSfx.mockClear()
  mockPush.mockReset()
  mockResetPasswordRefs.password.value = ''
  mockResetPasswordRefs.confirm_password.value = ''
  mockResetPasswordRefs.loading.value = false
  mockResetPasswordRefs.errors.value = {}
  mockResetPasswordRefs.success.value = false
  mockResetPasswordRefs.submit.mockReset()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('ResetPasswordModal (reset-password/index.vue)', () => {
  // ── structure ─────────────────────────────────────────────────────────────

  test('renders the dialog card', () => {
    const wrapper = makeWrapper()
    expect(wrapper.find('[data-testid="reset-password-modal-card"]').exists()).toBe(true)
  })

  test('renders the form when not yet successful', () => {
    const wrapper = makeWrapper()
    expect(wrapper.find('[data-testid="reset-password-modal"]').exists()).toBe(true)
  })

  test('the dialog-card close event calls the close prop', async () => {
    const close = vi.fn()
    const wrapper = makeWrapper(close)
    await wrapper.find('[data-testid="dialog-card__close"]').trigger('click')
    expect(close).toHaveBeenCalledOnce()
  })

  test('typing into the password/confirm-password fields advances the composable refs', async () => {
    const wrapper = makeWrapper()
    await wrapper
      .find('[data-testid="reset-password-modal__password-input"] input')
      .setValue('hunter2222')
    await wrapper
      .find('[data-testid="reset-password-modal__confirm-password-input"] input')
      .setValue('hunter2222')

    expect(mockResetPasswordRefs.password.value).toBe('hunter2222')
    expect(mockResetPasswordRefs.confirm_password.value).toBe('hunter2222')
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

  // ── onSubmit — failure/invalid keeps the modal open ─────────────────────────

  test('does not emit success sfx or navigate when submit does not resolve "success"', async () => {
    mockResetPasswordRefs.submit.mockResolvedValueOnce('invalid')
    const wrapper = makeWrapper()

    await wrapper.find('[data-testid="reset-password-modal__submit"]').trigger('click')
    await flushPromises()

    expect(mockEmitSfx).not.toHaveBeenCalledWith('success_1')
    expect(mockPush).not.toHaveBeenCalled()
  })

  // ── onSubmit — success ordering [obligation] ────────────────────────────────

  describe('onSubmit — success ordering [obligation]', () => {
    test('emits the success sfx immediately on a successful submit [obligation]', async () => {
      mockResetPasswordRefs.submit.mockResolvedValueOnce('success')
      const wrapper = makeWrapper()

      await wrapper.find('[data-testid="reset-password-modal__submit"]').trigger('click')
      await flushPromises()

      expect(mockEmitSfx).toHaveBeenCalledWith('success_1')
    })

    test('does NOT call close or route before the ~1400ms wait elapses [obligation]', async () => {
      mockResetPasswordRefs.submit.mockResolvedValueOnce('success')
      const close = vi.fn()
      const wrapper = makeWrapper(close)

      await wrapper.find('[data-testid="reset-password-modal__submit"]').trigger('click')
      await flushPromises()
      await vi.advanceTimersByTimeAsync(1399)

      expect(close).not.toHaveBeenCalled()
      expect(mockPush).not.toHaveBeenCalled()
    })

    test('calls close and routes to authenticated only after the ~1400ms wait elapses [obligation]', async () => {
      mockResetPasswordRefs.submit.mockResolvedValueOnce('success')
      const close = vi.fn()
      const wrapper = makeWrapper(close)

      await wrapper.find('[data-testid="reset-password-modal__submit"]').trigger('click')
      await flushPromises()
      await vi.advanceTimersByTimeAsync(1400)

      expect(close).toHaveBeenCalledOnce()
      expect(mockPush).toHaveBeenCalledWith({ name: 'authenticated' })
    })

    test('calls close before routing (ordering) [obligation]', async () => {
      mockResetPasswordRefs.submit.mockResolvedValueOnce('success')
      const calls = []
      const close = vi.fn(() => calls.push('close'))
      mockPush.mockImplementation(() => calls.push('push'))
      const wrapper = makeWrapper(close)

      await wrapper.find('[data-testid="reset-password-modal__submit"]').trigger('click')
      await flushPromises()
      await vi.advanceTimersByTimeAsync(1400)

      expect(calls).toEqual(['close', 'push'])
    })

    test('the success page is shown during the wait window (before close/route) [obligation]', async () => {
      mockResetPasswordRefs.submit.mockImplementationOnce(async () => {
        mockResetPasswordRefs.success.value = true
        return 'success'
      })
      const wrapper = makeWrapper()

      await wrapper.find('[data-testid="reset-password-modal__submit"]').trigger('click')
      await flushPromises()
      await flushTransition()

      expect(wrapper.find('[data-testid="reset-password-modal__success"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="reset-password-modal"]').exists()).toBe(false)

      await vi.advanceTimersByTimeAsync(1400)
    })
  })

  // ── success view shape [obligation] ─────────────────────────────────────────

  describe('success view shape [obligation]', () => {
    test('hides the dialog-card header (show_header=false) once success is true [obligation]', async () => {
      mockResetPasswordRefs.success.value = true
      const wrapper = makeWrapper()
      await flushTransition()

      expect(wrapper.find('[data-testid="dialog-card__header-wrap"] header').exists()).toBe(false)
    })

    test('shows the dialog-card header while not yet successful', () => {
      const wrapper = makeWrapper()
      expect(wrapper.find('[data-testid="dialog-card__header-wrap"] header').exists()).toBe(true)
    })

    test('renders the party-popper icon on the success page [obligation]', async () => {
      mockResetPasswordRefs.success.value = true
      const wrapper = makeWrapper()
      await flushTransition()

      const icon = wrapper.find(
        '[data-testid="reset-password-modal__success"] [data-testid="ui-kit-icon"]'
      )
      expect(icon.attributes('alt')).toBe('party-popper')
    })

    test('renders the success heading and message', async () => {
      mockResetPasswordRefs.success.value = true
      const wrapper = makeWrapper()
      await flushTransition()

      expect(wrapper.find('[data-testid="reset-password-modal__success-heading"]').exists()).toBe(
        true
      )
      expect(wrapper.find('[data-testid="reset-password-modal__success-message"]').exists()).toBe(
        true
      )
    })
  })
})
