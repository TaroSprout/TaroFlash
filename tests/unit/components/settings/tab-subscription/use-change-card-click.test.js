import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'
import messages from '@intlify/unplugin-vue-i18n/messages'
import { settingsRecedeKey } from '@/components/settings/layout'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { setDefaultMutateMock, detachMutateMock, modalOpenMock, noticeErrorMock, queryState } =
  vi.hoisted(() => ({
    setDefaultMutateMock: vi.fn(),
    detachMutateMock: vi.fn(),
    modalOpenMock: vi.fn(),
    noticeErrorMock: vi.fn(),
    queryState: { data: null }
  }))

vi.mock('@/api/billing', () => ({
  usePaymentMethodsQuery: () => ({
    isLoading: { value: false },
    data: {
      get value() {
        return queryState.data
      }
    }
  }),
  useSetDefaultPaymentMethodMutation: () => ({ mutateAsync: setDefaultMutateMock }),
  useDetachPaymentMethodMutation: () => ({ mutateAsync: detachMutateMock })
}))

vi.mock('@/composables/modal', () => ({
  useModal: () => ({ open: modalOpenMock })
}))

vi.mock('@/stores/notice-store', () => ({
  useNoticeStore: () => ({ error: noticeErrorMock })
}))

import { useChangeCardClick } from '@/components/settings/tab-subscription/use-change-card-click'

// ── Setup ─────────────────────────────────────────────────────────────────────

let app = null

function withSetup(composable, recede) {
  let result
  app = createApp({
    setup() {
      result = composable()
      return () => null
    }
  })
  const i18n = createI18n({ locale: 'en-us', legacy: false, messages })
  app.use(i18n)
  if (recede) app.provide(settingsRecedeKey, recede)
  app.mount(document.createElement('div'))
  return result
}

function card(id, brand = 'visa', last4 = '4242') {
  return { id, card: { brand, last4, exp_month: 12, exp_year: 2030 } }
}

function makeRecede() {
  const order = []
  return {
    order,
    recede: {
      recede: vi.fn(() => order.push('recede')),
      restore: vi.fn(() => order.push('restore'))
    }
  }
}

afterEach(() => {
  app?.unmount()
  app = null
})

beforeEach(() => {
  setDefaultMutateMock.mockReset()
  detachMutateMock.mockReset()
  modalOpenMock.mockReset()
  noticeErrorMock.mockReset()
  queryState.data = null
})

// ── default_card fallback ────────────────────────────────────────────────────

describe('useChangeCardClick — default_card [obligation]', () => {
  test('falls back to the first payment method when none matches defaultPaymentMethodId', () => {
    queryState.data = {
      paymentMethods: [card('pm_1', 'visa', '4242'), card('pm_2', 'mastercard', '5555')],
      defaultPaymentMethodId: 'pm_nonexistent'
    }
    const { default_card } = withSetup(() => useChangeCardClick())
    expect(default_card.value?.id).toBe('pm_1')
  })

  test('is null when the payment methods list is empty', () => {
    queryState.data = { paymentMethods: [], defaultPaymentMethodId: null }
    const { default_card } = withSetup(() => useChangeCardClick())
    expect(default_card.value).toBeNull()
  })
})

// ── recede/restore choreography ──────────────────────────────────────────────

describe('useChangeCardClick — recede/restore choreography [obligation]', () => {
  test('calls recede() before opening the modal and restore() after it resolves, added:false', async () => {
    queryState.data = { paymentMethods: [card('pm_1')], defaultPaymentMethodId: 'pm_1' }
    const { order, recede } = makeRecede()
    modalOpenMock.mockImplementation(() => {
      order.push('modal-open')
      return { response: Promise.resolve({ added: false, paymentMethodId: null }) }
    })
    const { onChangeCardClick } = withSetup(() => useChangeCardClick(), recede)

    await onChangeCardClick()

    expect(order).toEqual(['recede', 'modal-open', 'restore'])
  })

  test('calls recede() before opening the modal and restore() after it resolves, added:true', async () => {
    queryState.data = { paymentMethods: [card('pm_1')], defaultPaymentMethodId: 'pm_1' }
    const { order, recede } = makeRecede()
    setDefaultMutateMock.mockResolvedValue({})
    modalOpenMock.mockImplementation(() => {
      order.push('modal-open')
      return { response: Promise.resolve({ added: true, paymentMethodId: 'pm_1' }) }
    })
    const { onChangeCardClick } = withSetup(() => useChangeCardClick(), recede)

    await onChangeCardClick()

    expect(order).toEqual(['recede', 'modal-open', 'restore'])
  })
})

// ── mutation flow ─────────────────────────────────────────────────────────────

