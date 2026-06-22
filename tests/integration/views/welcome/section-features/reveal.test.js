import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'

// Force the desktop branch and stub the GSAP-backed reveal so onMounted's
// ScrollTrigger wiring runs without touching real GSAP/scroll.
const { desktop, mockCreateFeatureReveal, mockKill } = vi.hoisted(() => ({
  desktop: { value: true },
  mockKill: vi.fn(),
  mockCreateFeatureReveal: vi.fn(() => ({ kill: mockKill }))
}))

vi.mock('@/composables/ui/media-query', () => ({ useMatchMedia: () => desktop }))
vi.mock('@/utils/animations/welcome/feature-reveal', () => ({
  createFeatureReveal: mockCreateFeatureReveal
}))

const FeatureCardStub = defineComponent({
  name: 'FeatureCard',
  props: ['feature_key', 'side'],
  setup(props) {
    return () =>
      h('div', {
        'data-testid': `feature-card-stub`,
        'data-feature-key': props.feature_key,
        'data-side': props.side
      })
  }
})

import SectionFeatures from '@/views/welcome/section-features/index.vue'

function mountFeatures() {
  return shallowMount(SectionFeatures, {
    attachTo: document.body,
    props: { seeRoadmap: vi.fn() },
    global: { stubs: { SectionHeader: true, FeatureCard: FeatureCardStub } }
  })
}

describe('SectionFeatures scroll-flip reveal (desktop)', () => {
  beforeEach(() => {
    desktop.value = true
    mockCreateFeatureReveal.mockClear()
    mockKill.mockClear()
  })

  test('wires a ScrollTrigger reveal on the row for all cards on desktop', () => {
    mountFeatures()
    expect(mockCreateFeatureReveal).toHaveBeenCalledTimes(1)
    const [triggerEl, count] = mockCreateFeatureReveal.mock.calls[0]
    expect(triggerEl).toBeInstanceOf(HTMLElement)
    expect(count).toBe(4)
  })

  test('cards start on the cover side on desktop', () => {
    const wrapper = mountFeatures()
    const sides = wrapper
      .findAll('[data-testid="feature-card-stub"]')
      .map((c) => c.attributes('data-side'))
    expect(sides).toEqual(['cover', 'cover', 'cover', 'cover'])
  })

  test('the reveal callback flips the addressed card to the given side', async () => {
    const wrapper = mountFeatures()
    const setSide = mockCreateFeatureReveal.mock.calls[0][2]

    setSide(1, 'front')
    await nextTick()

    const sides = wrapper
      .findAll('[data-testid="feature-card-stub"]')
      .map((c) => c.attributes('data-side'))
    expect(sides).toEqual(['cover', 'front', 'cover', 'cover'])
  })

  test('does not wire a reveal on mobile — front shown directly', () => {
    desktop.value = false
    const wrapper = mountFeatures()
    expect(mockCreateFeatureReveal).not.toHaveBeenCalled()
    const sides = wrapper
      .findAll('[data-testid="feature-card-stub"]')
      .map((c) => c.attributes('data-side'))
    expect(sides).toEqual(['front', 'front', 'front', 'front'])
  })

  test('kills the ScrollTrigger on unmount', () => {
    const wrapper = mountFeatures()
    wrapper.unmount()
    expect(mockKill).toHaveBeenCalled()
  })
})
