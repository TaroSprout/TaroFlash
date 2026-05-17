import { describe, test, expect } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'

import Details from '@/views/deck/deck-hero/details.vue'

function mount(deck = {}) {
  return shallowMount(Details, {
    props: { deck: { id: 1, title: 'd', card_count: 10, ...deck } }
  })
}

describe('deck-hero/details', () => {
  test('renders the deck description', () => {
    const wrapper = mount({ description: 'My description' })
    expect(wrapper.find('[data-testid="overview-panel__description"]').text()).toBe(
      'My description'
    )
  })

  test('renders the member display name', () => {
    const wrapper = mount({ member_display_name: 'Alice' })
    expect(wrapper.text()).toContain('Alice')
  })

  test('renders the card_count in the cards-in-deck label', () => {
    const wrapper = mount({ card_count: 17 })
    expect(wrapper.text()).toContain('17 cards in deck')
  })

  test('falls back to 0 when card_count is missing', () => {
    const wrapper = mount({ card_count: undefined })
    expect(wrapper.text()).toContain('0 cards in deck')
  })
})
