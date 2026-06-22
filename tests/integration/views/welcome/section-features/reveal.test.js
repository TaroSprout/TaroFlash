import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, nextTick, shallowRef } from 'vue'
import { welcomeWidthKey } from '@/views/welcome/welcome-layout'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mockCreateFeatureReveal, mockCreateStackReveal, mockKill, mockStackTeardown } = vi.hoisted(
  () => {
    const mockKill = vi.fn()
    const mockStackTeardown = vi.fn()
    return {
      mockKill,
      mockStackTeardown,
      mockCreateFeatureReveal: vi.fn(() => ({ kill: mockKill })),
      mockCreateStackReveal: vi.fn(() => mockStackTeardown)
    }
  }
)

// width is provided via injection as a reactive ref so the component's
// watch(width, ...) has a valid source. Set .value before each mount.
const width = shallowRef('desktop')

vi.mock('@/utils/animations/welcome/feature-reveal', () => ({
  createFeatureReveal: mockCreateFeatureReveal
}))
vi.mock('@/utils/animations/welcome/stack-reveal', () => ({
  createStackReveal: mockCreateStackReveal
}))

// ── Stubs ──────────────────────────────────────────────────────────────────────

const FeatureCardStub = defineComponent({
  name: 'FeatureCard',
  props: ['feature_key', 'side'],
  setup(props) {
    return () =>
      h('div', {
        'data-testid': 'feature-card-stub',
        'data-feature-key': props.feature_key,
        'data-side': props.side
      })
  }
})

// ── Import ─────────────────────────────────────────────────────────────────────

import SectionFeatures from '@/views/welcome/section-features/index.vue'

// ── Mount helper ───────────────────────────────────────────────────────────────