describe('useChangeCardClick — mutation flow [obligation]', () => {
  test('sets the new default and detaches every other previously-known id', async () => {
    queryState.data = {
      paymentMethods: [card('pm_old_1'), card('pm_old_2'), card('pm_old_3')],
      defaultPaymentMethodId: 'pm_old_1'
    }
    setDefaultMutateMock.mockResolvedValue({})
    detachMutateMock.mockResolvedValue({})
    modalOpenMock.mockReturnValue({
      response: Promise.resolve({ added: true, paymentMethodId: 'pm_new' })
    })
    const { onChangeCardClick } = withSetup(() => useChangeCardClick())

    await onChangeCardClick()

    expect(setDefaultMutateMock).toHaveBeenCalledWith('pm_new')
    expect(detachMutateMock).toHaveBeenCalledWith('pm_old_1')
    expect(detachMutateMock).toHaveBeenCalledWith('pm_old_2')
    expect(detachMutateMock).toHaveBeenCalledWith('pm_old_3')
    expect(detachMutateMock).not.toHaveBeenCalledWith('pm_new')
  })

  test('does not detach the new default when it was already one of the known ids', async () => {
    queryState.data = {
      paymentMethods: [card('pm_old_1'), card('pm_new')],
      defaultPaymentMethodId: 'pm_old_1'
    }
    setDefaultMutateMock.mockResolvedValue({})
    detachMutateMock.mockResolvedValue({})
    modalOpenMock.mockReturnValue({
      response: Promise.resolve({ added: true, paymentMethodId: 'pm_new' })
    })
    const { onChangeCardClick } = withSetup(() => useChangeCardClick())

    await onChangeCardClick()

    expect(detachMutateMock).toHaveBeenCalledWith('pm_old_1')
    expect(detachMutateMock).not.toHaveBeenCalledWith('pm_new')
  })

  test('shows a toast and returns early without detaching when set_default_mutation throws', async () => {
    queryState.data = {
      paymentMethods: [card('pm_old_1'), card('pm_old_2')],
      defaultPaymentMethodId: 'pm_old_1'
    }
    setDefaultMutateMock.mockRejectedValue(new Error('network error'))
    modalOpenMock.mockReturnValue({
      response: Promise.resolve({ added: true, paymentMethodId: 'pm_new' })
    })
    const { onChangeCardClick } = withSetup(() => useChangeCardClick())

    await onChangeCardClick()

    expect(noticeErrorMock).toHaveBeenCalledWith(expect.any(String), { variant: 'panel' })
    expect(detachMutateMock).not.toHaveBeenCalled()
  })

  test('continues detaching remaining stale ids after one detach call throws', async () => {
    queryState.data = {
      paymentMethods: [card('pm_old_1'), card('pm_old_2'), card('pm_old_3')],
      defaultPaymentMethodId: 'pm_old_1'
    }
    setDefaultMutateMock.mockResolvedValue({})
    detachMutateMock.mockImplementation((id) =>
      id === 'pm_old_2' ? Promise.reject(new Error('detach failed')) : Promise.resolve({})
    )
    modalOpenMock.mockReturnValue({
      response: Promise.resolve({ added: true, paymentMethodId: 'pm_new' })
    })
    const { onChangeCardClick } = withSetup(() => useChangeCardClick())

    await onChangeCardClick()

    expect(detachMutateMock).toHaveBeenCalledWith('pm_old_1')
    expect(detachMutateMock).toHaveBeenCalledWith('pm_old_2')
    expect(detachMutateMock).toHaveBeenCalledWith('pm_old_3')
    expect(noticeErrorMock).toHaveBeenCalledWith(expect.any(String), { variant: 'panel' })
  })

  test('does not call any mutation when the modal resolves with added:false', async () => {
    queryState.data = { paymentMethods: [card('pm_1')], defaultPaymentMethodId: 'pm_1' }
    modalOpenMock.mockReturnValue({
      response: Promise.resolve({ added: false, paymentMethodId: null })
    })
    const { onChangeCardClick } = withSetup(() => useChangeCardClick())

    await onChangeCardClick()

    expect(setDefaultMutateMock).not.toHaveBeenCalled()
    expect(detachMutateMock).not.toHaveBeenCalled()
  })

  test('does not call any mutation when the modal resolves with no response (closed)', async () => {
    queryState.data = { paymentMethods: [card('pm_1')], defaultPaymentMethodId: 'pm_1' }
    modalOpenMock.mockReturnValue({ response: Promise.resolve(undefined) })
    const { onChangeCardClick } = withSetup(() => useChangeCardClick())

    await onChangeCardClick()

    expect(setDefaultMutateMock).not.toHaveBeenCalled()
    expect(detachMutateMock).not.toHaveBeenCalled()
  })
})
