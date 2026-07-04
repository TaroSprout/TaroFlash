import { describe, test, expect } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { h } from 'vue'

import GroupedList from '@/components/layout-kit/grouped-list.vue'

describe('GroupedList', () => {
  test('always renders the default slot content inside the container', () => {
    const wrapper = mount(GroupedList, {
      slots: { default: () => h('span', { 'data-testid': 'default-content' }, 'rows') }
    })
    expect(wrapper.find('[data-testid="grouped-list"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="default-content"]').exists()).toBe(true)
  })

  test('does not render the overlay wrapper when no overlay slot is provided', () => {
    const wrapper = mount(GroupedList, {
      slots: { default: () => h('span', 'rows') }
    })
    expect(wrapper.find('[data-testid="grouped-list__overlay"]').exists()).toBe(false)
  })

  test('renders the overlay wrapper and its content when the overlay slot is provided', () => {
    const wrapper = mount(GroupedList, {
      slots: {
        default: () => h('span', 'rows'),
        overlay: () => h('div', { 'data-testid': 'overlay-content' }, 'overlay')
      }
    })
    expect(wrapper.find('[data-testid="grouped-list__overlay"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="overlay-content"]').exists()).toBe(true)
  })

  // ── content data-testid derivation ───────────────────────────────────────

  test('content div falls back to grouped-list__content when caller passes no data-testid [obligation]', () => {
    const wrapper = mount(GroupedList, {
      slots: { default: () => h('span', 'rows') }
    })
    expect(wrapper.find('[data-testid="grouped-list__content"]').exists()).toBe(true)
  })

  test('content div is derived as `${data-testid}__content` when caller passes data-testid [obligation]', () => {
    const wrapper = mount(GroupedList, {
      attrs: { 'data-testid': 'move-cards__deck-list' },
      slots: { default: () => h('span', 'rows') }
    })
    expect(wrapper.find('[data-testid="move-cards__deck-list__content"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="grouped-list__content"]').exists()).toBe(false)
  })

  // ── scrollable prop ───────────────────────────────────────────────────────
  // Note: `scrollable` has no dedicated data attribute — asserting the
  // overflow utility class is a pragmatic exception to the no-class-name
  // convention for this boolean layout toggle (flagged in the test report).

  test('content div clips overflow by default (scrollable unset) [obligation]', () => {
    const wrapper = mount(GroupedList, {
      slots: { default: () => h('span', 'rows') }
    })
    const content = wrapper.find('[data-testid="grouped-list__content"]')
    expect(content.classes()).toContain('overflow-hidden')
    expect(content.classes()).not.toContain('overflow-y-auto')
  })

  test('content div scrolls internally when scrollable=true [obligation]', () => {
    const wrapper = mount(GroupedList, {
      props: { scrollable: true },
      slots: { default: () => h('span', 'rows') }
    })
    const content = wrapper.find('[data-testid="grouped-list__content"]')
    expect(content.classes()).toContain('overflow-y-auto')
    expect(content.classes()).not.toContain('overflow-hidden')
  })
})
