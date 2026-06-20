import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, useAttrs } from 'vue'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const {
  mockCreateSubscription,
  mockInvalidateQueries,
  mockConfirmPayment,
  mockElementMount,
  mockElementDestroy,
  elementHandlers,
  mockLoadStripe,
  stripeInstance
} = vi.hoisted(() => {
  const handlers = new Map()
  return {
    mockCreateSubscription: vi.fn().mockResolvedValue({
      clientSecret: 'pi_secret_x',
      subscriptionId: 'sub_1'
    }),
    mockInvalidateQueries: vi.fn(),
    mockConfirmPayment: vi.fn(),
    mockElementMount: vi.fn(),
    mockElementDestroy: vi.fn(),
    elementHandlers: handlers,
    mockLoadStripe: vi.fn(),
    stripeInstance: null
  }
})

vi.mock('@stripe/stripe-js', () => {
  return {
    loadStripe: mockLoadStripe
  }
})

vi.mock('@/api/billing', () => ({
  useCreateSubscriptionMutation: () => ({ mutateAsync: mockCreateSubscription })
}))

vi.mock('@pinia/colada', () => ({
  useQueryCache: () => ({ invalidateQueries: mockInvalidateQueries })
}))

vi.mock('@/utils/logger', () => ({
  default: { error: vi.fn() }
}))

// ── Stubs ──────────────────────────────────────────────────────────────────────

const MobileSheetStub = defineComponent({
  name: 'MobileSheet',
  emits: ['close'],
  setup(_props, { slots }) {
    return () =>
      h('div', { 'data-testid': 'mobile-sheet-stub' }, [slots.default?.(), slots.footer?.()])
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

// ── Fake Stripe SDK (configurable per test) ────────────────────────────────────

function makeStripe() {
  const fakePaymentElement = {
    on: vi.fn((event, handler) => elementHandlers.set(event, handler)),
    mount: mockElementMount,
    destroy: mockElementDestroy
  }
  const fakeElements = {
    create: vi.fn(() => fakePaymentElement)
  }
  return {
    elements: vi.fn(() => fakeElements),
    confirmPayment: mockConfirmPayment
  }
}

// ── Component-under-test loader ────────────────────────────────────────────────

async function makeCheckout({ close = vi.fn() } = {}) {
  const Checkout = (await import('@/components/modals/checkout.vue')).default

  const wrapper = shallowMount(Checkout, {
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

// Fires the stored 'ready' handler from the Payment Element so is_ready flips.
function fireReady() {
  elementHandlers.get('ready')?.()
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockCreateSubscription.mockReset()
  mockCreateSubscription.mockResolvedValue({
    clientSecret: 'pi_secret_x',
    subscriptionId: 'sub_1'
  })
  mockInvalidateQueries.mockReset()
  mockConfirmPayment.mockReset()
  mockElementMount.mockReset()
  mockElementDestroy.mockReset()
  elementHandlers.clear()
  mockLoadStripe.mockReset()
  mockLoadStripe.mockResolvedValue(makeStripe())
})

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('checkout modal', () => {
  test('shows a loading indicator before Stripe.js initializes', async () => {
    let resolveStripe
    mockLoadStripe.mockReturnValue(
      new Promise((r) => {
        resolveStripe = r
      })
    )
    const { wrapper } = await makeCheckout()

    expect(wrapper.find('[data-testid="checkout__loading"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="checkout__footer"]').exists()).toBe(false)

    resolveStripe(makeStripe())
    await flushPromises()
  })

  test('mounts the Payment Element once Stripe resolves', async () => {
    const { wrapper } = await makeCheckout()
    await flushPromises()

    expect(wrapper.find('[data-testid="checkout__payment-element"]').exists()).toBe(true)
    expect(mockElementMount).toHaveBeenCalledTimes(1)
  })

  test('submit button is disabled until the Payment Element fires "ready"', async () => {
    const { wrapper } = await makeCheckout()
    await flushPromises()

    const submit = wrapper.find('[data-testid="checkout__submit"]')
    expect(submit.attributes('disabled')).toBeDefined()

    fireReady()
    await flushPromises()

    expect(wrapper.find('[data-testid="checkout__submit"]').attributes('disabled')).toBeUndefined()
  })

  test('renders the error state when createSubscription rejects', async () => {
    mockCreateSubscription.mockRejectedValue(new Error('api down'))
    const { wrapper } = await makeCheckout()
    await flushPromises()

    expect(wrapper.find('[data-testid="checkout__error"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="checkout__footer"]').exists()).toBe(false)
  })

  test('renders the error state when Stripe.js fails to load', async () => {
    mockLoadStripe.mockResolvedValue(null)
    const { wrapper } = await makeCheckout()
    await flushPromises()

    expect(wrapper.find('[data-testid="checkout__error"]').exists()).toBe(true)
  })

  test('on successful payment, invalidates member cache and closes the modal', async () => {
    mockConfirmPayment.mockResolvedValue({
      paymentIntent: { status: 'succeeded' }
    })
    const { wrapper, close } = await makeCheckout()
    await flushPromises()
    fireReady()
    await flushPromises()

    await wrapper.find('[data-testid="checkout__submit"]').trigger('click')
    await flushPromises()

    expect(mockInvalidateQueries).toHaveBeenCalledWith({ key: ['member'] })
    expect(close).toHaveBeenCalledWith({ upgraded: true })
  })

  test('shows the submit error when confirmPayment returns an error', async () => {
    mockConfirmPayment.mockResolvedValue({
      error: { message: 'Your card was declined.' }
    })
    const { wrapper, close } = await makeCheckout()
    await flushPromises()
    fireReady()
    await flushPromises()

    await wrapper.find('[data-testid="checkout__submit"]').trigger('click')
    await flushPromises()

    const err = wrapper.find('[data-testid="checkout__submit-error"]')
    expect(err.exists()).toBe(true)
    expect(err.text()).toBe('Your card was declined.')
    expect(close).not.toHaveBeenCalled()
  })

  test('falls back to a generic submit error when paymentIntent status is non-success', async () => {
    mockConfirmPayment.mockResolvedValue({
      paymentIntent: { status: 'requires_action' }
    })
    const { wrapper, close } = await makeCheckout()
    await flushPromises()
    fireReady()
    await flushPromises()

    await wrapper.find('[data-testid="checkout__submit"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="checkout__submit-error"]').exists()).toBe(true)
    expect(close).not.toHaveBeenCalled()
  })

  test('destroys the Payment Element on unmount', async () => {
    const { wrapper } = await makeCheckout()
    await flushPromises()

    wrapper.unmount()
    expect(mockElementDestroy).toHaveBeenCalledTimes(1)
  })
})
