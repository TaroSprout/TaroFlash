import { describe, test, expect } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import DestinationNote from '@/views/deck/card-import/destination-note.vue'

describe('card-import/destination-note', () => {
  test('renders non-empty translated text (deck-view.card-import.destination is wired)', () => {
    const wrapper = shallowMount(DestinationNote)
    const el = wrapper.find('[data-testid="card-import-destination"]')
    expect(el.exists()).toBe(true)
    expect(el.text().length).toBeGreaterThan(0)
  })
})
