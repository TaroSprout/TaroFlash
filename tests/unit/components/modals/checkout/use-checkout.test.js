import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'
import messages from '@intlify/unplugin-vue-i18n/messages'
import { MODAL_ID_KEY, request_close_handlers } from '@/composables/modal'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const {
  mockEmitSfx,
  mockInvalidateQueries,
  mockCreateSubscription,
  mockRefetch,
  mockConfirm,
  elementsState
} = vi.hoisted(() => ({
  mockEmitSfx: vi.fn(),
  mockInvalidateQueries: vi.fn(),
  mockCreateSubscription: vi.fn(),
  mockRefetch: vi.fn(),
  mockConfirm: vi.fn(),
  elementsState: {
    is_loading: { value: false },
    is_submitting: { value: false },
    is_ready: { value: true },
    load_error: { value: false }
  }
}))

vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))

vi.mock('@pinia/colada', () => ({
  useQueryCache: () => ({ invalidateQueries: mockInvalidateQueries })
}))

vi.mock('@/api/billing', () => ({
  useCreateSubscriptionMutation: () => ({ mutateAsync: mockCreateSubscription })
}))

vi.mock('@/api/members', () => ({
  useCurrentMemberQuery: () => ({ refetch: mockRefetch })
}))

vi.mock('@/composables/billing/use-checkout-elements', () => ({
  useCheckoutElements: () => ({
    ...elementsState,
    confirm: mockConfirm
  })
}))

import { useCheckout } from '@/components/billing/checkout-modal/use-checkout'

// ── Setup ──────────────────────────────────────────────────────────────────────

let app = null

function withSetup(composable, modalId = 'checkout-1') {
  let result
  app = createApp({
    setup() {
      result = composable()
      return () => null
    }
  })
  const i18n = createI18n({ locale: 'en-us', legacy: false, messages })
  app.use(i18n)
  app.provide(MODAL_ID_KEY, modalId)
  app.mount(document.createElement('div'))
  return result
}

afterEach(() => {
  app?.unmount()
  app = null
  vi.useRealTimers()
})

beforeEach(() => {
  mockEmitSfx.mockClear()
  mockInvalidateQueries.mockClear()
  mockCreateSubscription.mockReset()
  mockRefetch.mockReset()
  mockConfirm.mockReset()
  elementsState.is_loading.value = false
  elementsState.is_submitting.value = false
  elementsState.is_ready.value = true
  elementsState.load_error.value = false
  request_close_handlers.clear()
})

// ── status precedence ──────────────────────────────────────────────────────────

describe('useCheckout — status precedence', () => {
  test('[obligation] is_success overrides load_error and is_loading once a submit completes', async () => {
    vi.useFakeTimers()
    elementsState.load_error.value = false
    mockConfirm.mockResolvedValue({ status: 'success' })
    mockRefetch.mockResolvedValue({ data: { plan: 'paid' } })
    const { onSubmit, status } = withSetup(() => useCheckout(vi.fn()))

    const submitPromise = onSubmit()
    elementsState.load_error.value = true
    elementsState.is_loading.value = true
    await vi.runAllTimersAsync()
    await submitPromise

    expect(status.value).toBe('success')
  })

  test('[obligation] load_error overrides loading', () => {
    elementsState.load_error.value = true
    elementsState.is_loading.value = true
    const { status } = withSetup(() => useCheckout(vi.fn()))
    expect(status.value).toBe('error')
  })

  test('is_loading overrides submitting/confirming', () => {
    elementsState.is_loading.value = true
    elementsState.is_submitting.value = true
    const { status } = withSetup(() => useCheckout(vi.fn()))
    expect(status.value).toBe('loading')
  })

  test('is_submitting yields confirming', () => {
    elementsState.is_submitting.value = true
    const { status } = withSetup(() => useCheckout(vi.fn()))
    expect(status.value).toBe('confirming')
  })

  test('falls back to form when nothing else is true', () => {
    const { status } = withSetup(() => useCheckout(vi.fn()))
    expect(status.value).toBe('form')
  })
})

// ── onSubmit — non-success confirm ─────────────────────────────────────────────

