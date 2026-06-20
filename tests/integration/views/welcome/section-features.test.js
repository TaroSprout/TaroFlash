import { describe, test, expect } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

// ── Stubs ──────────────────────────────────────────────────────────────────────

const SectionHeaderStub = defineComponent({
  name: 'SectionHeader',
  props: ['eyebrow', 'heading'],
  setup(props) {
    return () => h('div', { 'data-testid': 'section-header' }, props.heading)
  }
})

const UiIconStub = defineComponent({
  name: 'UiIcon',
  props: ['src'],
  setup(props) {
    return () => h('span', { 'data-testid': 'ui-icon', 'data-src': props.src })
  }
})

// ── Import ─────────────────────────────────────────────────────────────────────

import SectionFeatures from '@/views/welcome/section-features.vue'

// ── Mount helper ───────────────────────────────────────────────────────────────

function mountFeatures() {
  return shallowMount(SectionFeatures, {
    global: {
      stubs: {
        SectionHeader: SectionHeaderStub,
        UiIcon: UiIconStub
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

  test('renders the features grid', () => {
    const wrapper = mountFeatures()
    expect(wrapper.find('[data-testid="welcome-features__grid"]').exists()).toBe(true)
  })

  // ── Feature cards ──────────────────────────────────────────────────────────

  test('renders all 6 feature cards', () => {
    const wrapper = mountFeatures()
    const keys = ['editor', 'study', 'cards', 'scheduling', 'portable', 'mobile']
    for (const key of keys) {
      expect(wrapper.find(`[data-testid="welcome-features__card-${key}"]`).exists()).toBe(true)
    }
  })

  test('editor card renders its heading', () => {
    const wrapper = mountFeatures()
    const card = wrapper.find('[data-testid="welcome-features__card-editor"]')
    expect(card.text()).toContain('A simple, flexible editor')
  })

  test('study card renders its heading', () => {
    const wrapper = mountFeatures()
    const card = wrapper.find('[data-testid="welcome-features__card-study"]')
    expect(card.text()).toContain('Calm study sessions')
  })

  test('cards card renders its heading', () => {
    const wrapper = mountFeatures()
    const card = wrapper.find('[data-testid="welcome-features__card-cards"]')
    expect(card.text()).toContain('Cards that feel like cards')
  })

  test('scheduling card renders its heading', () => {
    const wrapper = mountFeatures()
    const card = wrapper.find('[data-testid="welcome-features__card-scheduling"]')
    expect(card.text()).toContain('Spaced repetition, quietly')
  })

  test('portable card renders its heading', () => {
    const wrapper = mountFeatures()
    const card = wrapper.find('[data-testid="welcome-features__card-portable"]')
    expect(card.text()).toContain('Yours, and portable')
  })

  test('mobile card renders its heading', () => {
    const wrapper = mountFeatures()
    const card = wrapper.find('[data-testid="welcome-features__card-mobile"]')
    expect(card.text()).toContain('Made for on the go')
  })
})
