import { describe, test, expect, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'

// GSAP pulled in transitively via Card
vi.mock('gsap', () => ({ gsap: { fromTo: vi.fn(), to: vi.fn() } }))

import ReviewInboxItem from '@/views/dashboard/review-inbox-item.vue'

function mount(deck) {
  return shallowMount(ReviewInboxItem, {
    props: { deck },
    global: { directives: { sfx: {} } }
  })
}

describe('ReviewInboxItem', () => {
  test('renders the root element with testid', () => {
    const wrapper = mount({ id: 1, cover_config: undefined, due_count: 3 })
    expect(wrapper.find('[data-testid="review-inbox-item"]').exists()).toBe(true)
  })

  test('renders a Card component with side=cover and the deck cover_config', () => {
    const cover_config = { theme: 'blue-500', pattern: 'stars' }
    const wrapper = mount({ id: 1, cover_config, due_count: 3 })
    const card = wrapper.findComponent({ name: 'Card' })
    expect(card.props('side')).toBe('cover')
    expect(card.props('cover_config')).toEqual(cover_config)
  })

  test('shows the due_count badge', () => {
    const wrapper = mount({ id: 1, due_count: 7 })
    expect(wrapper.find('[data-testid="review-inbox-item__due-badge"]').text()).toBe('7')
  })
})
