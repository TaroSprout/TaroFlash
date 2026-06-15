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
})
