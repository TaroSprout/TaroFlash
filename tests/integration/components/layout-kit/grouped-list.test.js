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
})
