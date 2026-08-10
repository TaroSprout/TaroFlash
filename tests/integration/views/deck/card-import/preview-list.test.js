import { describe, test, expect } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { ref } from 'vue'
import PreviewList from '@/views/deck/card-import/preview-list.vue'
import { cardEditorKey } from '@/views/deck/composables'
import { cardImportKey } from '@/views/deck/composables/card-import'

function mount(cards = []) {
  return shallowMount(PreviewList, {
    global: {
      provide: {
        [cardEditorKey]: { card_attributes: ref({ front: {}, back: {} }) },
        [cardImportKey]: { cards: ref(cards) }
      }
    }
  })
}

describe('card-import/preview-list', () => {
  test('renders the list root and viewport', () => {
    const wrapper = mount([])
    expect(wrapper.find('[data-testid="card-import-preview-list"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="card-import-preview-list__viewport"]').exists()).toBe(true)
  })

  test('renders one row per card, front and back side by side', () => {
    const wrapper = mount([
      { front_text: 'q1', back_text: 'a1' },
      { front_text: 'q2', back_text: 'a2' }
    ])
    const rows = wrapper.findAll('[data-testid="card-import-preview-list__row"]')
    expect(rows).toHaveLength(2)
    const cardsInFirstRow = rows[0].findAllComponents({ name: 'Card' })
    expect(cardsInFirstRow).toHaveLength(2)
    expect(cardsInFirstRow[0].props('side')).toBe('front')
    expect(cardsInFirstRow[1].props('side')).toBe('back')
    expect(cardsInFirstRow[0].props('front_text')).toBe('q1')
  })

  test('renders no rows when there are no cards', () => {
    const wrapper = mount([])
    expect(wrapper.findAll('[data-testid="card-import-preview-list__row"]')).toHaveLength(0)
  })
})
