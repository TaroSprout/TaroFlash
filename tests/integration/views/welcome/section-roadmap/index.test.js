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

const UiOptionsPanelStub = defineComponent({
  name: 'UiOptionsPanel',
  props: ['entries', 'interactive'],
  inheritAttrs: false,
  setup(props, { slots, attrs }) {
    return () =>
      h(
        'div',
        { ...attrs },
        props.entries.map((entry) =>
          h(
            'div',
            {
              key: entry.value,
              'data-testid': 'options-panel__card',
              'data-value': entry.value
            },
            [slots.leading?.({ entry }), h('span', entry.label), slots.trailing?.({ entry })]
          )
        )
      )
  }
})

// ── Import ─────────────────────────────────────────────────────────────────────

import SectionRoadmap from '@/views/welcome/section-roadmap/index.vue'

// ── Mount helper ───────────────────────────────────────────────────────────────

function mountRoadmap() {
  return shallowMount(SectionRoadmap, {
    global: {
      stubs: {
        SectionHeader: SectionHeaderStub,
        UiIcon: UiIconStub,
        UiOptionsPanel: UiOptionsPanelStub
      }
    }
  })
}

// The roadmap items defined in the source
const ROADMAP_KEYS = [
  'build-study-decks',
  'dark-mode',
  'mobile-support',
  'import-export',
  'card-audio',
  'community',
  'challenges',
  'collect-rewards',
  'paperclips-shop',
  'bulk-edit'
]

const DONE_KEY = 'build-study-decks'
const UPCOMING_KEY = 'import-export'

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

  test('renders the roadmap list inside an options-panel', () => {
    const wrapper = mountRoadmap()
    expect(wrapper.find('[data-testid="welcome-roadmap__list"]').exists()).toBe(true)
  })

  test('passes interactive=false so the roadmap list is purely informational [obligation]', () => {
    const wrapper = mountRoadmap()
    const panel = wrapper.findComponent({ name: 'UiOptionsPanel' })
    expect(panel.props('interactive')).toBe(false)
  })

  // ── Item count ────────────────────────────────────────────────────────────

  test('renders 10 roadmap items', () => {
    const wrapper = mountRoadmap()
    const items = wrapper.findAll('[data-testid="options-panel__card"]')
    expect(items).toHaveLength(10)
  })

  test('renders each item by key', () => {
    const wrapper = mountRoadmap()
    for (const key of ROADMAP_KEYS) {
      expect(
        wrapper.find(`[data-testid="options-panel__card"][data-value="${key}"]`).exists()
      ).toBe(true)
    }
  })

  // ── Done item ─────────────────────────────────────────────────────────────

  test('done item shows the done-label text', () => {
    const wrapper = mountRoadmap()
    const doneItem = wrapper.find(`[data-testid="options-panel__card"][data-value="${DONE_KEY}"]`)
    expect(doneItem.text()).toContain('Done')
  })

  test('done item does not show the upcoming-label text', () => {
    const wrapper = mountRoadmap()
    const doneItem = wrapper.find(`[data-testid="options-panel__card"][data-value="${DONE_KEY}"]`)
    expect(doneItem.text()).not.toContain('Upcoming')
  })

  test('done item renders a check icon', () => {
    const wrapper = mountRoadmap()
    const doneItem = wrapper.find(`[data-testid="options-panel__card"][data-value="${DONE_KEY}"]`)
    const icon = doneItem.find('[data-testid="ui-icon"]')
    expect(icon.exists()).toBe(true)
    expect(icon.attributes('data-src')).toBe('check')
  })

  // ── Upcoming item ─────────────────────────────────────────────────────────

  test('upcoming item shows the upcoming-label text', () => {
    const wrapper = mountRoadmap()
    const upcomingItem = wrapper.find(
      `[data-testid="options-panel__card"][data-value="${UPCOMING_KEY}"]`
    )
    expect(upcomingItem.text()).toContain('Upcoming')
  })

  test('upcoming item does not show the done-label text', () => {
    const wrapper = mountRoadmap()
    const upcomingItem = wrapper.find(
      `[data-testid="options-panel__card"][data-value="${UPCOMING_KEY}"]`
    )
    expect(upcomingItem.text()).not.toContain('Done')
  })

  test('upcoming item does not render a check icon', () => {
    const wrapper = mountRoadmap()
    const upcomingItem = wrapper.find(
      `[data-testid="options-panel__card"][data-value="${UPCOMING_KEY}"]`
    )
    expect(upcomingItem.find('[data-testid="ui-icon"]').exists()).toBe(false)
  })
})
