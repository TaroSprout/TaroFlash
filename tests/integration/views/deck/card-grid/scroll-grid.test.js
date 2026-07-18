import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'

// Wraps the real useWindowVirtualizer so existing tests keep exercising real
// geometry, while exposing a spy on the returned virtualizer's `measure` so
// the resize-debounce tests below can assert on it without reaching into
// wrapper.vm. The underlying shallowRef never swaps its `.value` instance
// (see @tanstack/vue-virtual's useVirtualizerBase), so spying once after
// creation stays valid for the component's whole lifetime.
const { captured_measure_spy } = vi.hoisted(() => ({ captured_measure_spy: { fn: null } }))
vi.mock('@tanstack/vue-virtual', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useWindowVirtualizer: (options) => {
      const virtualizer = actual.useWindowVirtualizer(options)
      captured_measure_spy.fn = vi.spyOn(virtualizer.value, 'measure')
      return virtualizer
    }
  }
})

// Reorder-hold mode arbitration (mouse-immediate vs touch-waits-out-the-hold)
// is a shared contract with usePressHold/useReorderDrag — mocked here so the
// pointerdown obligations below assert on the wiring, not the engines' own
// internals (covered directly in press-hold.test.js and use-reorder-drag.test.js).
const {
  reorderStartMock,
  pressHoldArmMock,
  pressHoldCancelMock,
  liftListItemMock,
  dropListItemMock
} = vi.hoisted(() => ({
  reorderStartMock: vi.fn(),
  pressHoldArmMock: vi.fn(),
  pressHoldCancelMock: vi.fn(),
  liftListItemMock: vi.fn(),
  dropListItemMock: vi.fn()
}))
// Reactive state shared between the mock factory and tests — created at
// module level (not inside vi.hoisted) so Vue's ref() is available. Captures
// the options object scroll-grid.vue builds for useReorderDrag so tests can
// invoke its getters/geometry directly (the real geometry/scroll math is
// exercised this way, same pattern as use-deck-grid-reorder.test.js).
const reorderDraggingIndex = ref(null)
const reorderCaptured = { opts: null }
vi.mock('@/composables/use-reorder-drag', () => ({
  useReorderDrag: (opts) => {
    reorderCaptured.opts = opts
    return {
      dragging_index: reorderDraggingIndex,
      shouldTransition: () => false,
      dragOffset: () => ({ x: 0, y: 0 }),
      start: (index, event) => {
        reorderDraggingIndex.value = index
        reorderStartMock(index, event)
      }
    }
  }
}))
vi.mock('@/composables/ui/press-hold', () => ({
  usePressHold: () => ({ arm: pressHoldArmMock, cancel: pressHoldCancelMock })
}))
vi.mock('@/utils/animations/list-item', () => ({
  liftListItem: liftListItemMock,
  dropListItem: dropListItemMock
}))

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
    reorderStartMock.mockClear()
    pressHoldArmMock.mockClear()
    pressHoldCancelMock.mockClear()
    liftListItemMock.mockClear()
    dropListItemMock.mockClear()
    reorderDraggingIndex.value = null
    reorderCaptured.opts = null
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
    expect(wrapper.find('[data-testid="grid-item-stub"]').attributes('data-scale')).toBe('0.65')
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

  // ── body-resize debounce → single coalesced measureLayout() ──────────────
  // document.body resizing (e.g. the mobile dock republishing its height into
  // page padding) previously drove measureLayout synchronously on every single
  // ResizeObserver firing, racing the virtualizer's own scroll tracking. A
  // burst of firings within RESIZE_DEBOUNCE_MS must now coalesce into one
  // measureLayout() call, and every measureLayout() run must pair its
  // scroll_margin write with an explicit virtualizer.measure() call.

  describe('body resize debounce', () => {
    let captured_ro_callback
    let original_resize_observer

    beforeEach(() => {
      original_resize_observer = window.ResizeObserver
      window.ResizeObserver = class {
        constructor(callback) {
          captured_ro_callback = callback
        }
        observe() {}
        disconnect() {}
      }
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
      window.ResizeObserver = original_resize_observer
    })

    test('[obligation] measureLayout pairs its scroll_margin write with an explicit virtualizer.measure() call', async () => {
      mountScrollGrid()
      await nextTick()

      // measureLayout() already ran once synchronously in onMounted.
      expect(captured_measure_spy.fn).toHaveBeenCalledTimes(1)
    })

    test('[obligation] the is_view watcher remeasuring on return-to-grid also pairs with an explicit virtualizer.measure() call', async () => {
      const shell = makeShell()
      shell.is_view.value = false
      mountScrollGrid(makeEditor(), shell)
      await nextTick()
      captured_measure_spy.fn.mockClear()

      shell.is_view.value = true
      await flushPromises()

      expect(captured_measure_spy.fn).toHaveBeenCalledTimes(1)
    })

    test('[obligation] a burst of ResizeObserver firings within the debounce window coalesces into a single measureLayout call', async () => {
      const wrapper = mountScrollGrid()
      await nextTick()
      captured_measure_spy.fn.mockClear()

      const container_el = wrapper.element.parentElement
      const rect_spy = vi.spyOn(container_el, 'getBoundingClientRect')

      captured_ro_callback([])
      captured_ro_callback([])
      captured_ro_callback([])
      expect(rect_spy).not.toHaveBeenCalled()

      vi.advanceTimersByTime(120)

      expect(rect_spy).toHaveBeenCalledTimes(1)
      expect(captured_measure_spy.fn).toHaveBeenCalledTimes(1)
    })

    test('[obligation] unmounting clears the pending debounce timer so a queued measureLayout never fires after teardown', async () => {
      const wrapper = mountScrollGrid()
      await nextTick()
      captured_measure_spy.fn.mockClear()

      const container_el = wrapper.element.parentElement
      const rect_spy = vi.spyOn(container_el, 'getBoundingClientRect')

      captured_ro_callback([])
      wrapper.unmount()

      expect(() => vi.advanceTimersByTime(120)).not.toThrow()
      expect(rect_spy).not.toHaveBeenCalled()
      expect(captured_measure_spy.fn).not.toHaveBeenCalled()
    })
  })

  // ── reorder pointerdown mode arbitration [obligation] ────────────────────
  // Mouse picks up immediately; touch waits out a press-and-hold so a plain
  // swipe still scrolls the grid. Outside rearrange mode (or while search is
  // active) the grid must not touch the drag engine at all.

  describe('reorder pointerdown mode arbitration [obligation]', () => {
    function firstItem(wrapper) {
      return wrapper.find('[data-testid="card-grid__item"]')
    }

    function search(cards) {
      return makeSearch({ displayed_cards: cards })
    }

    const ONE_CARD = [{ id: 1, client_id: 'c1', front_text: 'q', back_text: 'a' }]

    test('a mouse pointerdown in rearrange mode begins the drag immediately', async () => {
      const shell = makeShell({ is_rearranging: true })
      const wrapper = mountScrollGrid(makeEditor(), shell, search(ONE_CARD))

      await firstItem(wrapper).trigger('pointerdown', { pointerType: 'mouse' })

      expect(reorderStartMock).toHaveBeenCalledWith(0, expect.anything())
      expect(pressHoldArmMock).not.toHaveBeenCalled()
    })

    test('a touch pointerdown in rearrange mode arms the hold instead of starting immediately', async () => {
      const shell = makeShell({ is_rearranging: true })
      const wrapper = mountScrollGrid(makeEditor(), shell, search(ONE_CARD))

      await firstItem(wrapper).trigger('pointerdown', { pointerType: 'touch' })

      expect(pressHoldArmMock).toHaveBeenCalledTimes(1)
      expect(reorderStartMock).not.toHaveBeenCalled()
    })

    test('the touch hold firing begins the drag', async () => {
      const shell = makeShell({ is_rearranging: true })
      const wrapper = mountScrollGrid(makeEditor(), shell, search(ONE_CARD))

      await firstItem(wrapper).trigger('pointerdown', { pointerType: 'touch' })
      const onHold = pressHoldArmMock.mock.calls[0][1]
      onHold()

      expect(reorderStartMock).toHaveBeenCalledWith(0, expect.anything())
    })

    test('outside rearrange mode, pointerdown is a no-op (grid does not touch the drag engine)', async () => {
      const shell = makeShell({ is_rearranging: false })
      const wrapper = mountScrollGrid(makeEditor(), shell, search(ONE_CARD))

      await firstItem(wrapper).trigger('pointerdown', { pointerType: 'touch' })

      expect(pressHoldArmMock).not.toHaveBeenCalled()
      expect(reorderStartMock).not.toHaveBeenCalled()
    })

    test('while search is active, pointerdown is a no-op even in rearrange mode', async () => {
      const shell = makeShell({ is_rearranging: true })
      const active_search = makeSearch({ is_active: true, displayed_cards: ONE_CARD })
      const wrapper = mountScrollGrid(makeEditor(), shell, active_search)

      await firstItem(wrapper).trigger('pointerdown', { pointerType: 'touch' })

      expect(pressHoldArmMock).not.toHaveBeenCalled()
      expect(reorderStartMock).not.toHaveBeenCalled()
    })

    test('once the drag actually starts, the matching grid-item element is lifted', async () => {
      const shell = makeShell({ is_rearranging: true })
      const wrapper = mountScrollGrid(makeEditor(), shell, search(ONE_CARD))
      const item_el = firstItem(wrapper).element
      const inner = document.createElement('div')
      inner.dataset.testid = 'grid-item'
      item_el.appendChild(inner)

      const event = new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        pointerType: 'mouse'
      })
      Object.defineProperty(event, 'target', { value: inner })
      item_el.dispatchEvent(event)

      expect(liftListItemMock).toHaveBeenCalledWith(inner)
    })

    test('settles the lifted card once the drag ends (dragging_index returns to null)', async () => {
      const shell = makeShell({ is_rearranging: true })
      const wrapper = mountScrollGrid(makeEditor(), shell, search(ONE_CARD))
      const item_el = firstItem(wrapper).element
      const inner = document.createElement('div')
      inner.dataset.testid = 'grid-item'
      item_el.appendChild(inner)

      const event = new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        pointerType: 'mouse'
      })
      Object.defineProperty(event, 'target', { value: inner })
      item_el.dispatchEvent(event)
      await nextTick()

      reorderDraggingIndex.value = null
      await nextTick()

      expect(dropListItemMock).toHaveBeenCalledWith(inner)
    })
  })

  // ── useReorderDrag options — real geometry/scroll closures [obligation] ──
  // The engine itself is mocked above (so pointerdown tests assert on wiring,
  // not the engine's internals) — these tests invoke the captured option
  // getters directly so the real count/enabled/topInset/maxScroll/geometry
  // closures scroll-grid.vue builds are still exercised.

  describe('useReorderDrag options passed by scroll-grid [obligation]', () => {
    test('count reflects the live displayed_cards length', () => {
      const search_state = makeSearch({
        displayed_cards: [
          { id: 1, client_id: 'c1', front_text: 'q', back_text: 'a' },
          { id: 2, client_id: 'c2', front_text: 'q', back_text: 'a' }
        ]
      })
      mountScrollGrid(makeEditor(), makeShell(), search_state)

      expect(reorderCaptured.opts.count()).toBe(2)
    })

    test('enabled is true only when rearranging and search is not active', () => {
      mountScrollGrid(makeEditor(), makeShell({ is_rearranging: true }), makeSearch())
      expect(reorderCaptured.opts.enabled()).toBe(true)

      mountScrollGrid(
        makeEditor(),
        makeShell({ is_rearranging: true }),
        makeSearch({ is_active: true })
      )
      expect(reorderCaptured.opts.enabled()).toBe(false)

      mountScrollGrid(makeEditor(), makeShell({ is_rearranging: false }), makeSearch())
      expect(reorderCaptured.opts.enabled()).toBe(false)
    })

    test('topInset falls back to 0 when no sticky toolbar is present in the document', () => {
      mountScrollGrid()
      expect(reorderCaptured.opts.topInset()).toBe(0)
    })

    test('maxScroll returns a finite number derived from scroll_margin and viewport height', () => {
      mountScrollGrid()
      expect(Number.isFinite(reorderCaptured.opts.maxScroll())).toBe(true)
    })

    test('geometry.idealIndex computes a finite slot index from origin + drag delta [obligation]', () => {
      const search_state = makeSearch({
        displayed_cards: [
          { id: 1, client_id: 'c1', front_text: 'q', back_text: 'a' },
          { id: 2, client_id: 'c2', front_text: 'q', back_text: 'a' },
          { id: 3, client_id: 'c3', front_text: 'q', back_text: 'a' }
        ]
      })
      mountScrollGrid(makeEditor(), makeShell({ is_rearranging: true }), search_state)

      const { idealIndex } = reorderCaptured.opts.geometry
      expect(Number.isFinite(idealIndex(0, 500, 0))).toBe(true)
      expect(Number.isFinite(idealIndex(1, -200, 100))).toBe(true)
    })

    test('geometry.position delegates to itemPosition', () => {
      mountScrollGrid()
      expect(reorderCaptured.opts.geometry.position).toBeInstanceOf(Function)
      expect(reorderCaptured.opts.geometry.position(0)).toEqual(
        expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) })
      )
    })
  })
})
