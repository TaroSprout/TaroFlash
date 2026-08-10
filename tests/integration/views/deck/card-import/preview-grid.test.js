import { describe, test, expect, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { ref } from 'vue'

const { useCardGridMock } = vi.hoisted(() => ({ useCardGridMock: vi.fn() }))
vi.mock('@/views/deck/card-grid/use-card-grid', async (importOriginal) => {
  const actual = await importOriginal()
  useCardGridMock.mockImplementation(actual.useCardGrid)
  return { useCardGrid: (...args) => useCardGridMock(...args) }
})

import PreviewGrid from '@/views/deck/card-import/preview-grid.vue'
import { cardEditorKey } from '@/views/deck/composables'
import { cardImportKey } from '@/views/deck/composables/card-import'
import { deckViewShellKey } from '@/views/deck/composables/view-shell'

function mount(cards = []) {
  return shallowMount(PreviewGrid, {
    global: {
      provide: {
        [cardEditorKey]: { card_attributes: ref({ front: {}, back: {} }) },
        [deckViewShellKey]: { grid_size: ref('md') },
        [cardImportKey]: { cards: ref(cards) }
      }
    }
  })
}

describe('card-import/preview-grid', () => {
  test('renders the grid root and viewport', () => {
    const wrapper = mount([])
    expect(wrapper.find('[data-testid="card-import-preview-grid"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="card-import-preview-grid__viewport"]').exists()).toBe(true)
  })

  test('renders one item per card, front side only', async () => {
    const wrapper = mount([
      { front_text: 'q1', back_text: 'a1' },
      { front_text: 'q2', back_text: 'a2' },
      { front_text: 'q3', back_text: 'a3' }
    ])
    await wrapper.vm.$nextTick()
    const items = wrapper.findAll('[data-testid="card-import-preview-grid__item"]')
    expect(items).toHaveLength(3)
    const cardComponent = items[0].findComponent({ name: 'Card' })
    expect(cardComponent.props('side')).toBe('front')
    expect(cardComponent.props('front_text')).toBe('q1')
  })

  test('renders no items when there are no cards', () => {
    const wrapper = mount([])
    expect(wrapper.findAll('[data-testid="card-import-preview-grid__item"]')).toHaveLength(0)
  })

  // ── Fixed sizing, ignoring the deck's saved grid_size [obligation] ────────

  test('sizes cards at a fixed md, ignoring a saved grid_size of xl [obligation]', () => {
    useCardGridMock.mockClear()
    shallowMount(PreviewGrid, {
      global: {
        provide: {
          [cardEditorKey]: { card_attributes: ref({ front: {}, back: {} }) },
          [deckViewShellKey]: { grid_size: ref('xl') },
          [cardImportKey]: { cards: ref([]) }
        }
      }
    })

    expect(useCardGridMock).toHaveBeenCalled()
    expect(useCardGridMock.mock.calls[0][0]).toBe('md')
  })
})
