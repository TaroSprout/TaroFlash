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
import { cardEditorKey } from '@/views/deck/composables/list-controller'
import { cardSearchKey } from '@/views/deck/composables/card-search'
import { deckViewShellKey } from '@/views/deck/composables/view-shell'

function makeEditor({
  card_attributes = ref({ front: {}, back: {} }),
  hasNextPage = false,
  isLoading = false,
  observeSentinel = vi.fn()
} = {}) {
  return {
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

function makeSearch({ is_active = false, displayed_cards = [], no_results = false } = {}) {
  return {
    is_active: ref(is_active),
    displayed_cards: ref(displayed_cards),
    no_results: ref(no_results)
  }
}

function mountScrollGrid(editor = makeEditor(), shell = makeShell(), search = makeSearch()) {
  return shallowMount(ScrollGrid, {
    global: {
      provide: {
        [cardEditorKey]: editor,
        [deckViewShellKey]: shell,
        [cardSearchKey]: search
      },
      stubs: { GridItem: GridItemStub }
    }
  })
}

describe('card-grid/scroll-grid', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  // ── grid_size → gridTemplateColumns track width ───────────────────────────

  test('grid style scales the xl track to 0.56 for grid_size="base" [obligation]', () => {
    const wrapper = mountScrollGrid(makeEditor(), makeShell({ grid_size: 'base' }))
    expect(wrapper.find('[data-testid="card-grid"]').attributes('style')).toContain(
      'grid-template-columns: repeat(auto-fill, 175.84px)'
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

  // ── displayed_cards (from cardSearchKey) drives the grid ─────────────────

  test('renders one grid-item per card in displayed_cards [obligation]', () => {
    const search = makeSearch({
      displayed_cards: [
        { id: 1, client_id: 'c1', front_text: 'q1', back_text: 'a1' },
        { id: 2, client_id: 'c2', front_text: 'q2', back_text: 'a2' },
        { id: 3, client_id: 'c3', front_text: 'q3', back_text: 'a3' }
      ]
    })
    const wrapper = mountScrollGrid(makeEditor(), makeShell(), search)
    const items = wrapper.findAll('[data-testid="grid-item-stub"]')
    expect(items).toHaveLength(3)
  })

  test('passes a scale to its grid-items [obligation]', () => {
    const search = makeSearch({
      displayed_cards: [{ id: 1, client_id: 'c1', front_text: 'q', back_text: 'a' }]
    })
    const wrapper = mountScrollGrid(makeEditor(), makeShell(), search)
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

  test('renders an empty grid when displayed_cards is empty', () => {
    const wrapper = mountScrollGrid()
    expect(wrapper.findAll('[data-testid="grid-item-stub"]')).toHaveLength(0)
    expect(wrapper.find('[data-testid="card-grid"]').exists()).toBe(true)
  })

  test('passes the computed card_scale to each grid-item as the scale prop', () => {
    const search = makeSearch({
      displayed_cards: [{ id: 1, client_id: 'c1', front_text: 'q', back_text: 'a' }]
    })
    const wrapper = mountScrollGrid(makeEditor(), makeShell({ grid_size: 'base' }), search)
    expect(wrapper.find('[data-testid="grid-item-stub"]').attributes('data-scale')).toBe('0.56')
  })

  test('grid-item selected is false when card.id is undefined', () => {
    const search = makeSearch({
      displayed_cards: [{ client_id: 'c1', front_text: 'q', back_text: 'a' }]
    })
    const wrapper = mountScrollGrid(makeEditor(), makeShell(), search)
    expect(wrapper.find('[data-testid="grid-item-stub"]').attributes('data-selected')).toBe('false')
  })

  // ── search integration ────────────────────────────────────────────────────

  test('shows card-grid__no-results when no_results is true [obligation]', () => {
    const search = makeSearch({ no_results: true })
    const wrapper = mountScrollGrid(makeEditor(), makeShell(), search)
    expect(wrapper.find('[data-testid="card-grid__no-results"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="card-grid"]').exists()).toBe(false)
  })

  test('hides card-grid__no-results when no_results is false', () => {
    const search = makeSearch({ no_results: false })
    const wrapper = mountScrollGrid(makeEditor(), makeShell(), search)
    expect(wrapper.find('[data-testid="card-grid__no-results"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="card-grid"]').exists()).toBe(true)
  })

  test('hides the sentinel when is_active is true even if hasNextPage is true [obligation]', () => {
    const editor = makeEditor({ hasNextPage: true })
    const search = makeSearch({ is_active: true })
    const wrapper = mountScrollGrid(editor, makeShell(), search)
    expect(wrapper.find('[data-testid="card-grid__sentinel"]').exists()).toBe(false)
  })

  test('shows the sentinel when hasNextPage is true and is_active is false [obligation]', () => {
    const editor = makeEditor({ hasNextPage: true })
    const search = makeSearch({ is_active: false })
    const wrapper = mountScrollGrid(editor, makeShell(), search)
    expect(wrapper.find('[data-testid="card-grid__sentinel"]').exists()).toBe(true)
  })

  test('renders search result cards from displayed_cards with correct client_id keys [obligation]', () => {
    const search = makeSearch({
      is_active: true,
      displayed_cards: [
        { id: 10, client_id: '10', front_text: 'result1', back_text: 'ans1' },
        { id: 20, client_id: '20', front_text: 'result2', back_text: 'ans2' }
      ]
    })
    const wrapper = mountScrollGrid(makeEditor(), makeShell(), search)
    const items = wrapper.findAll('[data-testid="grid-item-stub"]')
    expect(items).toHaveLength(2)
    expect(items[0].attributes('data-card-id')).toBe('10')
    expect(items[1].attributes('data-card-id')).toBe('20')
  })
})
