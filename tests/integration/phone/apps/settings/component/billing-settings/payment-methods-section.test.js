import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, useAttrs } from 'vue'

const {
  setDefaultMutateMock,
  detachMutateMock,
  modalOpenMock,
  toastSuccessMock,
  toastErrorMock,
  queryState,
  mutationState
} = vi.hoisted(() => ({
  setDefaultMutateMock: vi.fn(),
  detachMutateMock: vi.fn(),
  modalOpenMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
  queryState: { isLoading: false, data: null },
  mutationState: { setDefaultLoading: false, detachLoading: false }
}))

vi.mock('@/api/billing', () => ({
  usePaymentMethodsQuery: () => ({
    isLoading: {
      get value() {
        return queryState.isLoading
      }
    },
    data: {
      get value() {
        return queryState.data
      }
    }
  }),
  useSetDefaultPaymentMethodMutation: () => ({
    mutateAsync: setDefaultMutateMock,
    isLoading: {
      get value() {
        return mutationState.setDefaultLoading
      }
    }
  }),
  useDetachPaymentMethodMutation: () => ({
    mutateAsync: detachMutateMock,
    isLoading: {
      get value() {
        return mutationState.detachLoading
      }
    }
  })
}))

vi.mock('@/composables/modal', () => ({
  useModal: () => ({ open: modalOpenMock })
}))

vi.mock('@/composables/toast', () => ({
  useToast: () => ({ success: toastSuccessMock, error: toastErrorMock })
}))

vi.mock('@/phone/apps/settings/component/billing-settings/add-credit-card-modal.vue', () => ({
  default: { name: 'AddCreditCardModal' }
}))

const LabeledSectionStub = defineComponent({
  name: 'LabeledSection',
  inheritAttrs: false,
  setup(_props, { slots }) {
    const attrs = useAttrs()
    return () => h('div', { ...attrs, 'data-testid': 'labeled-section-stub' }, slots.default?.())
  }
})

const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  emits: ['press'],
  setup(_props, { slots, emit }) {
    const attrs = useAttrs()
    return () => h('button', { ...attrs, onClick: () => emit('press') }, slots.default?.())
  }
})

async function makePaymentMethodsSection() {
  const PaymentMethodsSection = (
    await import('@/phone/apps/settings/component/billing-settings/payment-methods-section.vue')
  ).default

  return shallowMount(PaymentMethodsSection, {
    global: {
      stubs: {
        LabeledSection: LabeledSectionStub,
        UiButton: UiButtonStub
      }
    }
  })
}

function card(id, brand, last4, month = 12, year = 2030) {
  return { id, card: { brand, last4, exp_month: month, exp_year: year } }
}

beforeEach(() => {
  setDefaultMutateMock.mockReset()
  detachMutateMock.mockReset()
  modalOpenMock.mockReset()
  toastSuccessMock.mockReset()
  toastErrorMock.mockReset()
  queryState.isLoading = false
  queryState.data = null
  mutationState.setDefaultLoading = false
  mutationState.detachLoading = false
})

// ── Loading / empty states ────────────────────────────────────────────────────

describe('payment-methods-section — loading state', () => {
  test('shows the loading state while the query is pending', async () => {
    queryState.isLoading = true
    const wrapper = await makePaymentMethodsSection()
    expect(wrapper.find('[data-testid="billing-settings__payment-methods-loading"]').exists()).toBe(
      true
    )
  })
})

describe('payment-methods-section — empty state', () => {
  test('shows the empty state when no cards are returned', async () => {
    queryState.data = { paymentMethods: [], defaultPaymentMethodId: null }
    const wrapper = await makePaymentMethodsSection()
    expect(wrapper.find('[data-testid="billing-settings__payment-methods-empty"]').exists()).toBe(
      true
    )
  })

  test('shows an add button when no card exists', async () => {
    queryState.data = { paymentMethods: [], defaultPaymentMethodId: null }
    const wrapper = await makePaymentMethodsSection()
    expect(wrapper.find('[data-testid="billing-settings__payment-methods-change"]').exists()).toBe(
      true
    )
  })
})

// ── default_card ──────────────────────────────────────────────────────────────

describe('payment-methods-section — default_card [obligation]', () => {
  test('shows the default card when defaultPaymentMethodId matches a PM', async () => {
    queryState.data = {
      paymentMethods: [card('pm_1', 'visa', '4242'), card('pm_2', 'mastercard', '5555')],
      defaultPaymentMethodId: 'pm_1'
    }
    const wrapper = await makePaymentMethodsSection()
    const cardEl = wrapper.find('[data-testid="billing-settings__payment-method-card"]')
    expect(cardEl.exists()).toBe(true)
    expect(cardEl.text()).toContain('visa')
    expect(cardEl.text()).toContain('4242')
  })

  test('falls back to the first PM when no PM id matches defaultPaymentMethodId', async () => {
    queryState.data = {
      paymentMethods: [card('pm_1', 'visa', '4242'), card('pm_2', 'mastercard', '5555')],
      defaultPaymentMethodId: 'pm_nonexistent'
    }
    const wrapper = await makePaymentMethodsSection()
    const cardEl = wrapper.find('[data-testid="billing-settings__payment-method-card"]')
    expect(cardEl.exists()).toBe(true)
    // pm_1 is the first — it should be shown as default
    expect(cardEl.text()).toContain('visa')
    expect(cardEl.text()).toContain('4242')
  })

  test('falls back to the first PM when defaultPaymentMethodId is null', async () => {
    queryState.data = {
      paymentMethods: [card('pm_1', 'visa', '4242')],
      defaultPaymentMethodId: null
    }
    const wrapper = await makePaymentMethodsSection()
    expect(wrapper.find('[data-testid="billing-settings__payment-method-card"]').exists()).toBe(
      true
    )
  })

  test('shows the empty state when payment methods list is empty', async () => {
    queryState.data = {
      paymentMethods: [],
      defaultPaymentMethodId: null
    }
    const wrapper = await makePaymentMethodsSection()
    expect(wrapper.find('[data-testid="billing-settings__payment-methods-empty"]').exists()).toBe(
      true
    )
    expect(wrapper.find('[data-testid="billing-settings__payment-method-card"]').exists()).toBe(
      false
    )
  })
})

