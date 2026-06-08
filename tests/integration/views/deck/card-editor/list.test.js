import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { ref, computed, shallowRef } from 'vue'

const { useWindowVirtualizerMock } = vi.hoisted(() => ({ useWindowVirtualizerMock: vi.fn() }))
vi.mock('@tanstack/vue-virtual', () => ({ useWindowVirtualizer: useWindowVirtualizerMock }))

import List from '@/views/deck/card-editor/list.vue'

const ROW_PITCH = 407

function makeVirtualItems(indexes) {
  return indexes.map((i) => ({
    key: `cid-${i}`,
    index: i,
    start: i * ROW_PITCH,
    size: ROW_PITCH
  }))
}

function makeEditor({
  cards = [],
  hasNextPage = ref(false),
  isLoading = ref(false),
  loadNextPage = vi.fn()
} = {}) {
  return {
    list: {
      all_cards: computed(() => cards.map((c) => ({ ...c, client_id: `cid-${c.id}` })))
    },
    hasNextPage,
    isLoading,
    loadNextPage
  }
}

function setupVirtualizer({ items, totalSize }) {
  const virtualizer = shallowRef({
    getVirtualItems: () => items,
    getTotalSize: () => totalSize
  })
  useWindowVirtualizerMock.mockReturnValue(virtualizer)
  return virtualizer
}

function mount(options = {}) {
  const editor = options.editor ?? makeEditor(options)
  return shallowMount(List, {
    global: {
      provide: {
        'card-editor': editor
      }
    }
  })
}

describe('CardList (list.vue)', () => {
  beforeEach(() => {
    useWindowVirtualizerMock.mockReset()
  })

  test('renders one row per virtual item from the virtualizer', () => {
    const cards = [{ id: 1 }, { id: 2 }, { id: 3 }]
    setupVirtualizer({ items: makeVirtualItems([0, 1, 2]), totalSize: 3 * ROW_PITCH })

    const wrapper = mount({ editor: makeEditor({ cards }) })

    expect(wrapper.findAll('[data-testid="card-list__row"]')).toHaveLength(3)
  })

  test('renders only virtual items returned by the virtualizer (windowed)', () => {
    const cards = Array.from({ length: 100 }, (_, i) => ({ id: i }))
    setupVirtualizer({ items: makeVirtualItems([10, 11, 12, 13, 14]), totalSize: 100 * ROW_PITCH })

    const wrapper = mount({ editor: makeEditor({ cards }) })

    const rows = wrapper.findAll('[data-testid="card-list__row"]')
    expect(rows).toHaveLength(5)
  })

  test('forwards card and index to each list-item by virtual index', () => {
    const cards = [
      { id: 1, front_text: 'a' },
      { id: 2, front_text: 'b' },
      { id: 3, front_text: 'c' }
    ]
    setupVirtualizer({ items: makeVirtualItems([1, 2]), totalSize: 3 * ROW_PITCH })

    const wrapper = mount({ editor: makeEditor({ cards }) })

    const items = wrapper.findAllComponents({ name: 'ListItem' })
    expect(items).toHaveLength(2)
    expect(items[0].props('index')).toBe(1)
    expect(items[0].props('card').front_text).toBe('b')
    expect(items[1].props('index')).toBe(2)
    expect(items[1].props('card').front_text).toBe('c')
  })

  test('sets viewport height from virtualizer.getTotalSize', () => {
    const cards = Array.from({ length: 5 }, (_, i) => ({ id: i }))
    setupVirtualizer({ items: makeVirtualItems([0]), totalSize: 5 * ROW_PITCH })

    const wrapper = mount({ editor: makeEditor({ cards }) })

    const viewport = wrapper.find('[data-testid="card-list__viewport"]')
    expect(viewport.attributes('style')).toContain(`height: ${5 * ROW_PITCH}px`)
  })

  test('positions each row at translateY(virtualItem.start)', () => {
    const cards = [{ id: 1 }, { id: 2 }]
    setupVirtualizer({ items: makeVirtualItems([0, 1]), totalSize: 2 * ROW_PITCH })

    const wrapper = mount({ editor: makeEditor({ cards }) })

    const rows = wrapper.findAll('[data-testid="card-list__row"]')
    expect(rows[0].attributes('style')).toContain('translateY(0px)')
    expect(rows[1].attributes('style')).toContain(`translateY(${ROW_PITCH}px)`)
  })

  test('shows the loading indicator while fetching', () => {
    const cards = [{ id: 1 }]
    setupVirtualizer({ items: makeVirtualItems([0]), totalSize: ROW_PITCH })

    const wrapper = mount({ editor: makeEditor({ cards, isLoading: ref(true) }) })

    expect(wrapper.find('[data-testid="card-list__loading"]').exists()).toBe(true)
  })

  test('hides the loading indicator when not fetching', () => {
    const cards = [{ id: 1 }]
    setupVirtualizer({ items: makeVirtualItems([0]), totalSize: ROW_PITCH })

    const wrapper = mount({ editor: makeEditor({ cards, isLoading: ref(false) }) })

    expect(wrapper.find('[data-testid="card-list__loading"]').exists()).toBe(false)
  })

  // ── Pagination via virtualizer range ──────────────────────────────────────

  test('calls loadNextPage when the last visible row is within 5 of the end and hasNextPage', () => {
    const cards = Array.from({ length: 10 }, (_, i) => ({ id: i }))
    // last visible index = 5; cards.length - 5 = 5 → triggers load
    setupVirtualizer({ items: makeVirtualItems([3, 4, 5]), totalSize: 10 * ROW_PITCH })

    const loadNextPage = vi.fn()
    mount({ editor: makeEditor({ cards, hasNextPage: ref(true), loadNextPage }) })

    expect(loadNextPage).toHaveBeenCalledOnce()
  })

  test('does not call loadNextPage when last visible row is far from the end', () => {
    const cards = Array.from({ length: 100 }, (_, i) => ({ id: i }))
    setupVirtualizer({ items: makeVirtualItems([0, 1, 2]), totalSize: 100 * ROW_PITCH })

    const loadNextPage = vi.fn()
    mount({ editor: makeEditor({ cards, hasNextPage: ref(true), loadNextPage }) })

    expect(loadNextPage).not.toHaveBeenCalled()
  })

  test('does not call loadNextPage when hasNextPage is false', () => {
    const cards = Array.from({ length: 6 }, (_, i) => ({ id: i }))
    setupVirtualizer({ items: makeVirtualItems([3, 4, 5]), totalSize: 6 * ROW_PITCH })

    const loadNextPage = vi.fn()
    mount({ editor: makeEditor({ cards, hasNextPage: ref(false), loadNextPage }) })

    expect(loadNextPage).not.toHaveBeenCalled()
  })

  test('does not call loadNextPage when already loading', () => {
    const cards = Array.from({ length: 6 }, (_, i) => ({ id: i }))
    setupVirtualizer({ items: makeVirtualItems([3, 4, 5]), totalSize: 6 * ROW_PITCH })

    const loadNextPage = vi.fn()
    mount({
      editor: makeEditor({
        cards,
        hasNextPage: ref(true),
        isLoading: ref(true),
        loadNextPage
      })
    })

    expect(loadNextPage).not.toHaveBeenCalled()
  })
})
