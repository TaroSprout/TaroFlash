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
    set: vi.fn(),
    to: vi.fn((_el, opts) => opts?.onComplete?.()),
    fromTo: vi.fn((_el, _from, opts) => opts?.onComplete?.())
  }
}))

vi.mock('@/components/modals/checkout/use-checkout', () => ({
  useCheckout: () => ({
    status: checkoutState.status,
    is_ready: checkoutState.is_ready,
    onSubmit: mockOnSubmit
  })
}))

// dialog-card's provideDialogCardViewport calls useMatchMedia under the hood —
// mocking it here lets tests flip the resolved viewport for checkout's default
// 'w<sm | h<sm' query.
const capturedQueries = []
vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: vi.fn((query) => {
    capturedQueries.push(query)
    return mediaState.is_mobile
  })
}))

import Checkout from '@/components/modals/checkout/index.vue'

// ── Setup ──────────────────────────────────────────────────────────────────────

function mountCheckout(close = vi.fn()) {
  return shallowMount(Checkout, {
    props: { close },
    global: { stubs: { DialogCard: false, DialogCardHeader: false } }
  })
}

beforeEach(() => {
  checkoutState.status.value = 'form'
  checkoutState.is_ready.value = true
  mediaState.is_mobile.value = false
  mockOnSubmit.mockReset()
  capturedQueries.length = 0
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

  test('renders the title', () => {
    const wrapper = mountCheckout()
    expect(wrapper.find('[data-testid="dialog-card-header__title"]').text()).toBe(
      'Upgrade your plan'
    )
  })

  test('renders the close-label slot text', () => {
    const wrapper = shallowMount(Checkout, {
      props: { close: vi.fn() },
      global: {
        stubs: { DialogCard: false, DialogCardHeader: false },
        renderStubDefaultSlot: true
      }
    })
    expect(wrapper.text()).toContain('Close')
  })

  // ── exactly one close button [obligation] ──────────────────────────────────
  // dialog-card's own fallback header would render a second close button if
  // show_close_button weren't explicitly false, since checkout renders its own
  // header manually.

  test('[obligation] renders exactly one close button regardless of status', () => {
    ;['loading', 'form', 'error', 'confirming'].forEach((status) => {
      checkoutState.status.value = status
      const wrapper = mountCheckout()
      expect(wrapper.findAll('[data-testid="checkout__close"]')).toHaveLength(1)
      wrapper.unmount()
    })
  })

  // ── dialog-card's own @close forwards through (backdrop/esc) ───────────────

  test('dialog-card emitting close (e.g. backdrop/esc) calls close() with no argument', async () => {
    const close = vi.fn()
    const wrapper = mountCheckout(close)
    await wrapper.findComponent({ name: 'DialogCard' }).vm.$emit('close')
    expect(close).toHaveBeenCalledWith()
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
})

// ── dialog-card header stays inside the scroll-area [obligation] ─────────────

describe('Checkout — header lives inside the scroll-area flex context [obligation]', () => {
  test('[obligation] dialog-card-header is a descendant of checkout__scroll-area, not a structural sibling', () => {
    const wrapper = mountCheckout()

    const scrollArea = wrapper.find('[data-testid="checkout__scroll-area"]')
    expect(scrollArea.find('[data-testid="checkout__header"]').exists()).toBe(true)

    // The dialog-card root's direct children should be [scroll-area, scroll-bar?] —
    // the header must not appear as a second, separate top-level child.
    const root = wrapper.find('[data-testid="checkout"]')
    const headerOutsideScrollArea = root
      .findAll('[data-testid="checkout__header"]')
      .filter((el) => !scrollArea.element.contains(el.element))
    expect(headerOutsideScrollArea).toHaveLength(0)
  })
})

// ── viewport_query default [obligation] ───────────────────────────────────────

describe('Checkout — dialog-card viewport_query [obligation]', () => {
  test('[obligation] uses the "w<sm | h<sm" default query, not a hardcoded/shared one', () => {
    mountCheckout()
    expect(capturedQueries).toContain('w<sm | h<sm')
  })
})

// ── show_close_button=false passed explicitly [obligation] ───────────────────

describe('Checkout — show_close_button [obligation]', () => {
  test('[obligation] passes show_close_button=false to dialog-card so its fallback header never renders', () => {
    const wrapper = mountCheckout()
    // dialog-card's own fallback close button carries this data-testid; checkout
    // renders its own via checkout__close instead.
    expect(wrapper.find('[data-testid="dialog-card__close"]').exists()).toBe(false)
  })
})
