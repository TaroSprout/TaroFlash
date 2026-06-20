import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'
import messages from '@intlify/unplugin-vue-i18n/messages'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const {
  cancelMutateMock,
  resumeMutateMock,
  cancelLoadingState,
  resumeLoadingState,
  alertWarnMock,
  toastSuccessMock,
  toastErrorMock,
  modalOpenMock
} = vi.hoisted(() => ({
  cancelMutateMock: vi.fn(),
  resumeMutateMock: vi.fn(),
  cancelLoadingState: { value: false },
  resumeLoadingState: { value: false },
  alertWarnMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
  modalOpenMock: vi.fn()
}))

vi.mock('@/api/billing', () => ({
  useCancelSubscriptionMutation: () => ({
    mutateAsync: cancelMutateMock,
    isLoading: cancelLoadingState
  }),
  useResumeSubscriptionMutation: () => ({
    mutateAsync: resumeMutateMock,
    isLoading: resumeLoadingState
  })
}))

vi.mock('@/composables/alert', () => ({
  useAlert: () => ({ warn: alertWarnMock })
}))

vi.mock('@/composables/toast', () => ({
  useToast: () => ({ success: toastSuccessMock, error: toastErrorMock })
}))

vi.mock('@/composables/modal', () => ({
  useModal: () => ({ open: modalOpenMock })
}))

vi.mock('@/components/modals/checkout.vue', () => ({
  default: { name: 'Checkout' }
}))

import { useSubscriptionActions } from '@/composables/member/subscription-actions'

// ── Setup ─────────────────────────────────────────────────────────────────────

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
  cancelMutateMock.mockReset()
  resumeMutateMock.mockReset()
  alertWarnMock.mockReset()
  toastSuccessMock.mockReset()
  toastErrorMock.mockReset()
  modalOpenMock.mockReset()
  cancelLoadingState.value = false
  resumeLoadingState.value = false
})

// ── onUpgrade ─────────────────────────────────────────────────────────────────

describe('useSubscriptionActions — onUpgrade', () => {
  test('opens the Checkout modal [obligation]', () => {
    const { onUpgrade } = withSetup(() => useSubscriptionActions())
    onUpgrade()
    expect(modalOpenMock).toHaveBeenCalledOnce()
    expect(modalOpenMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Checkout' }),
      expect.objectContaining({ mode: 'mobile-sheet' })
    )
  })
})

// ── onCancel ──────────────────────────────────────────────────────────────────

describe('useSubscriptionActions — onCancel', () => {
  test('opens a confirm alert before calling the cancel mutation [obligation]', async () => {
    alertWarnMock.mockReturnValue({ response: Promise.resolve(true) })
    cancelMutateMock.mockResolvedValue({})

    const { onCancel } = withSetup(() => useSubscriptionActions())
    await onCancel()

    expect(alertWarnMock).toHaveBeenCalledOnce()
    expect(cancelMutateMock).toHaveBeenCalledWith(true)
  })

  test('is a NO-OP when the alert is dismissed (response=false) [obligation]', async () => {
    alertWarnMock.mockReturnValue({ response: Promise.resolve(false) })

    const { onCancel } = withSetup(() => useSubscriptionActions())
    await onCancel()

    expect(cancelMutateMock).not.toHaveBeenCalled()
    expect(toastSuccessMock).not.toHaveBeenCalled()
    expect(toastErrorMock).not.toHaveBeenCalled()
  })

  test('toasts success when cancel mutation resolves', async () => {
    alertWarnMock.mockReturnValue({ response: Promise.resolve(true) })
    cancelMutateMock.mockResolvedValue({})

    const { onCancel } = withSetup(() => useSubscriptionActions())
    await onCancel()

    expect(toastSuccessMock).toHaveBeenCalledOnce()
    expect(toastErrorMock).not.toHaveBeenCalled()
  })

  test('toasts error when cancel mutation rejects', async () => {
    alertWarnMock.mockReturnValue({ response: Promise.resolve(true) })
    cancelMutateMock.mockRejectedValue(new Error('network'))

    const { onCancel } = withSetup(() => useSubscriptionActions())
    await onCancel()

    expect(toastErrorMock).toHaveBeenCalledOnce()
    expect(toastSuccessMock).not.toHaveBeenCalled()
  })
})

// ── onResume ──────────────────────────────────────────────────────────────────

describe('useSubscriptionActions — onResume', () => {
  test('calls resume mutation and toasts success [obligation]', async () => {
    resumeMutateMock.mockResolvedValue({})

    const { onResume } = withSetup(() => useSubscriptionActions())
    await onResume()

    expect(resumeMutateMock).toHaveBeenCalledOnce()
    expect(toastSuccessMock).toHaveBeenCalledOnce()
  })

  test('toasts error when resume mutation rejects [obligation]', async () => {
    resumeMutateMock.mockRejectedValue(new Error('network'))

    const { onResume } = withSetup(() => useSubscriptionActions())
    await onResume()

    expect(toastErrorMock).toHaveBeenCalledOnce()
    expect(toastSuccessMock).not.toHaveBeenCalled()
  })
})

// ── loading state refs ────────────────────────────────────────────────────────

describe('useSubscriptionActions — loading refs', () => {
  test('exposes canceling sourced from cancel mutation isLoading [obligation]', () => {
    cancelLoadingState.value = true
    const { canceling } = withSetup(() => useSubscriptionActions())
    expect(canceling.value).toBe(true)
  })

  test('exposes resuming sourced from resume mutation isLoading [obligation]', () => {
    resumeLoadingState.value = true
    const { resuming } = withSetup(() => useSubscriptionActions())
    expect(resuming.value).toBe(true)
  })
})
