import { describe, test, expect, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { PLANS } from '@/config/plans'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))

vi.mock('@/sfx/bus', () => ({
  emitSfx: mockEmitSfx,
  emitHoverSfx: vi.fn()
}))

// ── Stubs ──────────────────────────────────────────────────────────────────────

const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  props: ['size', 'variant', 'fullWidth', 'iconRight'],
  emits: ['press'],
  setup(props, { slots, attrs, emit }) {
    return () => h('button', { ...attrs, onClick: () => emit('press') }, slots.default?.())
  }
})

const UiIconStub = defineComponent({
  name: 'UiIcon',
  props: ['src'],
  setup(props) {
    return () => h('span', { 'data-testid': 'ui-icon', 'data-src': props.src })
  }
})

const UiImageStub = defineComponent({
  name: 'UiImage',
  props: ['src'],
  setup(props) {
    return () => h('img', { 'data-src': props.src })
  }
})

const SectionHeaderStub = defineComponent({
  name: 'SectionHeader',
  props: ['eyebrow', 'heading', 'subtitle'],
  setup(props) {
    return () => h('div', { 'data-testid': 'section-header' }, props.heading)
  }
})

// ── Import ─────────────────────────────────────────────────────────────────────

import SectionPricing from '@/views/welcome/section-pricing.vue'

// ── Mount helper ───────────────────────────────────────────────────────────────

function mountPricing(signup = vi.fn()) {
  return shallowMount(SectionPricing, {
    props: { signup },
    global: {
      stubs: {
        UiButton: UiButtonStub,
        UiIcon: UiIconStub,
        UiImage: UiImageStub,
        SectionHeader: SectionHeaderStub
      }
    }
  })
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('SectionPricing', () => {
  // ── Structure ──────────────────────────────────────────────────────────────

  test('renders the pricing section container', () => {
    const wrapper = mountPricing()
    expect(wrapper.find('[data-testid="welcome-pricing"]').exists()).toBe(true)
  })

  test('renders the plans grid', () => {
    const wrapper = mountPricing()
    expect(wrapper.find('[data-testid="welcome-pricing__grid"]').exists()).toBe(true)
  })

  test('renders a card for each plan', () => {
    const wrapper = mountPricing()
    expect(wrapper.find('[data-testid="welcome-pricing__plan-free"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="welcome-pricing__plan-full"]').exists()).toBe(true)
  })

  test('renders the footnote', () => {
    const wrapper = mountPricing()
    expect(wrapper.find('[data-testid="welcome-pricing__footnote"]').exists()).toBe(true)
  })

  // ── Free-plan feature copy from PLANS config [obligation] ─────────────────

  test('free-plan deck limit feature reflects PLANS.free.deckLimit [obligation]', () => {
    const wrapper = mountPricing()
    const freePlan = wrapper.find('[data-testid="welcome-pricing__plan-free"]')
    // The locale string is "Up to {count} decks" interpolated with deckLimit
    expect(freePlan.text()).toContain(`Up to ${PLANS.free.deckLimit} decks`)
  })

  test('free-plan cards-per-deck limit feature reflects PLANS.free.cardsPerDeckLimit [obligation]', () => {
    const wrapper = mountPricing()
    const freePlan = wrapper.find('[data-testid="welcome-pricing__plan-free"]')
    // The locale string is "Up to {count} cards per deck" interpolated with cardsPerDeckLimit
    expect(freePlan.text()).toContain(`Up to ${PLANS.free.cardsPerDeckLimit} cards per deck`)
  })

  test('free-plan shows "Up to 5 decks" (PLANS.free.deckLimit = 5) [obligation]', () => {
    const wrapper = mountPricing()
    const freePlan = wrapper.find('[data-testid="welcome-pricing__plan-free"]')
    expect(freePlan.text()).toContain('Up to 5 decks')
  })

  test('free-plan shows "Up to 200 cards per deck" (PLANS.free.cardsPerDeckLimit = 200) [obligation]', () => {
    const wrapper = mountPricing()
    const freePlan = wrapper.find('[data-testid="welcome-pricing__plan-free"]')
    expect(freePlan.text()).toContain('Up to 200 cards per deck')
  })

  // ── CTA buttons call signup with correct payment flag ──────────────────────

  test('free plan CTA calls signup(false)', async () => {
    const signup = vi.fn()
    const wrapper = mountPricing(signup)
    const freePlan = wrapper.find('[data-testid="welcome-pricing__plan-free"]')
    await freePlan.find('button').trigger('click')
    expect(signup).toHaveBeenCalledWith(false)
  })

  test('full plan CTA calls signup(true)', async () => {
    const signup = vi.fn()
    const wrapper = mountPricing(signup)
    const fullPlan = wrapper.find('[data-testid="welcome-pricing__plan-full"]')
    await fullPlan.find('button').trigger('click')
    expect(signup).toHaveBeenCalledWith(true)
  })

  // ── Featured plan marker ───────────────────────────────────────────────────

  test('full plan has data-featured attribute', () => {
    const wrapper = mountPricing()
    const fullPlan = wrapper.find('[data-testid="welcome-pricing__plan-full"]')
    expect(fullPlan.attributes('data-featured')).toBe('true')
  })

  test('free plan does not have data-featured attribute', () => {
    const wrapper = mountPricing()
    const freePlan = wrapper.find('[data-testid="welcome-pricing__plan-free"]')
    expect(freePlan.attributes('data-featured')).toBeUndefined()
  })
})
