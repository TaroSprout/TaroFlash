import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, useAttrs } from 'vue'

const {
  mockCreateSetupIntent,
  mockInvalidateQueries,
  mockLoadActions,
  mockConfirm,
  mockElementMount,
  mockElementDestroy,
  elementHandlers,
  mockLoadStripe
} = vi.hoisted(() => ({
  mockCreateSetupIntent: vi.fn(),
  mockInvalidateQueries: vi.fn(),
  mockLoadActions: vi.fn(),
  mockConfirm: vi.fn(),
  mockElementMount: vi.fn(),
  mockElementDestroy: vi.fn(),
  elementHandlers: new Map(),
  mockLoadStripe: vi.fn()
}))

vi.mock('@stripe/stripe-js', () => ({ loadStripe: mockLoadStripe }))

vi.mock('@/api/billing', () => ({
  useCreateSetupIntentMutation: () => ({ mutateAsync: mockCreateSetupIntent })
}))

vi.mock('@pinia/colada', () => ({
  useQueryCache: () => ({ invalidateQueries: mockInvalidateQueries })
}))

vi.mock('@/utils/logger', () => ({ default: { error: vi.fn() } }))

const MobileSheetStub = defineComponent({
  name: 'MobileSheet',
  emits: ['close'],
  setup(_props, { slots, emit }) {
    return () =>
      h('div', { 'data-testid': 'mobile-sheet-stub' }, [
        slots.default?.(),
        slots.footer?.(),
        h(
          'button',
          { 'data-testid': 'mobile-sheet-stub__close', onClick: () => emit('close') },
          'close'
        )
      ])
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

function makeStripe() {
  const fakePaymentElement = {
    on: vi.fn((event, handler) => elementHandlers.set(event, handler)),
    mount: mockElementMount,
    destroy: mockElementDestroy
  }
  const fakeCheckout = {
    createPaymentElement: vi.fn(() => fakePaymentElement),
    loadActions: mockLoadActions
  }
  return { initCheckoutElementsSdk: vi.fn(() => fakeCheckout) }
}

async function makeAddCreditCardModal({ close = vi.fn() } = {}) {
  const AddCreditCardModal = (
    await import('@/phone/apps/settings/component/tab-subscription/add-credit-card-modal.vue')
  ).default

  const wrapper = shallowMount(AddCreditCardModal, {
    props: { close },
    global: {
      stubs: {
        MobileSheet: MobileSheetStub,
        UiButton: UiButtonStub
      }
    }
  })
  return { wrapper, close }
}

function fireReady() {
  elementHandlers.get('ready')?.()
}

beforeEach(() => {
  mockCreateSetupIntent.mockReset()
  mockCreateSetupIntent.mockResolvedValue({ clientSecret: 'cs_secret_x' })
  mockInvalidateQueries.mockReset()
  mockLoadActions.mockReset()
  mockLoadActions.mockResolvedValue({ type: 'success', actions: { confirm: mockConfirm } })
  mockConfirm.mockReset()
  mockElementMount.mockReset()
  mockElementDestroy.mockReset()
  elementHandlers.clear()
  mockLoadStripe.mockReset()
  mockLoadStripe.mockResolvedValue(makeStripe())
})

describe('add-credit-card-modal — load states', () => {
  test('shows a loading indicator before Stripe.js resolves', async () => {
    let resolveStripe
    mockLoadStripe.mockReturnValue(
      new Promise((r) => {
        resolveStripe = r
      })
    )
    const { wrapper } = await makeAddCreditCardModal()
    expect(wrapper.find('[data-testid="add-credit-card-modal__loading"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="add-credit-card-modal__footer"]').exists()).toBe(false)
    resolveStripe(makeStripe())
    await flushPromises()
  })

  test('[obligation] requests the setup-intent Checkout Session with returnUrl = window.location.origin', async () => {
    await makeAddCreditCardModal()
    await flushPromises()

    expect(mockCreateSetupIntent).toHaveBeenCalledWith(window.location.origin)
  })

  test('mounts the Payment Element once the Checkout Session + Stripe resolve', async () => {
    const { wrapper } = await makeAddCreditCardModal()
    await flushPromises()
    expect(wrapper.find('[data-testid="add-credit-card-modal__payment-element"]').exists()).toBe(
      true
    )
    expect(mockElementMount).toHaveBeenCalledTimes(1)
  })

  test('renders the error state when createSetupIntent rejects', async () => {
    mockCreateSetupIntent.mockRejectedValue(new Error('api down'))
    const { wrapper } = await makeAddCreditCardModal()
    await flushPromises()
    expect(wrapper.find('[data-testid="add-credit-card-modal__error"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="add-credit-card-modal__footer"]').exists()).toBe(false)
  })

  test('renders the error state when Stripe.js fails to load', async () => {
    mockLoadStripe.mockResolvedValue(null)
    const { wrapper } = await makeAddCreditCardModal()
    await flushPromises()
    expect(wrapper.find('[data-testid="add-credit-card-modal__error"]').exists()).toBe(true)
  })

  test('submit is disabled until the Payment Element fires "ready"', async () => {
    const { wrapper } = await makeAddCreditCardModal()
    await flushPromises()
    const submit = wrapper.find('[data-testid="add-credit-card-modal__submit"]')
    expect(submit.attributes('disabled')).toBeDefined()
    fireReady()
    await flushPromises()
    expect(
      wrapper.find('[data-testid="add-credit-card-modal__submit"]').attributes('disabled')
    ).toBeUndefined()
  })
})

describe('add-credit-card-modal — submit', () => {
  test('[obligation] on a saved payment method, closes with the first saved payment method id', async () => {
    mockConfirm.mockResolvedValue({
      type: 'success',
      session: { status: { type: 'complete' }, savedPaymentMethods: [{ id: 'pm_abc123' }] }
    })
    const { wrapper, close } = await makeAddCreditCardModal()
    await flushPromises()
    fireReady()
    await flushPromises()

    await wrapper.find('[data-testid="add-credit-card-modal__submit"]').trigger('click')
    await flushPromises()

    expect(mockInvalidateQueries).toHaveBeenCalledWith({ key: ['billing', 'payment-methods'] })
    expect(close).toHaveBeenCalledWith({ added: true, paymentMethodId: 'pm_abc123' })
  })

  test('[obligation] closes with paymentMethodId null when savedPaymentMethods is empty', async () => {
    mockConfirm.mockResolvedValue({
      type: 'success',
      session: { status: { type: 'complete' }, savedPaymentMethods: [] }
    })
    const { wrapper, close } = await makeAddCreditCardModal()
    await flushPromises()
    fireReady()
    await flushPromises()

    await wrapper.find('[data-testid="add-credit-card-modal__submit"]').trigger('click')
    await flushPromises()

    expect(close).toHaveBeenCalledWith({ added: true, paymentMethodId: null })
  })

  test('[obligation] closes with paymentMethodId null when savedPaymentMethods is absent', async () => {
    mockConfirm.mockResolvedValue({
      type: 'success',
      session: { status: { type: 'complete' } }
    })
    const { wrapper, close } = await makeAddCreditCardModal()
    await flushPromises()
    fireReady()
    await flushPromises()

    await wrapper.find('[data-testid="add-credit-card-modal__submit"]').trigger('click')
    await flushPromises()

    expect(close).toHaveBeenCalledWith({ added: true, paymentMethodId: null })
  })

  test('confirm() is called with only { redirect: "if_required" } — no returnUrl', async () => {
    mockConfirm.mockResolvedValue({
      type: 'success',
      session: { status: { type: 'complete' }, savedPaymentMethods: [] }
    })
    const { wrapper } = await makeAddCreditCardModal()
    await flushPromises()
    fireReady()
    await flushPromises()

    await wrapper.find('[data-testid="add-credit-card-modal__submit"]').trigger('click')
    await flushPromises()

    expect(mockConfirm).toHaveBeenCalledWith({ redirect: 'if_required' })
    const [args] = mockConfirm.mock.calls[0]
    expect('returnUrl' in args).toBe(false)
  })

  test('shows the submit error when confirm() returns an error', async () => {
    mockConfirm.mockResolvedValue({ type: 'error', error: { message: 'Your card was declined.' } })
    const { wrapper, close } = await makeAddCreditCardModal()
    await flushPromises()
    fireReady()
    await flushPromises()

    await wrapper.find('[data-testid="add-credit-card-modal__submit"]').trigger('click')
    await flushPromises()

    const err = wrapper.find('[data-testid="add-credit-card-modal__submit-error"]')
    expect(err.exists()).toBe(true)
    expect(err.text()).toBe('Your card was declined.')
    expect(close).not.toHaveBeenCalled()
  })

  test('falls back to a generic submit error when the session is not complete', async () => {
    mockConfirm.mockResolvedValue({ type: 'success', session: { status: { type: 'open' } } })
    const { wrapper, close } = await makeAddCreditCardModal()
    await flushPromises()
    fireReady()
    await flushPromises()

    await wrapper.find('[data-testid="add-credit-card-modal__submit"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="add-credit-card-modal__submit-error"]').exists()).toBe(true)
    expect(close).not.toHaveBeenCalled()
  })
})

describe('add-credit-card-modal — cleanup', () => {
  test('destroys the Payment Element on unmount', async () => {
    const { wrapper } = await makeAddCreditCardModal()
    await flushPromises()
    wrapper.unmount()
    expect(mockElementDestroy).toHaveBeenCalledTimes(1)
  })
})

describe('add-credit-card-modal — sheet close', () => {
  test('emitting close from mobile-sheet calls close() with no argument [obligation]', async () => {
    const { wrapper, close } = await makeAddCreditCardModal()
    await flushPromises()

    await wrapper.find('[data-testid="mobile-sheet-stub__close"]').trigger('click')

    expect(close).toHaveBeenCalledWith()
  })
})
