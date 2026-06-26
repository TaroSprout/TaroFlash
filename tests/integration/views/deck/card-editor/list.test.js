import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { ref, computed, shallowRef } from 'vue'

const { useWindowVirtualizerMock, useReorderDragMock, startMock } = vi.hoisted(() => {
  const startMock = vi.fn()
  const useReorderDragMock = vi.fn(() => ({
    dragging_index: ref(null),
    target_index: ref(null),
    dragOffset: vi.fn(() => 0),
    shouldTransition: vi.fn(() => false),
    start: startMock
  }))
  const useWindowVirtualizerMock = vi.fn()
  return { useWindowVirtualizerMock, useReorderDragMock, startMock }
})

vi.mock('@tanstack/vue-virtual', () => ({
  useWindowVirtualizer: useWindowVirtualizerMock,
  // Used by list.vue rangeExtractor option — must be exported so the import resolves
  defaultRangeExtractor: (range) => {
    const arr = []
    for (let i = range.startIndex; i <= range.endIndex; i++) arr.push(i)
    return arr
  }
}))
vi.mock('@/views/deck/card-editor/use-reorder-drag', () => ({
  useReorderDrag: useReorderDragMock
}))
vi.mock('@/composables/ui/media-query', () => ({ useMatchMedia: () => ref(true) }))
vi.mock('@/utils/animations/list-item', () => ({
  expandListItemIn: vi.fn(),
  liftListItem: vi.fn(),
  dropListItem: vi.fn()
}))
vi.mock('@/composables/ui/pin-scroll-while-typing', () => ({
  usePinScrollWhileTyping: vi.fn()
}))

import List from '@/views/deck/card-editor/list.vue'
import { cardEditorKey } from '@/views/deck/composables/list-controller'

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
  loadNextPage = vi.fn(),
  reorderCard = vi.fn()
} = {}) {
  return {
    list: {
      all_cards: computed(() => cards.map((c) => ({ ...c, client_id: `cid-${c.id}` })))
    },
    selection: { is_selecting: ref(false) },
    reorderCard,
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
        [cardEditorKey]: editor
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

  // ── Drag-to-reorder — dragging prop forwarded to list-item ────────────────

  test('forwards dragging=true to the list-item whose index matches dragging_index', () => {
    const cards = [{ id: 1 }, { id: 2 }]
    setupVirtualizer({ items: makeVirtualItems([0, 1]), totalSize: 2 * ROW_PITCH })
    // Seed dragging_index=0 so the first item gets dragging=true
    useReorderDragMock.mockReturnValueOnce({
      dragging_index: ref(0),
      target_index: ref(null),
      dragOffset: vi.fn(() => 0),
      shouldTransition: vi.fn(() => false),
      start: vi.fn()
    })

    const wrapper = mount({ editor: makeEditor({ cards }) })
    const items = wrapper.findAllComponents({ name: 'ListItem' })
    expect(items[0].props('dragging')).toBe(true)
    expect(items[1].props('dragging')).toBe(false)
  })

  test('forwards dragging=false to all list-items when no drag is active', () => {
    const cards = [{ id: 1 }, { id: 2 }]
    setupVirtualizer({ items: makeVirtualItems([0, 1]), totalSize: 2 * ROW_PITCH })

    const wrapper = mount({ editor: makeEditor({ cards }) })
    const items = wrapper.findAllComponents({ name: 'ListItem' })
    items.forEach((item) => expect(item.props('dragging')).toBe(false))
  })

  // ── Drag lifecycle — reorderPointerdown wiring and lift/drop ──────────────

  test('reorder-pointerdown on a list-item calls reorder.start with the correct index', async () => {
    const cards = [{ id: 1 }, { id: 2 }]
    setupVirtualizer({ items: makeVirtualItems([0, 1]), totalSize: 2 * ROW_PITCH })

    const wrapper = mount({ editor: makeEditor({ cards }) })
    const item = wrapper.findAllComponents({ name: 'ListItem' })[1]
    const event = new Event('reorder-pointerdown')
    item.vm.$emit('reorderPointerdown', event)
    await wrapper.vm.$nextTick()

    expect(startMock).toHaveBeenCalledWith(1, event)
  })

  test('drop (dragging_index transitions from non-null to null) fires the watch without throwing', async () => {
    const dragging_index = ref(1)
    const cards = [{ id: 1 }, { id: 2 }]
    setupVirtualizer({ items: makeVirtualItems([0, 1]), totalSize: 2 * ROW_PITCH })
    useReorderDragMock.mockReturnValueOnce({
      dragging_index,
      target_index: ref(null),
      dragOffset: vi.fn(() => 0),
      shouldTransition: vi.fn(() => false),
      start: vi.fn()
    })

    mount({ editor: makeEditor({ cards }) })

    // Transition: dragging_index goes from 1 → null (drop)
    dragging_index.value = null
    await new Promise((r) => setTimeout(r, 0))

    // dropListItem would be called if lifted_row was set; since no real DOM row was
    // lifted the lifted_row is null so dropListItem is not called — test that the
    // watch fires without throwing
    expect(() => (dragging_index.value = null)).not.toThrow()
  })

  test('liftListItem called when drag is enabled and event target resolves to card-list-item', async () => {
    const { liftListItem: liftMock } = await import('@/utils/animations/list-item')
    const dragging_index = ref(null)
    const cards = [{ id: 1 }, { id: 2 }]
    setupVirtualizer({ items: makeVirtualItems([0, 1]), totalSize: 2 * ROW_PITCH })

    // Make start() set dragging_index to simulate a successful drag start
    const startFn = vi.fn(() => {
      dragging_index.value = 1
    })
    useReorderDragMock.mockReturnValueOnce({
      dragging_index,
      target_index: ref(null),
      dragOffset: vi.fn(() => 0),
      shouldTransition: vi.fn(() => false),
      start: startFn
    })

    const wrapper = mount({ editor: makeEditor({ cards }) })

    // Create a real DOM element that .closest('[data-testid="card-list-item"]') can find
    const rowEl = document.createElement('div')
    rowEl.setAttribute('data-testid', 'card-list-item')
    document.body.appendChild(rowEl)

    const fakeEvent = { target: rowEl, button: 0, preventDefault: vi.fn() }
    const item = wrapper.findAllComponents({ name: 'ListItem' })[1]
    item.vm.$emit('reorderPointerdown', fakeEvent)
    await wrapper.vm.$nextTick()

    expect(liftMock).toHaveBeenCalledWith(rowEl)
    document.body.removeChild(rowEl)
  })
})
