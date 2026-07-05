import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, nextTick, shallowRef } from 'vue'
import { welcomeWidthKey } from '@/views/welcome/welcome-layout'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mockCreateFeatureReveal, mockKill } = vi.hoisted(() => {
  const mockKill = vi.fn()
  return {
    mockKill,
    mockCreateFeatureReveal: vi.fn(() => ({ kill: mockKill }))
  }
})

// width is provided via injection as a reactive ref so the component's
// watch(width, ...) has a valid source. Set .value before each mount.
const width = shallowRef('desktop')

vi.mock('@/utils/animations/welcome/feature-reveal', () => ({
  createFeatureReveal: mockCreateFeatureReveal
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
    mockKill.mockClear()
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

  // [obligation] mobile now takes the exact same grid-reveal code path as tablet —
  // no more createStackReveal / deck-stack branch.
  test('wires two reveal triggers on mobile, one per grid row — same as tablet [obligation]', () => {
    width.value = 'mobile'
    wrapper = mountFeatures()
    expect(mockCreateFeatureReveal).toHaveBeenCalledTimes(2)
    const firstIndices = mockCreateFeatureReveal.mock.calls[0][1]
    const secondIndices = mockCreateFeatureReveal.mock.calls[1][1]
    expect(firstIndices).toEqual([0, 1])
    expect(secondIndices).toEqual([2, 3])
  })

  test('mobile and tablet group the same trigger elements (leading li of each row) [obligation]', () => {
    width.value = 'tablet'
    wrapper = mountFeatures()
    const tabletTriggers = mockCreateFeatureReveal.mock.calls.map(([trigger]) => trigger)
    wrapper.unmount()

    width.value = 'mobile'
    mockCreateFeatureReveal.mockClear()
    wrapper = mountFeatures()
    const mobileTriggers = mockCreateFeatureReveal.mock.calls.map(([trigger]) => trigger)

    expect(mobileTriggers).toHaveLength(tabletTriggers.length)
    mobileTriggers.forEach((trigger) => expect(trigger).toBeInstanceOf(HTMLElement))
  })

  // [obligation] setActive on mobile flips the card exactly like desktop/tablet —
  // no activeIndex / data-active semantics remain.
  test('setActive(index, true) flips the card to front on mobile [obligation]', async () => {
    width.value = 'mobile'
    wrapper = mountFeatures()
    const setActive = mockCreateFeatureReveal.mock.calls[0][2]

    setActive(1, true)
    await nextTick()

    const sides = wrapper
      .findAll('[data-testid="feature-card-stub"]')
      .map((c) => c.attributes('data-side'))
    expect(sides).toEqual(['cover', 'front', 'cover', 'cover'])
  })

  // [obligation] the removed deck-stack markup/attrs never appear, on any width
  test.each(['desktop', 'tablet', 'mobile'])(
    'renders no data-stack or data-active attributes on %s [obligation]',
    (w) => {
      width.value = w
      wrapper = mountFeatures()

      expect(wrapper.find('[data-testid="welcome-features__row"]').attributes('data-stack')).toBe(
        undefined
      )
      const items = wrapper.findAll('[data-testid^="welcome-features__card-"]')
      items.forEach((item) => expect(item.attributes('data-active')).toBe(undefined))
    }
  )

  test('kills the ScrollTrigger on unmount (desktop)', () => {
    wrapper = mountFeatures()
    wrapper.unmount()
    wrapper = undefined
    expect(mockKill).toHaveBeenCalled()
  })

  test('kills the ScrollTrigger on unmount (mobile) [obligation]', () => {
    width.value = 'mobile'
    wrapper = mountFeatures()
    wrapper.unmount()
    wrapper = undefined
    expect(mockKill).toHaveBeenCalled()
  })
})
