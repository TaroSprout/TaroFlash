import { describe, test, expect, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, shallowRef } from 'vue'
import { welcomeWidthKey } from '@/views/welcome/welcome-layout'

// ── Mocks (animations are irrelevant for structure tests) ──────────────────────

vi.mock('@/utils/animations/welcome/feature-reveal', () => ({
  createFeatureReveal: vi.fn(() => ({ kill: vi.fn() }))
}))

// ── Stubs ──────────────────────────────────────────────────────────────────────

const SectionHeaderStub = defineComponent({
  name: 'SectionHeader',
  props: ['heading', 'subtitle'],
  setup(props) {
    return () => h('div', { 'data-testid': 'section-header', 'data-heading': props.heading })
  }
})

const FeatureCardStub = defineComponent({
  name: 'FeatureCard',
  props: ['feature_key', 'icon', 'cover'],
  setup(props) {
    return () =>
      h('div', {
        'data-testid': 'feature-card-stub',
        'data-feature-key': props.feature_key
      })
  }
})

// ── Import ─────────────────────────────────────────────────────────────────────

import SectionFeatures from '@/views/welcome/section-features/index.vue'

// ── Mount helper ───────────────────────────────────────────────────────────────

// Provide a reactive width so useWelcomeWidth() injection resolves.
const width = shallowRef('desktop')

function mountFeatures() {
  return shallowMount(SectionFeatures, {
    props: { seeRoadmap: vi.fn() },
    global: {
      provide: { [welcomeWidthKey]: width },
      stubs: {
        SectionHeader: SectionHeaderStub,
        FeatureCard: FeatureCardStub,
        CommunityCallout: true
      }
    }
  })
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('SectionFeatures', () => {
  // ── Structure ──────────────────────────────────────────────────────────────

  test('renders the features section container', () => {
    const wrapper = mountFeatures()
    expect(wrapper.find('[data-testid="welcome-features"]').exists()).toBe(true)
  })

  test('renders the section header', () => {
    const wrapper = mountFeatures()
    expect(wrapper.find('[data-testid="section-header"]').exists()).toBe(true)
  })

  test('section header receives resolved heading text', () => {
    const wrapper = mountFeatures()
    const header = wrapper.find('[data-testid="section-header"]')
    expect(header.attributes('data-heading')).toBe('A Flashcard App At Heart')
  })

  test('section header is rendered without eyebrow prop', () => {
    const wrapper = mountFeatures()
    const headerComponent = wrapper.findComponent({ name: 'SectionHeader' })
    expect(headerComponent.props('eyebrow')).toBeUndefined()
  })

  // ── Feature card list ──────────────────────────────────────────────────────

  test('renders the feature card row list', () => {
    const wrapper = mountFeatures()
    expect(wrapper.find('[data-testid="welcome-features__row"]').exists()).toBe(true)
  })

  test('renders exactly 4 feature cards', () => {
    const wrapper = mountFeatures()
    const items = wrapper.findAll('[data-testid^="welcome-features__card-"]')
    expect(items).toHaveLength(4)
  })

  test('renders experience card with correct testid', () => {
    const wrapper = mountFeatures()
    expect(wrapper.find('[data-testid="welcome-features__card-experience"]').exists()).toBe(true)
  })

  test('renders mobile card with correct testid', () => {
    const wrapper = mountFeatures()
    expect(wrapper.find('[data-testid="welcome-features__card-mobile"]').exists()).toBe(true)
  })

  test('renders scheduling card with correct testid', () => {
    const wrapper = mountFeatures()
    expect(wrapper.find('[data-testid="welcome-features__card-scheduling"]').exists()).toBe(true)
  })

  test('renders upcoming card with correct testid', () => {
    const wrapper = mountFeatures()
    expect(wrapper.find('[data-testid="welcome-features__card-upcoming"]').exists()).toBe(true)
  })

  test('does NOT render old portable card', () => {
    const wrapper = mountFeatures()
    expect(wrapper.find('[data-testid="welcome-features__card-portable"]').exists()).toBe(false)
  })

  test('renders cards in correct order: experience, mobile, scheduling, upcoming', () => {
    const wrapper = mountFeatures()
    const items = wrapper.findAll('[data-testid^="welcome-features__card-"]')
    expect(items[0].attributes('data-testid')).toBe('welcome-features__card-experience')
    expect(items[1].attributes('data-testid')).toBe('welcome-features__card-mobile')
    expect(items[2].attributes('data-testid')).toBe('welcome-features__card-scheduling')
    expect(items[3].attributes('data-testid')).toBe('welcome-features__card-upcoming')
  })

  // ── seeRoadmap prop forwarding ────────────────────────────────

  test('renders community callout (via stub)', () => {
    const wrapper = mountFeatures()
    // CommunityCallout is stubbed; verify the component is present
    expect(wrapper.findComponent({ name: 'CommunityCallout' }).exists()).toBe(true)
  })

  // ── row layout: mobile now reuses tablet's exact grid classes ─

  test('renders the same 2-column grid classes on mobile and tablet', () => {
    width.value = 'tablet'
    const tablet_classes = mountFeatures().find('[data-testid="welcome-features__row"]').classes()

    width.value = 'mobile'
    const mobile_classes = mountFeatures().find('[data-testid="welcome-features__row"]').classes()

    expect(mobile_classes).toEqual(tablet_classes)
    expect(mobile_classes).toEqual(expect.arrayContaining(['grid', 'grid-cols-[auto_auto]']))
  })

  test('renders a single-row flex layout on desktop, distinct from mobile/tablet', () => {
    width.value = 'desktop'
    const desktop_classes = mountFeatures().find('[data-testid="welcome-features__row"]').classes()
    expect(desktop_classes).toEqual(expect.arrayContaining(['flex', 'flex-wrap']))
    expect(desktop_classes).not.toContain('grid')
  })

  // ── removed deck-stack markup never appears ───────────────────

  test('does not render a data-stack attribute on the row for any width', () => {
    for (const w of ['desktop', 'tablet', 'mobile']) {
      width.value = w
      const wrapper = mountFeatures()
      expect(wrapper.find('[data-testid="welcome-features__row"]').attributes('data-stack')).toBe(
        undefined
      )
    }
  })

  test('does not render a data-active attribute on any card for any width', () => {
    for (const w of ['desktop', 'tablet', 'mobile']) {
      width.value = w
      const wrapper = mountFeatures()
      const items = wrapper.findAll('[data-testid^="welcome-features__card-"]')
      items.forEach((item) => expect(item.attributes('data-active')).toBe(undefined))
    }
  })
})
