import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'
import messages from '@intlify/unplugin-vue-i18n/messages'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mockEmitSfx, mockInvalidateQueries, mockCreateSetupIntent, mockConfirm, elementsState } =
  vi.hoisted(() => ({
    mockEmitSfx: vi.fn(),
    mockInvalidateQueries: vi.fn(),
    mockCreateSetupIntent: vi.fn(),
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
  useCreateSetupIntentMutation: () => ({ mutateAsync: mockCreateSetupIntent })
}))

const { mockUseCheckoutElements } = vi.hoisted(() => ({ mockUseCheckoutElements: vi.fn() }))

vi.mock('@/composables/billing/use-checkout-elements', () => ({
  useCheckoutElements: mockUseCheckoutElements
}))

import { useChangeCard } from '@/views/settings/tab-subscription/use-change-cc'

// ── Setup ──────────────────────────────────────────────────────────────────────

let app = null

function withSetup(composable) {
  let result
  app = createApp({
    setup() {
      result = composable()
      return () => null
    }
  })
  const i18n = createI18n({ locale: 'en-us', legacy: false, messages })
  app.use(i18n)
  app.mount(document.createElement('div'))
  return result
}

afterEach(() => {
  app?.unmount()
  app = null
})

beforeEach(() => {
  mockEmitSfx.mockClear()
  mockInvalidateQueries.mockClear()
  mockCreateSetupIntent.mockReset()
  mockConfirm.mockReset()
  elementsState.is_loading.value = false
  elementsState.is_submitting.value = false
  elementsState.is_ready.value = true
  elementsState.load_error.value = false
  mockUseCheckoutElements.mockReset()
  mockUseCheckoutElements.mockImplementation(() => ({
    ...elementsState,
    confirm: mockConfirm
  }))
})

// ── onMounted / onBeforeUnmount sfx ──────────────────────────────────────────────

describe('useChangeCard — mount/unmount chimes', () => {
  test('[obligation] plays wooden_chime_ring on mount', () => {
    withSetup(() => useChangeCard(vi.fn()))
    expect(mockEmitSfx).toHaveBeenCalledWith('wooden_chime_ring')
  })

  test('[obligation] plays pop_up_close on unmount', () => {
    withSetup(() => useChangeCard(vi.fn()))
    app.unmount()
    expect(mockEmitSfx).toHaveBeenCalledWith('pop_up_close')
  })
})

// ── onSubmit — non-success confirm ───────────────────────────────────────────────

describe('useChangeCard — onSubmit non-success confirm', () => {
  test('returns without invalidating or closing when confirm() is not a success', async () => {
    mockConfirm.mockResolvedValue({ status: 'error', message: 'declined' })
    const close = vi.fn()
    const { onSubmit } = withSetup(() => useChangeCard(close))

    await onSubmit()

    expect(mockInvalidateQueries).not.toHaveBeenCalled()
    expect(close).not.toHaveBeenCalled()
  })
})

// ── onSubmit — successful confirm ────────────────────────────────────────────────

describe('useChangeCard — onSubmit success path [obligation]', () => {
  test('invalidates the payment-methods cache key on a successful confirm', async () => {
    mockConfirm.mockResolvedValue({
      status: 'success',
      session: { status: { type: 'complete' }, savedPaymentMethods: [{ id: 'pm_abc123' }] }
    })
    const { onSubmit } = withSetup(() => useChangeCard(vi.fn()))

    await onSubmit()

    expect(mockInvalidateQueries).toHaveBeenCalledWith({ key: ['billing', 'payment-methods'] })
  })

  test('closes with added:true and the first saved payment method id', async () => {
    mockConfirm.mockResolvedValue({
      status: 'success',
      session: { status: { type: 'complete' }, savedPaymentMethods: [{ id: 'pm_abc123' }] }
    })
    const close = vi.fn()
    const { onSubmit } = withSetup(() => useChangeCard(close))

    await onSubmit()

    expect(close).toHaveBeenCalledWith({ added: true, paymentMethodId: 'pm_abc123' })
  })

  test('closes with paymentMethodId null when savedPaymentMethods is empty', async () => {
    mockConfirm.mockResolvedValue({
      status: 'success',
      session: { status: { type: 'complete' }, savedPaymentMethods: [] }
    })
    const close = vi.fn()
    const { onSubmit } = withSetup(() => useChangeCard(close))

    await onSubmit()

    expect(close).toHaveBeenCalledWith({ added: true, paymentMethodId: null })
  })

  test('closes with paymentMethodId null when savedPaymentMethods is absent', async () => {
    mockConfirm.mockResolvedValue({
      status: 'success',
      session: { status: { type: 'complete' } }
    })
    const close = vi.fn()
    const { onSubmit } = withSetup(() => useChangeCard(close))

    await onSubmit()

    expect(close).toHaveBeenCalledWith({ added: true, paymentMethodId: null })
  })
})

// ── getClientSecret wiring ───────────────────────────────────────────────────────

describe('useChangeCard — getClientSecret wiring', () => {
  test('requests a setup intent with window.location.origin and returns its clientSecret', async () => {
    mockCreateSetupIntent.mockResolvedValue({ clientSecret: 'seti_secret_x' })
    withSetup(() => useChangeCard(vi.fn()))

    const { getClientSecret } = mockUseCheckoutElements.mock.calls[0][0]
    const clientSecret = await getClientSecret()

    expect(mockCreateSetupIntent).toHaveBeenCalledWith(window.location.origin)
    expect(clientSecret).toBe('seti_secret_x')
  })
})