// ── onChangeCard ──────────────────────────────────────────────────────────────

describe('payment-methods-section — onChangeCard [obligation]', () => {
  test('clicking the change button opens AddCreditCardModal as a mobile sheet', async () => {
    queryState.data = {
      paymentMethods: [card('pm_1', 'visa', '4242')],
      defaultPaymentMethodId: 'pm_1'
    }
    modalOpenMock.mockReturnValue({ response: Promise.resolve(null) })
    const wrapper = await makePaymentMethodsSection()
    await wrapper.find('[data-testid="billing-settings__payment-methods-change"]').trigger('click')
    expect(modalOpenMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'AddCreditCardModal' }),
      { mode: 'mobile-sheet', backdrop: true }
    )
  })

  test('does NOT call any mutation when response paymentMethodId is null/falsy', async () => {
    queryState.data = {
      paymentMethods: [card('pm_1', 'visa', '4242')],
      defaultPaymentMethodId: 'pm_1'
    }
    modalOpenMock.mockReturnValue({
      response: Promise.resolve({ added: true, paymentMethodId: null })
    })
    const wrapper = await makePaymentMethodsSection()
    await wrapper.find('[data-testid="billing-settings__payment-methods-change"]').trigger('click')
    await flushPromises()
    expect(setDefaultMutateMock).not.toHaveBeenCalled()
    expect(detachMutateMock).not.toHaveBeenCalled()
  })

  test('does NOT call any mutation when modal resolves with added:false', async () => {
    queryState.data = {
      paymentMethods: [card('pm_1', 'visa', '4242')],
      defaultPaymentMethodId: 'pm_1'
    }
    modalOpenMock.mockReturnValue({
      response: Promise.resolve({ added: false, paymentMethodId: null })
    })
    const wrapper = await makePaymentMethodsSection()
    await wrapper.find('[data-testid="billing-settings__payment-methods-change"]').trigger('click')
    await flushPromises()
    expect(setDefaultMutateMock).not.toHaveBeenCalled()
    expect(detachMutateMock).not.toHaveBeenCalled()
  })

  test('calls set_default_mutation with the new PM id, then detaches old PM ids', async () => {
    queryState.data = {
      paymentMethods: [card('pm_old_1', 'visa', '4242'), card('pm_old_2', 'mastercard', '5555')],
      defaultPaymentMethodId: 'pm_old_1'
    }
    setDefaultMutateMock.mockResolvedValue({})
    detachMutateMock.mockResolvedValue({})
    modalOpenMock.mockReturnValue({
      response: Promise.resolve({ added: true, paymentMethodId: 'pm_new' })
    })
    const wrapper = await makePaymentMethodsSection()
    await wrapper.find('[data-testid="billing-settings__payment-methods-change"]').trigger('click')
    await flushPromises()

    expect(setDefaultMutateMock).toHaveBeenCalledWith('pm_new')
    // Both old PM ids should be detached
    expect(detachMutateMock).toHaveBeenCalledWith('pm_old_1')
    expect(detachMutateMock).toHaveBeenCalledWith('pm_old_2')
  })

  test('if set_default_mutation throws, detach mutations are NOT called', async () => {
    queryState.data = {
      paymentMethods: [card('pm_old', 'visa', '4242')],
      defaultPaymentMethodId: 'pm_old'
    }
    setDefaultMutateMock.mockRejectedValue(new Error('network error'))
    modalOpenMock.mockReturnValue({
      response: Promise.resolve({ added: true, paymentMethodId: 'pm_new' })
    })
    const wrapper = await makePaymentMethodsSection()
    await wrapper.find('[data-testid="billing-settings__payment-methods-change"]').trigger('click')
    await flushPromises()

    expect(setDefaultMutateMock).toHaveBeenCalledWith('pm_new')
    expect(detachMutateMock).not.toHaveBeenCalled()
  })

  test('shows an error toast when set_default_mutation throws', async () => {
    queryState.data = {
      paymentMethods: [card('pm_old', 'visa', '4242')],
      defaultPaymentMethodId: 'pm_old'
    }
    setDefaultMutateMock.mockRejectedValue(new Error('network error'))
    modalOpenMock.mockReturnValue({
      response: Promise.resolve({ added: true, paymentMethodId: 'pm_new' })
    })
    const wrapper = await makePaymentMethodsSection()
    await wrapper.find('[data-testid="billing-settings__payment-methods-change"]').trigger('click')
    await flushPromises()

    expect(toastErrorMock).toHaveBeenCalled()
  })

  test('shows an error toast when detach_mutation throws [obligation]', async () => {
    queryState.data = {
      paymentMethods: [card('pm_old', 'visa', '4242')],
      defaultPaymentMethodId: 'pm_old'
    }
    setDefaultMutateMock.mockResolvedValue({})
    detachMutateMock.mockRejectedValue(new Error('detach failed'))
    modalOpenMock.mockReturnValue({
      response: Promise.resolve({ added: true, paymentMethodId: 'pm_new' })
    })
    const wrapper = await makePaymentMethodsSection()
    await wrapper.find('[data-testid="billing-settings__payment-methods-change"]').trigger('click')
    await flushPromises()

    expect(toastErrorMock).toHaveBeenCalled()
  })
})
