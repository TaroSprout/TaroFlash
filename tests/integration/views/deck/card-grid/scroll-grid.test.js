import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'

const GridItemStub = defineComponent({
  name: 'GridItem',
  props: ['card', 'side', 'scale', 'card_attributes', 'selected'],
  setup(props) {
    return () =>
      h('div', {
        'data-testid': 'grid-item-stub',
        'data-card-id': props.card?.id,
        'data-side': props.side,
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
  observeSentinel = vi.fn(),
  reorderCard = vi.fn()
} = {}) {
  return {
    selection: { isCardSelected: vi.fn().mockReturnValue(false) },
    card_attributes,
    hasNextPage: ref(hasNextPage),
    isLoading: ref(isLoading),
    observeSentinel,
    reorderCard
  }
}

function makeShell({ grid_size = 'md', grid_face = 'front', is_rearranging = false } = {}) {
  return {
    grid_size: ref(grid_size),
    grid_face: ref(grid_face),
    is_view: ref(true),
    is_rearranging: ref(is_rearranging),
    toggleRearrange: vi.fn()
  }
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

  // ── grid_size → virtualizer-driven height ────────────────────────────────
  // The grid switched to @tanstack/vue-virtual absolute positioning;
  // gridTemplateColumns is no longer applied — the card-grid div carries
  // only a height from the virtualizer's total size.

  test('renders the grid container', () => {
    const wrapper = mountScrollGrid()
    expect(wrapper.find('[data-testid="card-grid-container"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="card-grid"]').exists()).toBe(true)
  })

  test('[obligation] the initial synchronous render is height 0px, not an inflated single-column fallback', async () => {
    const search = makeSearch({
      displayed_cards: [
        { id: 1, client_id: 'c1', front_text: 'q1', back_text: 'a1' },
        { id: 2, client_id: 'c2', front_text: 'q2', back_text: 'a2' },
        { id: 3, client_id: 'c3', front_text: 'q3', back_text: 'a3' }
      ]
    })
    const wrapper = mountScrollGrid(makeEditor(), makeShell(), search)

    // measureLayout() runs in onMounted, but its reactive DOM patch is flushed
    // on the next microtask — inspect before that flush to catch the true
    // first-paint state.
    expect(wrapper.find('[data-testid="card-grid"]').attributes('style')).toContain('height: 0px')

    await nextTick()

    expect(wrapper.find('[data-testid="card-grid"]').attributes('style')).not.toContain(
      'height: 0px'
    )
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

  test('passes shell.grid_face as the side prop to its grid-items [obligation]', () => {
    const search = makeSearch({
      displayed_cards: [{ id: 1, client_id: 'c1', front_text: 'q', back_text: 'a' }]
    })
    const wrapper = mountScrollGrid(makeEditor(), makeShell({ grid_face: 'back' }), search)
    expect(wrapper.find('[data-testid="grid-item-stub"]').attributes('data-side')).toBe('back')
  })

  test('grid-item side updates reactively when shell.grid_face changes [obligation]', async () => {
    const search = makeSearch({
      displayed_cards: [{ id: 1, client_id: 'c1', front_text: 'q', back_text: 'a' }]
    })
    const shell = makeShell({ grid_face: 'front' })
    const wrapper = mountScrollGrid(makeEditor(), shell, search)
    expect(wrapper.find('[data-testid="grid-item-stub"]').attributes('data-side')).toBe('front')

    shell.grid_face.value = 'back'
    await nextTick()

    expect(wrapper.find('[data-testid="grid-item-stub"]').attributes('data-side')).toBe('back')
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
