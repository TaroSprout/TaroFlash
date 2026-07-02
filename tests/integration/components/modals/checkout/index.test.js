import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────
// Real refs so the template's auto-unwrap kicks in — vi.mock factories are
// registered eagerly but only invoked once `use-checkout` is first imported
// (by `Checkout` below), by which point the `vue` import has resolved.

const mockOnSubmit = vi.fn()
const checkoutState = {
  status: ref('form'),
  is_ready: ref(true)
}
const mediaState = { is_mobile: ref(false) }

vi.mock('gsap', () => ({
  gsap: {
    to: vi.fn((_el, opts) => opts?.onComplete?.())
  }
}))

vi.mock('@/components/modals/checkout/use-checkout', () => ({
  useCheckout: () => ({
    status: checkoutState.status,
    is_ready: checkoutState.is_ready,
    onSubmit: mockOnSubmit
  })
}))

vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: () => mediaState.is_mobile
}))

import Checkout from '@/components/modals/checkout/index.vue'

// ── Setup ──────────────────────────────────────────────────────────────────────

function mountCheckout(close = vi.fn()) {
  return shallowMount(Checkout, { props: { close } })
}

beforeEach(() => {
  checkoutState.status.value = 'form'
  checkoutState.is_ready.value = true
  mediaState.is_mobile.value = false
  mockOnSubmit.mockReset()
})

// ── Header ──────────────────────────────────────────────────────────────────────

describe('Checkout — header', () => {
  test('renders while not in the success status', () => {
    const wrapper = mountCheckout()
    expect(wrapper.find('[data-testid="checkout__header"]').exists()).toBe(true)
  })

  test('[obligation] is absent while status is success', async () => {
    checkoutState.status.value = 'success'
    const wrapper = mountCheckout()
    await flushPromises()
    expect(wrapper.find('[data-testid="checkout__header"]').exists()).toBe(false)
  })

  test('[obligation] close button is disabled only while confirming', () => {
    checkoutState.status.value = 'confirming'
    const wrapper = mountCheckout()
    const closeButton = wrapper.findComponent({ name: 'UiButton' })
    expect(closeButton.props('disabled')).toBe(true)
  })

  test('[obligation] close button is enabled while loading', () => {
    checkoutState.status.value = 'loading'
    const wrapper = mountCheckout()
    const closeButton = wrapper.findComponent({ name: 'UiButton' })
    expect(closeButton.props('disabled')).toBe(false)
  })

  test('[obligation] close button is enabled while error', () => {
    checkoutState.status.value = 'error'
    const wrapper = mountCheckout()
    const closeButton = wrapper.findComponent({ name: 'UiButton' })
    expect(closeButton.props('disabled')).toBe(false)
  })

  test('calls close() with no argument when the close button is pressed', () => {
    const close = vi.fn()
    const wrapper = mountCheckout(close)

    wrapper.findComponent({ name: 'UiButton' }).vm.$emit('press')

    expect(close).toHaveBeenCalledWith()
  })

  test('renders the close-label slot text and the title', () => {
    const wrapper = shallowMount(Checkout, {
      props: { close: vi.fn() },
      global: { renderStubDefaultSlot: true }
    })
    expect(wrapper.text()).toContain('Close')
    expect(wrapper.find('[data-testid="checkout__title"]').text()).toBe('Upgrade your plan')
  })
})

// ── Footer ────────────────────────────────────────────────────────────────────

describe('Checkout — footer', () => {
  test('renders while not in the success status', () => {
    const wrapper = mountCheckout()
    expect(wrapper.findComponent({ name: 'CheckoutFooter' }).exists()).toBe(true)
  })

  test('[obligation] is absent while status is success', async () => {
    checkoutState.status.value = 'success'
    const wrapper = mountCheckout()
    await flushPromises()
    expect(wrapper.findComponent({ name: 'CheckoutFooter' }).exists()).toBe(false)
  })

  test('submitting the footer calls onSubmit from useCheckout', () => {
    const wrapper = mountCheckout()
    wrapper.findComponent({ name: 'CheckoutFooter' }).vm.$emit('submit')
    expect(mockOnSubmit).toHaveBeenCalledOnce()
  })
})

