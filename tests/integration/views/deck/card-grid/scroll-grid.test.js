import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'

const GridItemStub = defineComponent({
  name: 'GridItem',
  props: ['card', 'side', 'scale', 'card_attributes', 'selected'],
  setup(props) {
    return () =>
      h('div', {
        'data-testid': 'grid-item-stub',
        'data-card-id': props.card?.id,
        'data-scale': String(props.scale),
        'data-selected': String(props.selected)
      })
  }
})

import ScrollGrid from '@/views/deck/card-grid/scroll-grid.vue'
import { cardEditorKey } from '@/composables/card-editor/card-list-controller'
import { deckViewShellKey } from '@/composables/card-editor/deck-view-shell'

function makeEditor({
  all_cards = [],
  card_attributes = ref({ front: {}, back: {} }),
  hasNextPage = false,
  isLoading = false,
  observeSentinel = vi.fn()
} = {}) {
  return {
    list: { all_cards: ref(all_cards) },
    selection: { isCardSelected: vi.fn().mockReturnValue(false) },
    card_attributes,
    hasNextPage: ref(hasNextPage),
    isLoading: ref(isLoading),
    observeSentinel
  }
}

function makeShell({ grid_size = 'md' } = {}) {
  return { grid_size: ref(grid_size) }
}

function mountScrollGrid(editor = makeEditor(), shell = makeShell()) {
  return shallowMount(ScrollGrid, {
    global: {
      provide: { [cardEditorKey]: editor, [deckViewShellKey]: shell },
      stubs: { GridItem: GridItemStub }
    }
  })
}

describe('card-grid/scroll-grid', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  // ── grid_size → gridTemplateColumns track width ───────────────────────────

  test('grid style scales the xl track to 0.6 for grid_size="base" [obligation]', () => {
    const wrapper = mountScrollGrid(makeEditor(), makeShell({ grid_size: 'base' }))
    expect(wrapper.find('[data-testid="card-grid"]').attributes('style')).toContain(
      'grid-template-columns: repeat(auto-fill, 188.4px)'
    )
  })

  test('grid style scales the xl track to 0.75 for grid_size="md" [obligation]', () => {
    const wrapper = mountScrollGrid(makeEditor(), makeShell({ grid_size: 'md' }))
    expect(wrapper.find('[data-testid="card-grid"]').attributes('style')).toContain(
      'grid-template-columns: repeat(auto-fill, 235.5px)'
    )
  })

  test('grid style uses the full xl track width for grid_size="xl" [obligation]', () => {
    const wrapper = mountScrollGrid(makeEditor(), makeShell({ grid_size: 'xl' }))
    expect(wrapper.find('[data-testid="card-grid"]').attributes('style')).toContain(
      'grid-template-columns: repeat(auto-fill, 314px)'
    )
  })

  test('renders the grid container', () => {
    const wrapper = mountScrollGrid()
    expect(wrapper.find('[data-testid="card-grid-container"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="card-grid"]').exists()).toBe(true)
  })

  test('renders one grid-item per card in list.all_cards [obligation]', () => {
    const editor = makeEditor({
      all_cards: [
        { id: 1, client_id: 'c1', front_text: 'q1', back_text: 'a1' },
        { id: 2, client_id: 'c2', front_text: 'q2', back_text: 'a2' },
        { id: 3, client_id: 'c3', front_text: 'q3', back_text: 'a3' }
      ]
    })
    const wrapper = mountScrollGrid(editor)
    const items = wrapper.findAll('[data-testid="grid-item-stub"]')
    expect(items).toHaveLength(3)
  })

  test('passes a scale to its grid-items [obligation]', () => {
    const editor = makeEditor({
      all_cards: [{ id: 1, client_id: 'c1', front_text: 'q', back_text: 'a' }]
    })
    const wrapper = mountScrollGrid(editor)
    expect(wrapper.find('[data-testid="grid-item-stub"]').attributes('data-scale')).toBeDefined()
  })

  test('does not render the infinite-scroll sentinel when hasNextPage is false [obligation]', () => {
    const editor = makeEditor({ hasNextPage: false })
    const wrapper = mountScrollGrid(editor)
    expect(wrapper.find('[data-testid="card-grid__sentinel"]').exists()).toBe(false)
  })

  test('renders the infinite-scroll sentinel only when hasNextPage is true [obligation]', () => {
    const editor = makeEditor({ hasNextPage: true })
    const wrapper = mountScrollGrid(editor)
    expect(wrapper.find('[data-testid="card-grid__sentinel"]').exists()).toBe(true)
  })

  test('calls observeSentinel on mount', () => {
    const editor = makeEditor()
    mountScrollGrid(editor)
    expect(editor.observeSentinel).toHaveBeenCalledOnce()
  })

  test('shows loading text inside the sentinel when isLoading is true', () => {
    const editor = makeEditor({ hasNextPage: true, isLoading: true })
    const wrapper = mountScrollGrid(editor)
    expect(wrapper.find('[data-testid="card-grid__sentinel"]').text()).toContain('Loading')
  })

  test('renders an empty grid when all_cards is empty', () => {
    const editor = makeEditor({ all_cards: [] })
    const wrapper = mountScrollGrid(editor)
    expect(wrapper.findAll('[data-testid="grid-item-stub"]')).toHaveLength(0)
    expect(wrapper.find('[data-testid="card-grid"]').exists()).toBe(true)
  })

  test('passes the computed card_scale to each grid-item as the scale prop', () => {
    const editor = makeEditor({
      all_cards: [{ id: 1, client_id: 'c1', front_text: 'q', back_text: 'a' }]
    })
    const wrapper = mountScrollGrid(editor, makeShell({ grid_size: 'base' }))
    expect(wrapper.find('[data-testid="grid-item-stub"]').attributes('data-scale')).toBe('0.6')
  })

  test('grid-item selected is false when card.id is undefined', () => {
    const editor = makeEditor({
      all_cards: [{ client_id: 'c1', front_text: 'q', back_text: 'a' }]
    })
    const wrapper = mountScrollGrid(editor)
    expect(wrapper.find('[data-testid="grid-item-stub"]').attributes('data-selected')).toBe('false')
  })
})
