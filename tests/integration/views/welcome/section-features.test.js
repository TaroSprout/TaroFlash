import { describe, test, expect } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

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
  props: ['feature_key', 'icon', 'accent', 'accent_dark'],
  setup(props) {
    return () =>
      h('div', {
        'data-testid': `feature-card-stub`,
        'data-feature-key': props.feature_key
      })
  }
})

// ── Import ─────────────────────────────────────────────────────────────────────

import SectionFeatures from '@/views/welcome/section-features/index.vue'

// ── Mount helper ───────────────────────────────────────────────────────────────

function mountFeatures() {
  return shallowMount(SectionFeatures, {
    global: {
      stubs: {
        SectionHeader: SectionHeaderStub,
        FeatureCard: FeatureCardStub
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

  test('section header is rendered without eyebrow prop [obligation]', () => {
    const wrapper = mountFeatures()
    const headerComponent = wrapper.findComponent({ name: 'SectionHeader' })
    expect(headerComponent.props('eyebrow')).toBeUndefined()
  })

  // ── Feature card list ──────────────────────────────────────────────────────

  test('renders the feature card row list [obligation]', () => {
    const wrapper = mountFeatures()
    expect(wrapper.find('[data-testid="welcome-features__row"]').exists()).toBe(true)
  })

  test('renders exactly 4 feature cards [obligation]', () => {
    const wrapper = mountFeatures()
    const items = wrapper.findAll('[data-testid^="welcome-features__card-"]')
    expect(items).toHaveLength(4)
  })

  test('renders experience card with correct testid [obligation]', () => {
    const wrapper = mountFeatures()
    expect(wrapper.find('[data-testid="welcome-features__card-experience"]').exists()).toBe(true)
  })

  test('renders mobile card with correct testid [obligation]', () => {
    const wrapper = mountFeatures()
    expect(wrapper.find('[data-testid="welcome-features__card-mobile"]').exists()).toBe(true)
  })

  test('renders scheduling card with correct testid [obligation]', () => {
    const wrapper = mountFeatures()
    expect(wrapper.find('[data-testid="welcome-features__card-scheduling"]').exists()).toBe(true)
  })

  test('renders upcoming card with correct testid [obligation]', () => {
    const wrapper = mountFeatures()
    expect(wrapper.find('[data-testid="welcome-features__card-upcoming"]').exists()).toBe(true)
  })

  test('does NOT render old portable card [obligation]', () => {
    const wrapper = mountFeatures()
    expect(wrapper.find('[data-testid="welcome-features__card-portable"]').exists()).toBe(false)
  })

  test('renders cards in correct order: experience, mobile, scheduling, upcoming [obligation]', () => {
    const wrapper = mountFeatures()
    const items = wrapper.findAll('[data-testid^="welcome-features__card-"]')
    expect(items[0].attributes('data-testid')).toBe('welcome-features__card-experience')
    expect(items[1].attributes('data-testid')).toBe('welcome-features__card-mobile')
    expect(items[2].attributes('data-testid')).toBe('welcome-features__card-scheduling')
    expect(items[3].attributes('data-testid')).toBe('welcome-features__card-upcoming')
  })
})
