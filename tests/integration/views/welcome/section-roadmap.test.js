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

const UiImageStub = defineComponent({
  name: 'UiImage',
  props: ['src'],
  setup() {
    return () => h('img', { 'data-testid': 'ui-image' })
  }
})

// ── Import ─────────────────────────────────────────────────────────────────────

import SectionRoadmap from '@/views/welcome/section-roadmap.vue'

// ── Mount helper ───────────────────────────────────────────────────────────────

function mountRoadmap() {
  return shallowMount(SectionRoadmap, {
    global: {
      stubs: {
        SectionHeader: SectionHeaderStub,
        UiIcon: UiIconStub,
        UiImage: UiImageStub
      }
    }
  })
}

// The roadmap items defined in the source
const ROADMAP_KEYS = [
  'create-study',
  'card-audio',
  'community',
  'audio-reader',
  'daily-challenges',
  'metrics-rewards',
  'shop',
  'powerups'
]

const DONE_KEY = 'create-study'

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('SectionRoadmap', () => {
  // ── Structure ──────────────────────────────────────────────────────────────

  test('renders the roadmap section container', () => {
    const wrapper = mountRoadmap()
    expect(wrapper.find('[data-testid="welcome-roadmap"]').exists()).toBe(true)
  })

  test('renders the section header', () => {
    const wrapper = mountRoadmap()
    expect(wrapper.find('[data-testid="section-header"]').exists()).toBe(true)
  })

  test('renders the roadmap list', () => {
    const wrapper = mountRoadmap()
    expect(wrapper.find('[data-testid="welcome-roadmap__list"]').exists()).toBe(true)
  })

  // ── Item count ────────────────────────────────────────────────────────────

  test('renders 9 roadmap items', () => {
    const wrapper = mountRoadmap()
    const items = wrapper.findAll('[data-testid^="welcome-roadmap__item-"]')
    expect(items).toHaveLength(9)
  })

  test('renders each item by key', () => {
    const wrapper = mountRoadmap()
    for (const key of ROADMAP_KEYS) {
      expect(wrapper.find(`[data-testid="welcome-roadmap__item-${key}"]`).exists()).toBe(true)
    }
  })

  // ── Done item (create-study) ───────────────────────────────────────────────

  test('done item shows the done-label text', () => {
    const wrapper = mountRoadmap()
    const doneItem = wrapper.find(`[data-testid="welcome-roadmap__item-${DONE_KEY}"]`)
    expect(doneItem.text()).toContain('Done')
  })

  test('done item does not show the upcoming-label text', () => {
    const wrapper = mountRoadmap()
    const doneItem = wrapper.find(`[data-testid="welcome-roadmap__item-${DONE_KEY}"]`)
    expect(doneItem.text()).not.toContain('Upcoming')
  })

  // ── Upcoming item (any non-done key) ──────────────────────────────────────

  test('upcoming item shows the upcoming-label text', () => {
    const wrapper = mountRoadmap()
    const upcomingItem = wrapper.find('[data-testid="welcome-roadmap__item-card-audio"]')
    expect(upcomingItem.text()).toContain('Upcoming')
  })

  test('upcoming item does not show the done-label text', () => {
    const wrapper = mountRoadmap()
    const upcomingItem = wrapper.find('[data-testid="welcome-roadmap__item-card-audio"]')
    expect(upcomingItem.text()).not.toContain('Done')
  })

  test('done item renders a check icon', () => {
    const wrapper = mountRoadmap()
    const doneItem = wrapper.find(`[data-testid="welcome-roadmap__item-${DONE_KEY}"]`)
    const icon = doneItem.find('[data-testid="ui-icon"]')
    expect(icon.exists()).toBe(true)
    expect(icon.attributes('data-src')).toBe('check')
  })

  test('upcoming item does not render a check icon', () => {
    const wrapper = mountRoadmap()
    const upcomingItem = wrapper.find('[data-testid="welcome-roadmap__item-card-audio"]')
    expect(upcomingItem.find('[data-testid="ui-icon"]').exists()).toBe(false)
  })
})