// ── Body / success swap ──────────────────────────────────────────────────────

describe('Checkout — body', () => {
  test('shows the payment form while not in the success status', () => {
    const wrapper = mountCheckout()
    expect(wrapper.find('[data-testid="checkout__body"]').exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'SuccessView' }).exists()).toBe(false)
  })

  test('[obligation] shows only the success view while status is success', async () => {
    checkoutState.status.value = 'success'
    const wrapper = mountCheckout()
    await flushPromises()

    expect(wrapper.find('[data-testid="checkout__body"]').exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'SuccessView' }).exists()).toBe(true)
  })

  test('[obligation] no longer renders local submit-error markup — Stripe surfaces its own', () => {
    const wrapper = mountCheckout()
    expect(wrapper.find('[data-testid="checkout__submit-error"]').exists()).toBe(false)
  })
})

// ── Body/success transition ────────────────────────────────────────────────────

describe('Checkout — body/success transition', () => {
  test('swaps from the payment form to the success view when status flips mid-flight', async () => {
    const wrapper = mountCheckout()
    expect(wrapper.find('[data-testid="checkout__body"]').exists()).toBe(true)

    checkoutState.status.value = 'success'
    await flushPromises()

    expect(wrapper.find('[data-testid="checkout__body"]').exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'SuccessView' }).exists()).toBe(true)
  })
})

// ── Full-bleed mobile scroll area [obligation] ────────────────────────────────

describe('Checkout — full-bleed mobile scroll area [obligation]', () => {
  test('[obligation] checkout__scroll-area is the overflow container in full-bleed mode', () => {
    mediaState.is_mobile.value = true
    const wrapper = mountCheckout()

    const scrollArea = wrapper.find('[data-testid="checkout__scroll-area"]')
    expect(scrollArea.attributes('data-full-bleed')).toBe('true')
  })

  test('[obligation] checkout__scroll-area is not the overflow container outside full-bleed mode', () => {
    mediaState.is_mobile.value = false
    const wrapper = mountCheckout()

    const scrollArea = wrapper.find('[data-testid="checkout__scroll-area"]')
    expect(scrollArea.attributes('data-full-bleed')).toBe('false')
  })

  test('[obligation] scroll-area wraps header, body, and footer together, not just the body', () => {
    mediaState.is_mobile.value = true
    const wrapper = mountCheckout()

    const scrollArea = wrapper.find('[data-testid="checkout__scroll-area"]')
    expect(scrollArea.find('[data-testid="checkout__header"]').exists()).toBe(true)
    expect(scrollArea.find('[data-testid="checkout__body"]').exists()).toBe(true)
    expect(scrollArea.findComponent({ name: 'CheckoutFooter' }).exists()).toBe(true)
  })

  test('renders the ui-kit scroll-bar targeting the scroll-area only in full-bleed mode', () => {
    mediaState.is_mobile.value = true
    const wrapper = mountCheckout()
    expect(wrapper.findComponent({ name: 'ScrollBar' }).exists()).toBe(true)
  })

  test('does not render the ui-kit scroll-bar outside full-bleed mode', () => {
    mediaState.is_mobile.value = false
    const wrapper = mountCheckout()
    expect(wrapper.findComponent({ name: 'ScrollBar' }).exists()).toBe(false)
  })

  test('applies full-bleed sizing (h-full w-full, no rounding) when is_mobile is true', () => {
    mediaState.is_mobile.value = true
    const wrapper = mountCheckout()
    const root = wrapper.find('[data-testid="checkout"]')
    expect(root.attributes('data-full-bleed')).toBe('true')
  })

  test('applies fixed desktop sizing when is_mobile is false', () => {
    mediaState.is_mobile.value = false
    const wrapper = mountCheckout()
    const root = wrapper.find('[data-testid="checkout"]')
    expect(root.attributes('data-full-bleed')).toBe('false')
  })
})
