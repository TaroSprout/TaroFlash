import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, useAttrs } from 'vue'
import { PLANS } from '@/config/plans'

// ── Hoisted state ─────────────────────────────────────────────────────────────

const { mockOnUpgrade } = vi.hoisted(() => ({ mockOnUpgrade: vi.fn() }))

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/composables/member/subscription-actions', () => ({
  useSubscriptionActions: () => ({
    onUpgrade: mockOnUpgrade,
    onCancel: vi.fn(),
    onResume: vi.fn(),
    canceling: { value: false },
    resuming: { value: false }
  })
}))

// ── Stubs ─────────────────────────────────────────────────────────────────────

const UiTappableStub = defineComponent({
  name: 'UiTappable',
  inheritAttrs: false,
  setup(_, { slots }) {
    const attrs = useAttrs()
    return () => h('div', { ...attrs }, slots.default?.())
  }
})

const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  props: ['iconLeft'],
  emits: ['press'],
  setup(props, { slots, attrs, emit }) {
    return () =>
      h('button', { ...attrs, 'data-testid': 'upgrade-button', onClick: () => emit('press') }, [
        slots.default?.()
      ])
  }
})

// ── Import ────────────────────────────────────────────────────────────────────

import PaidFeatures from '@/components/settings/tab-subscription/paid-features.vue'

// ── Factory ───────────────────────────────────────────────────────────────────

function mountPaidFeatures() {
  return shallowMount(PaidFeatures, {
    global: {
      stubs: {
        UiTappable: UiTappableStub,
        UiButton: UiButtonStub
      }
    }
  })
}

// ── Reset ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockOnUpgrade.mockClear()
})

// ── Structure ─────────────────────────────────────────────────────────────────

describe('paid-features — structure', () => {
  test('renders the paid-features root element', () => {
    const wrapper = mountPaidFeatures()
    expect(wrapper.find('[data-testid="paid-features"]').exists()).toBe(true)
  })

  test('renders the tappable body', () => {
    const wrapper = mountPaidFeatures()
    expect(wrapper.find('[data-testid="paid-features__body"]').exists()).toBe(true)
  })

  test('renders the header with heading and price', () => {
    const wrapper = mountPaidFeatures()
    expect(wrapper.find('[data-testid="paid-features__heading"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="paid-features__price"]').exists()).toBe(true)
  })

  test('price element shows the paid plan monthly price', () => {
    const wrapper = mountPaidFeatures()
    const price = wrapper.find('[data-testid="paid-features__price"]').text()
    expect(price).toContain(`$${PLANS.paid.monthlyPriceUsd}`)
  })

  test('renders the feature list', () => {
    const wrapper = mountPaidFeatures()
    expect(wrapper.find('[data-testid="paid-features__list"]').exists()).toBe(true)
  })
})

// ── Feature filtering [obligation] ────────────────────────────────────────────

describe('paid-features — upgradeHighlight filtering [obligation]', () => {
  test('renders exactly 4 feature items (one per upgradeHighlight feature) [obligation]', () => {
    const wrapper = mountPaidFeatures()
    const items = wrapper.findAll('[data-testid="paid-features__item"]')
    expect(items).toHaveLength(4)
  })

  test('deck-images feature (not upgradeHighlight) does NOT appear in the list [obligation]', () => {
    const wrapper = mountPaidFeatures()
    const listText = wrapper.find('[data-testid="paid-features__list"]').text()
    expect(listText).not.toContain('Upload images to decks')
  })

  test('cancel-anytime feature (not upgradeHighlight) does NOT appear in the list [obligation]', () => {
    const wrapper = mountPaidFeatures()
    const listText = wrapper.find('[data-testid="paid-features__list"]').text()
    expect(listText).not.toContain('Cancel anytime')
  })

  test('no-deck-limit feature (upgradeHighlight) appears in the list [obligation]', () => {
    const wrapper = mountPaidFeatures()
    const listText = wrapper.find('[data-testid="paid-features__list"]').text()
    expect(listText).toContain('No deck limit')
  })

  test('no-card-limit feature (upgradeHighlight) appears in the list [obligation]', () => {
    const wrapper = mountPaidFeatures()
    const listText = wrapper.find('[data-testid="paid-features__list"]').text()
    expect(listText).toContain('No card limit per Deck')
  })

  test('card-images feature (upgradeHighlight) appears in the list [obligation]', () => {
    const wrapper = mountPaidFeatures()
    const listText = wrapper.find('[data-testid="paid-features__list"]').text()
    expect(listText).toContain('Add images to your Cards')
  })

  test('review-history feature (upgradeHighlight) appears in the list [obligation]', () => {
    const wrapper = mountPaidFeatures()
    const listText = wrapper.find('[data-testid="paid-features__list"]').text()
    expect(listText).toContain('Unlimited review history')
  })
})

// ── Upgrade interactions [obligation] ─────────────────────────────────────────

describe('paid-features — upgrade actions [obligation]', () => {
  test('tapping the tappable body (UiTappable @tap) calls onUpgrade [obligation]', async () => {
    const wrapper = mountPaidFeatures()
    await wrapper.findComponent({ name: 'UiTappable' }).vm.$emit('tap')
    expect(mockOnUpgrade).toHaveBeenCalledOnce()
  })

  test('[obligation] the nested upgrade pill has no click/press handler of its own — it is inert', async () => {
    const wrapper = mountPaidFeatures()
    await wrapper.find('[data-testid="upgrade-button"]').trigger('click')
    expect(mockOnUpgrade).not.toHaveBeenCalled()
  })

  test('[obligation] the nested upgrade pill is marked inert (tabindex -1, aria-hidden)', () => {
    const wrapper = mountPaidFeatures()
    const pill = wrapper.find('[data-testid="upgrade-button"]')
    expect(pill.attributes('tabindex')).toBe('-1')
    expect(pill.attributes('aria-hidden')).toBe('true')
  })

  test('[obligation] tapping the card body calls onUpgrade exactly once, not twice via the nested pill', async () => {
    const wrapper = mountPaidFeatures()
    await wrapper.findComponent({ name: 'UiTappable' }).vm.$emit('tap')
    expect(mockOnUpgrade).toHaveBeenCalledTimes(1)
  })
})
