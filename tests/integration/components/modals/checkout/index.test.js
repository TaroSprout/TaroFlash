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

vi.mock('@/components/billing/checkout-modal/use-checkout', () => ({
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

import Checkout from '@/components/billing/checkout-modal/index.vue'
import DialogCard from '@/components/layout-kit/dialog-card/index.vue'

// ── Setup ──────────────────────────────────────────────────────────────────────

function mountCheckout(close = vi.fn()) {
  return shallowMount(Checkout, {
    props: { close },
    global: {
      stubs: {
        DialogCard: false,
        DialogCardHeader: false,
        DialogCardPager: false,
        DialogCardBody: false,
        ScrollRegion: false
      }
    }
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
    expect(wrapper.find('[data-testid="dialog-card-header"]').exists()).toBe(true)
  })

  test('is absent while status is success', async () => {
    checkoutState.status.value = 'success'
    const wrapper = mountCheckout()
    await flushPromises()
    expect(wrapper.find('[data-testid="dialog-card-header"]').exists()).toBe(false)
  })

  test('close button is disabled only while confirming', () => {
    checkoutState.status.value = 'confirming'
    const wrapper = mountCheckout()
    const closeButton = wrapper.findComponent({ name: 'UiButton' })
    expect(closeButton.props('disabled')).toBe(true)
  })

  test('close button is enabled while loading', () => {
    checkoutState.status.value = 'loading'
    const wrapper = mountCheckout()
    const closeButton = wrapper.findComponent({ name: 'UiButton' })
    expect(closeButton.props('disabled')).toBe(false)
  })

  test('close button is enabled while error', () => {
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
        stubs: { DialogCard: false, DialogCardHeader: false, DialogCardPager: false },
        renderStubDefaultSlot: true
      }
    })
    expect(wrapper.text()).toContain('Close')
  })

  // ── exactly one close button ──────────────────────────────────
  // checkout passes close_label/close_disabled through to dialog-card's own
  // fallback header instead of rendering a second close button of its own.

  test('renders exactly one close button regardless of status', () => {
    ;['loading', 'form', 'error', 'confirming'].forEach((status) => {
      checkoutState.status.value = status
      const wrapper = mountCheckout()
      expect(wrapper.findAll('[data-testid="dialog-card__close"]')).toHaveLength(1)
      wrapper.unmount()
    })
  })

  // ── dialog-card's own @close forwards through (backdrop/esc) ───────────────

  test('dialog-card emitting close (e.g. backdrop/esc) calls close() with no argument', async () => {
    // DialogCard's SFC filename is index.vue, so its inferred component name
    // isn't usable for findComponent({ name }) — resolve it by the imported
    // component reference instead.
    const close = vi.fn()
    const wrapper = mountCheckout(close)
    await wrapper.findComponent(DialogCard).vm.$emit('close')
    expect(close).toHaveBeenCalledWith()
  })
})

// ── Footer ────────────────────────────────────────────────────────────────────

describe('Checkout — footer', () => {
  test('renders while not in the success status', () => {
    const wrapper = mountCheckout()
    expect(wrapper.findComponent({ name: 'CheckoutFooter' }).exists()).toBe(true)
  })

  test('is absent while status is success', async () => {
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

  test('shows only the success view while status is success', async () => {
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

// ── dialog-card-body migration ───────────────────────────────────
// checkout's scroll area is now dialog-card-body itself — it owns the
// overflow/scroll-bar, not a hand-rolled full-bleed div. The footer moved out
// into dialog-card's #toolbar, so it's a sibling of the scroll area, not
// nested inside it.

describe('Checkout — dialog-card-body owns the scroll area', () => {
  test('checkout__scroll-area is rendered by dialog-card-body', () => {
    const wrapper = mountCheckout()
    expect(wrapper.findComponent({ name: 'DialogCardBody' }).attributes('data-testid')).toBe(
      'checkout__scroll-area'
    )
  })

  test('the footer is a sibling of the scroll area, not nested inside it', () => {
    const wrapper = mountCheckout()

    const scrollArea = wrapper.find('[data-testid="checkout__scroll-area"]')
    expect(scrollArea.findComponent({ name: 'CheckoutFooter' }).exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'CheckoutFooter' }).exists()).toBe(true)
  })

  test('the scroll area still wraps the body', () => {
    const wrapper = mountCheckout()
    const scrollArea = wrapper.find('[data-testid="checkout__scroll-area"]')
    expect(scrollArea.find('[data-testid="checkout__body"]').exists()).toBe(true)
  })

  // The handle is overflow-driven now, not viewport-driven — dialog-card-body
  // hands its overflow to a scroll region, which only draws a handle once the
  // content outgrows the box.

  test('the scroll area hands its overflow to a scroll region', () => {
    const wrapper = mountCheckout()

    const scrollArea = wrapper.find('[data-testid="checkout__scroll-area"]')
    expect(scrollArea.find('[data-testid="scroll-region__scroller"]').exists()).toBe(true)
  })

  test('draws no handle while the checkout content fits its box', () => {
    const wrapper = mountCheckout()
    expect(wrapper.find('[data-testid="scroll-region__handle"]').exists()).toBe(false)
  })
})

// ── dialog-card's own header sits outside the scroll-area ───────
// checkout delegates the header entirely to dialog-card (via show_header /
// close_label / close_disabled) instead of building its own — dialog-card
// always renders the header as a sibling above its body slot, so it's never
// nested inside checkout's own scroll-area.

describe('Checkout — header lives outside the scroll-area, owned by dialog-card', () => {
  test('dialog-card-header is a sibling of checkout__scroll-area, not nested inside it', () => {
    const wrapper = mountCheckout()

    const scrollArea = wrapper.find('[data-testid="checkout__scroll-area"]')
    expect(scrollArea.find('[data-testid="dialog-card-header"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="dialog-card-header"]').exists()).toBe(true)
  })
})

// ── size prop default full_bleed_at ──────────────────────────────

describe('Checkout — dialog-card size default full_bleed_at', () => {
  test('uses the "w<sm | h<sm" query sourced from size="md", not a hardcoded/shared one', () => {
    mountCheckout()
    expect(capturedQueries).toContain('w<sm | h<sm')
  })
})

// ── show_header/close_label/close_disabled passed through ───────

describe('Checkout — header props forwarded to dialog-card', () => {
  test('does not pass show_close_button=false, so dialog-card renders its own fallback close button', () => {
    const wrapper = mountCheckout()
    expect(wrapper.find('[data-testid="dialog-card__close"]').exists()).toBe(true)
  })
})
