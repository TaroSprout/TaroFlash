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
  noticeSuccessMock,
  noticeErrorMock,
  modalOpenMock
} = vi.hoisted(() => ({
  cancelMutateMock: vi.fn(),
  resumeMutateMock: vi.fn(),
  cancelLoadingState: { value: false },
  resumeLoadingState: { value: false },
  alertWarnMock: vi.fn(),
  noticeSuccessMock: vi.fn(),
  noticeErrorMock: vi.fn(),
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

vi.mock('@/stores/notice-store', () => ({
  useNoticeStore: () => ({ success: noticeSuccessMock, error: noticeErrorMock })
}))

vi.mock('@/composables/modal', () => ({
  useModal: () => ({ open: modalOpenMock })
}))

vi.mock('@/components/billing/checkout-modal/index.vue', () => ({
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
  noticeSuccessMock.mockReset()
  noticeErrorMock.mockReset()
  modalOpenMock.mockReset()
  cancelLoadingState.value = false
  resumeLoadingState.value = false
})

// ── onUpgrade ─────────────────────────────────────────────────────────────────

describe('useSubscriptionActions — onUpgrade', () => {
  test('opens the Checkout modal [obligation]', async () => {
    modalOpenMock.mockReturnValue({ response: Promise.resolve() })
    const { onUpgrade } = withSetup(() => useSubscriptionActions())
    await onUpgrade()
    expect(modalOpenMock).toHaveBeenCalledOnce()
    expect(modalOpenMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Checkout' }),
      expect.objectContaining({ mode: 'popup', backdrop: true })
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
    expect(noticeSuccessMock).not.toHaveBeenCalled()
    expect(noticeErrorMock).not.toHaveBeenCalled()
  })

  test('shows a success notice without an explicit sfx when cancel mutation resolves', async () => {
    alertWarnMock.mockReturnValue({ response: Promise.resolve(true) })
    cancelMutateMock.mockResolvedValue({})

    const { onCancel } = withSetup(() => useSubscriptionActions())
    await onCancel()

    expect(noticeSuccessMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ variant: 'panel' })
    )
    const [, options] = noticeSuccessMock.mock.calls[0]
    expect(options.sfx).toBeUndefined()
    expect(noticeErrorMock).not.toHaveBeenCalled()
  })

  test('toasts error when cancel mutation rejects', async () => {
    alertWarnMock.mockReturnValue({ response: Promise.resolve(true) })
    cancelMutateMock.mockRejectedValue(new Error('network'))

    const { onCancel } = withSetup(() => useSubscriptionActions())
    await onCancel()

    expect(noticeErrorMock).toHaveBeenCalledOnce()
    expect(noticeSuccessMock).not.toHaveBeenCalled()
  })
})

// ── onResume ──────────────────────────────────────────────────────────────────

describe('useSubscriptionActions — onResume', () => {
  test('calls resume mutation and shows a success notice without an explicit sfx [obligation]', async () => {
    resumeMutateMock.mockResolvedValue({})

    const { onResume } = withSetup(() => useSubscriptionActions())
    await onResume()

    expect(resumeMutateMock).toHaveBeenCalledOnce()
    expect(noticeSuccessMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ variant: 'panel' })
    )
    const [, options] = noticeSuccessMock.mock.calls[0]
    expect(options.sfx).toBeUndefined()
  })

  test('toasts error when resume mutation rejects [obligation]', async () => {
    resumeMutateMock.mockRejectedValue(new Error('network'))

    const { onResume } = withSetup(() => useSubscriptionActions())
    await onResume()

    expect(noticeErrorMock).toHaveBeenCalledOnce()
    expect(noticeSuccessMock).not.toHaveBeenCalled()
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
