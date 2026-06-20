import { describe, test, expect } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

// ── Stubs ──────────────────────────────────────────────────────────────────────

const SectionHeaderStub = defineComponent({
  name: 'SectionHeader',
  props: ['eyebrow', 'heading', 'subtitle'],
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

const CardStub = defineComponent({
  name: 'Card',
  props: ['side', 'size', 'cover_config'],
  setup() {
    return () => h('div', { 'data-testid': 'card-stub' })
  }
})

// ── Import ─────────────────────────────────────────────────────────────────────

import SectionConfig from '@/views/welcome/section-config.vue'

// ── Mount helper ───────────────────────────────────────────────────────────────

function mountConfig() {
  return shallowMount(SectionConfig, {
    global: {
      stubs: {
        SectionHeader: SectionHeaderStub,
        UiIcon: UiIconStub,
        Card: CardStub
      }
    }
  })
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('SectionConfig', () => {
  // ── Structure ──────────────────────────────────────────────────────────────

  test('renders the config section container', () => {
    const wrapper = mountConfig()
    expect(wrapper.find('[data-testid="welcome-config"]').exists()).toBe(true)
  })

  test('renders the section header', () => {
    const wrapper = mountConfig()
    expect(wrapper.find('[data-testid="section-header"]').exists()).toBe(true)
  })

  test('renders the config grid', () => {
    const wrapper = mountConfig()
    expect(wrapper.find('[data-testid="welcome-config__grid"]').exists()).toBe(true)
  })

  // ── Three config cards ─────────────────────────────────────────────────────

  test('renders the cover card', () => {
    const wrapper = mountConfig()
    expect(wrapper.find('[data-testid="welcome-config__card-cover"]').exists()).toBe(true)
  })

  test('renders the layout card', () => {
    const wrapper = mountConfig()
    expect(wrapper.find('[data-testid="welcome-config__card-layout"]').exists()).toBe(true)
  })

  test('renders the scheduling card', () => {
    const wrapper = mountConfig()
    expect(wrapper.find('[data-testid="welcome-config__card-scheduling"]').exists()).toBe(true)
  })

  // ── Card headings ──────────────────────────────────────────────────────────

  test('cover card contains its heading text', () => {
    const wrapper = mountConfig()
    const card = wrapper.find('[data-testid="welcome-config__card-cover"]')
    expect(card.text()).toContain('Deck Cover')
  })

  test('layout card contains its heading text', () => {
    const wrapper = mountConfig()
    const card = wrapper.find('[data-testid="welcome-config__card-layout"]')
    expect(card.text()).toContain('Card Layout')
  })

  test('scheduling card contains its heading text', () => {
    const wrapper = mountConfig()
    const card = wrapper.find('[data-testid="welcome-config__card-scheduling"]')
    expect(card.text()).toContain('Review Scheduling')
  })

  // ── Footnote ───────────────────────────────────────────────────────────────

  test('renders the footnote', () => {
    const wrapper = mountConfig()
    expect(wrapper.find('[data-testid="welcome-config__footnote"]').exists()).toBe(true)
  })

  test('footnote contains expected text', () => {
    const wrapper = mountConfig()
    const footnote = wrapper.find('[data-testid="welcome-config__footnote"]')
    expect(footnote.text()).toContain('sensible default')
  })

  // ── Decorative visuals ─────────────────────────────────────────────────────

  test('renders the cover visual area', () => {
    const wrapper = mountConfig()
    expect(wrapper.find('[data-testid="welcome-config__visual-cover"]').exists()).toBe(true)
  })

  test('renders the layout visual area', () => {
    const wrapper = mountConfig()
    expect(wrapper.find('[data-testid="welcome-config__visual-layout"]').exists()).toBe(true)
  })

  test('renders the scheduling visual area', () => {
    const wrapper = mountConfig()
    expect(wrapper.find('[data-testid="welcome-config__visual-scheduling"]').exists()).toBe(true)
  })
})