describe('useCheckout — onSubmit non-success confirm', () => {
  test('[obligation] returns without invalidating, syncing, or closing when confirm() is not a success', async () => {
    mockConfirm.mockResolvedValue({ status: 'error', message: 'declined' })
    const close = vi.fn()
    const { onSubmit, status } = withSetup(() => useCheckout(close))

    await onSubmit()

    expect(mockRefetch).not.toHaveBeenCalled()
    expect(mockInvalidateQueries).not.toHaveBeenCalled()
    expect(mockEmitSfx).not.toHaveBeenCalledWith('success_1')
    expect(close).not.toHaveBeenCalled()
    expect(status.value).toBe('form')
  })
})

// ── onSubmit — successful confirm + sync ───────────────────────────────────────

describe('useCheckout — onSubmit success path', () => {
  test('[obligation] waitForUpgradeSync stops polling as soon as plan flips to paid', async () => {
    vi.useFakeTimers()
    mockConfirm.mockResolvedValue({ status: 'success' })
    mockRefetch
      .mockResolvedValueOnce({ data: { plan: 'free' } })
      .mockResolvedValueOnce({ data: { plan: 'free' } })
      .mockResolvedValueOnce({ data: { plan: 'paid' } })
    const close = vi.fn()
    const { onSubmit } = withSetup(() => useCheckout(close))

    const submitPromise = onSubmit()
    await vi.runAllTimersAsync()
    await submitPromise

    expect(mockRefetch).toHaveBeenCalledTimes(3)
  })

  test('[obligation] waitForUpgradeSync gives up after SYNC_MAX_ATTEMPTS (8) polls', async () => {
    vi.useFakeTimers()
    mockConfirm.mockResolvedValue({ status: 'success' })
    mockRefetch.mockResolvedValue({ data: { plan: 'free' } })
    const close = vi.fn()
    const { onSubmit } = withSetup(() => useCheckout(close))

    const submitPromise = onSubmit()
    await vi.runAllTimersAsync()
    await submitPromise

    expect(mockRefetch).toHaveBeenCalledTimes(8)
  })

  test('[obligation] invalidates the billing cache key, plays success_1, then auto-closes with {upgraded:true}', async () => {
    vi.useFakeTimers()
    mockConfirm.mockResolvedValue({ status: 'success' })
    mockRefetch.mockResolvedValue({ data: { plan: 'paid' } })
    const close = vi.fn()
    const { onSubmit, status } = withSetup(() => useCheckout(close))

    const submitPromise = onSubmit()
    await vi.runAllTimersAsync()
    await submitPromise

    expect(mockInvalidateQueries).toHaveBeenCalledWith({ key: ['billing'] })
    expect(mockEmitSfx).toHaveBeenCalledWith('success_1')
    expect(close).toHaveBeenCalledWith({ upgraded: true })
    expect(status.value).toBe('success')
  })
})

// ── onMounted / onBeforeUnmount sfx ─────────────────────────────────────────────

describe('useCheckout — mount/unmount chimes', () => {
  test('plays wooden_chime_ring on mount', () => {
    withSetup(() => useCheckout(vi.fn()))
    expect(mockEmitSfx).toHaveBeenCalledWith('wooden_chime_ring')
  })

  test('plays pop_up_close on unmount', () => {
    withSetup(() => useCheckout(vi.fn()))
    app.unmount()
    expect(mockEmitSfx).toHaveBeenCalledWith('pop_up_close')
  })
})

// ── useModalRequestClose wiring ──────────────────────────────────────────────────

describe('useCheckout — request-close handler', () => {
  test('[obligation] is a no-op while status is confirming', () => {
    elementsState.is_submitting.value = true
    const close = vi.fn()
    withSetup(() => useCheckout(close), 'modal-a')

    request_close_handlers.get('modal-a')?.()

    expect(close).not.toHaveBeenCalled()
  })

  test('[obligation] calls close() with no payload in every other status', () => {
    const close = vi.fn()
    withSetup(() => useCheckout(close), 'modal-b')

    request_close_handlers.get('modal-b')?.()

    expect(close).toHaveBeenCalledWith()
  })

  test('[obligation] still allows manual close during the success status', async () => {
    vi.useFakeTimers()
    mockConfirm.mockResolvedValue({ status: 'success' })
    mockRefetch.mockResolvedValue({ data: { plan: 'paid' } })
    const close = vi.fn()
    const { onSubmit } = withSetup(() => useCheckout(close), 'modal-c')

    const submitPromise = onSubmit()
    await vi.runAllTimersAsync()
    await submitPromise
    close.mockClear()

    request_close_handlers.get('modal-c')?.()

    expect(close).toHaveBeenCalledWith()
  })
})