function mountFeatures() {
  // Provide the width injection so useWelcomeWidth() resolves correctly.
  return shallowMount(SectionFeatures, {
    attachTo: document.body,
    props: { seeRoadmap: vi.fn() },
    global: {
      provide: { [welcomeWidthKey]: width },
      stubs: { SectionHeader: true, FeatureCard: FeatureCardStub, CommunityCallout: true }
    }
  })
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('SectionFeatures scroll-flip reveal', () => {
  let wrapper

  beforeEach(() => {
    width.value = 'desktop'
    mockCreateFeatureReveal.mockClear()
    mockCreateFeatureReveal.mockImplementation(() => ({ kill: mockKill }))
    mockCreateStackReveal.mockClear()
    mockCreateStackReveal.mockImplementation(() => mockStackTeardown)
    mockKill.mockClear()
    mockStackTeardown.mockClear()
  })

  afterEach(() => {
    // Always unmount so the watch(width, ...) watcher doesn't fire on stale
    // components when beforeEach resets width.value for the next test.
    wrapper?.unmount()
    wrapper = undefined
  })

  // [obligation] desktop: single trigger over all 4 card indices
  test('wires a single ScrollTrigger reveal over all 4 indices on desktop [obligation]', () => {
    wrapper = mountFeatures()
    expect(mockCreateFeatureReveal).toHaveBeenCalledTimes(1)
    const [triggerEl, indices] = mockCreateFeatureReveal.mock.calls[0]
    expect(triggerEl).toBeInstanceOf(HTMLElement)
    expect(indices).toEqual([0, 1, 2, 3])
  })

  test('cards start on the cover side on desktop', () => {
    wrapper = mountFeatures()
    const sides = wrapper
      .findAll('[data-testid="feature-card-stub"]')
      .map((c) => c.attributes('data-side'))
    expect(sides).toEqual(['cover', 'cover', 'cover', 'cover'])
  })

  // [obligation] setActive boolean callback: active=true → front, active=false → cover
  test('setActive(index, true) flips the card to front [obligation]', async () => {
    wrapper = mountFeatures()
    const setActive = mockCreateFeatureReveal.mock.calls[0][2]

    setActive(1, true)
    await nextTick()

    const sides = wrapper
      .findAll('[data-testid="feature-card-stub"]')
      .map((c) => c.attributes('data-side'))
    expect(sides).toEqual(['cover', 'front', 'cover', 'cover'])
  })

  test('setActive(index, false) returns the card to cover [obligation]', async () => {
    wrapper = mountFeatures()
    const setActive = mockCreateFeatureReveal.mock.calls[0][2]

    setActive(0, true)
    await nextTick()
    setActive(0, false)
    await nextTick()

    const sides = wrapper
      .findAll('[data-testid="feature-card-stub"]')
      .map((c) => c.attributes('data-side'))
    expect(sides).toEqual(['cover', 'cover', 'cover', 'cover'])
  })

  // [obligation] tablet: two triggers — one per 2-column grid row ([0,1] and [2,3])
  test('wires two reveal triggers on tablet, one per grid row [obligation]', () => {
    width.value = 'tablet'
    wrapper = mountFeatures()
    expect(mockCreateFeatureReveal).toHaveBeenCalledTimes(2)
    const firstIndices = mockCreateFeatureReveal.mock.calls[0][1]
    const secondIndices = mockCreateFeatureReveal.mock.calls[1][1]
    expect(firstIndices).toEqual([0, 1])
    expect(secondIndices).toEqual([2, 3])
  })

  // [obligation] mobile: uses createStackReveal, not createFeatureReveal
  test('uses createStackReveal on mobile and does not call createFeatureReveal [obligation]', () => {
    width.value = 'mobile'
    wrapper = mountFeatures()
    expect(mockCreateFeatureReveal).not.toHaveBeenCalled()
    expect(mockCreateStackReveal).toHaveBeenCalledTimes(1)
  })

  // [obligation] mobile: passes features.length + 1 triggers to createStackReveal
  test('passes features.length + 1 as count to createStackReveal [obligation]', () => {
    width.value = 'mobile'
    wrapper = mountFeatures()
    const [, count] = mockCreateStackReveal.mock.calls[0]
    expect(count).toBe(5) // 4 features + 1 trailing deactivation trigger
  })

  // [obligation] data-active tracks activeIndex — not a CSS class
  test('data-active="true" is set only on the card at activeIndex [obligation]', async () => {
    width.value = 'mobile'
    wrapper = mountFeatures()
    const reachCard = mockCreateStackReveal.mock.calls[0][2]

    reachCard(2, true)
    await nextTick()

    const items = wrapper.findAll('[data-testid^="welcome-features__card-"]')
    const activeAttrs = items.map((el) => el.attributes('data-active'))
    expect(activeAttrs[2]).toBe('true')
    expect(activeAttrs.filter((v) => v === 'true')).toHaveLength(1)
  })

  // [obligation] mobile: reachCard sets activeIndex = entering ? index : index - 1
  test('reachCard sets activeIndex to index when entering [obligation]', async () => {
    width.value = 'mobile'
    wrapper = mountFeatures()
    const reachCard = mockCreateStackReveal.mock.calls[0][2]

    reachCard(1, true)
    await nextTick()

    const items = wrapper.findAll('[data-testid^="welcome-features__card-"]')
    expect(items[1].attributes('data-active')).toBe('true')
  })

  test('reachCard sets activeIndex to index - 1 when leaving [obligation]', async () => {
    width.value = 'mobile'
    wrapper = mountFeatures()
    const reachCard = mockCreateStackReveal.mock.calls[0][2]

    reachCard(2, true)
    await nextTick()
    reachCard(3, false)
    await nextTick()

    const items = wrapper.findAll('[data-testid^="welcome-features__card-"]')
    // leaving trigger 3 → activeIndex = 3 - 1 = 2
    expect(items[2].attributes('data-active')).toBe('true')
    expect(items[3].attributes('data-active')).toBe('false')
  })

  // [obligation] trailing trigger (index = features.length) deactivates all cards
  test('trailing trigger entering sets activeIndex past last card — no card is front [obligation]', async () => {
    width.value = 'mobile'
    wrapper = mountFeatures()
    const reachCard = mockCreateStackReveal.mock.calls[0][2]

    reachCard(3, true)
    await nextTick()

    // Trailing trigger (index 4) enters — activeIndex = 4, past last feature (3)
    reachCard(4, true)
    await nextTick()

    const items = wrapper.findAll('[data-testid^="welcome-features__card-"]')
    const fronts = items.filter((el) => el.attributes('data-side') === 'front')
    expect(fronts).toHaveLength(0)
    const actives = items.filter((el) => el.attributes('data-active') === 'true')
    expect(actives).toHaveLength(0)
  })

  // [obligation] mobile: every non-active card is on cover side
  test('mobile: only the active card shows front; all others show cover [obligation]', async () => {
    width.value = 'mobile'
    wrapper = mountFeatures()
    const reachCard = mockCreateStackReveal.mock.calls[0][2]

    reachCard(1, true)
    await nextTick()

    const stubs = wrapper.findAll('[data-testid="feature-card-stub"]')
    const sides = stubs.map((s) => s.attributes('data-side'))
    expect(sides[1]).toBe('front')
    expect(sides.filter((s) => s === 'front')).toHaveLength(1)
    expect(sides.filter((s) => s === 'cover')).toHaveLength(3)
  })

  test('kills the ScrollTrigger on unmount (desktop)', () => {
    wrapper = mountFeatures()
    wrapper.unmount()
    wrapper = undefined
    expect(mockKill).toHaveBeenCalled()
  })

  test('calls the stack teardown on unmount (mobile)', () => {
    width.value = 'mobile'
    wrapper = mountFeatures()
    wrapper.unmount()
    wrapper = undefined
    expect(mockStackTeardown).toHaveBeenCalled()
  })
})
