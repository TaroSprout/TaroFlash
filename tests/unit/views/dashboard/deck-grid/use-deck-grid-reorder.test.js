import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { createApp, nextTick, ref } from 'vue'

// jsdom does not implement PointerEvent; shim it as a MouseEvent subclass so
// clientX/clientY/pointerType/button are readable.
if (!globalThis.PointerEvent) {
  globalThis.PointerEvent = class PointerEvent extends MouseEvent {
    constructor(type, init = {}) {
      super(type, init)
      this.pointerType = init.pointerType ?? 'mouse'
    }
  }
}

// jsdom does not implement ResizeObserver. Captures the most recently created
// instance's callback so tests can simulate a resize by invoking it directly.
let last_resize_observer_callback
class ResizeObserverStub {
  constructor(callback) {
    last_resize_observer_callback = callback
  }
  observe() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverStub

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const {
  mutateAsyncMock,
  useMoveDeckMutationMock,
  warnMock,
  useNoticeStoreMock,
  liftListItemMock,
  dropListItemMock,
  reorderDragState
} = vi.hoisted(() => {
  const mutateAsyncMock = vi.fn().mockResolvedValue(undefined)
  const warnMock = vi.fn()
  return {
    mutateAsyncMock,
    useMoveDeckMutationMock: vi.fn(() => ({ mutateAsync: mutateAsyncMock })),
    warnMock,
    useNoticeStoreMock: vi.fn(() => ({ warn: warnMock })),
    liftListItemMock: vi.fn(),
    dropListItemMock: vi.fn(),
    // Captures the options useReorderDrag was called with, so tests can
    // invoke onReorder / geometry.idealIndex directly. The real drag engine
    // (pointer tracking, hysteresis) is covered in use-reorder-drag.test.js.
    reorderDragState: { captured_opts: null }
  }
})

vi.mock('@/api/decks', () => ({ useMoveDeckMutation: useMoveDeckMutationMock }))
vi.mock('@/stores/notice-store', () => ({ useNoticeStore: useNoticeStoreMock }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key) => key }) }))
vi.mock('@/utils/animations/list-item', () => ({
  liftListItem: liftListItemMock,
  dropListItem: dropListItemMock
}))
vi.mock('@/composables/use-reorder-drag', () => ({
  useReorderDrag: vi.fn((opts) => {
    reorderDragState.captured_opts = opts
    // Mirror the real engine: start(index) sets dragging_index — the
    // beginDrag lift logic reads it right after calling start(). Exposed on
    // reorderDragState so tests can also drive it directly (e.g. simulating
    // the engine clearing it back to null on drop).
    const dragging_index = ref(null)
    reorderDragState.dragging_index = dragging_index
    return {
      dragging_index,
      shouldTransition: vi.fn(() => false),
      dragOffset: vi.fn((index) => ({ x: index, y: index * 2 })),
      start: vi.fn((index) => {
        dragging_index.value = index
      })
    }
  })
}))

import { useDeckGridReorder } from '@/views/dashboard/deck-grid/use-deck-grid-reorder'

// ── Helpers ───────────────────────────────────────────────────────────────────

function withSetup(composable) {
  let result
  const app = createApp({
    setup() {
      result = composable()
      return () => {}
    }
  })
  const el = document.createElement('div')
  document.body.appendChild(el)
  app.mount(el)
  return { result, app, el }
}

function deck(id) {
  return { id, title: `Deck ${id}` }
}

function pointerEvent(type, opts = {}) {
  return new PointerEvent(type, { bubbles: true, cancelable: true, ...opts })
}

let app

beforeEach(() => {
  mutateAsyncMock.mockReset().mockResolvedValue(undefined)
  warnMock.mockClear()
  liftListItemMock.mockClear()
  dropListItemMock.mockClear()
  reorderDragState.captured_opts = null
})

afterEach(() => {
  app?.unmount()
  app = null
})

// ── reorderDeck (the onReorder callback wired into useReorderDrag) ────────────

describe('useDeckGridReorder — reorderDeck (via the captured onReorder callback)', () => {
  test('resolves the anchor from the list-without-the-dragged-deck and calls moveDeck mutateAsync [obligation]', () => {
    const container_el = ref(document.createElement('div'))
    const decks = [deck(1), deck(2), deck(3)]
    ;({ app } = withSetup(() =>
      useDeckGridReorder(
        container_el,
        () => decks,
        () => true,
        () => 'base'
      )
    ))

    reorderDragState.captured_opts.onReorder(0, 2)

    expect(mutateAsyncMock).toHaveBeenCalledWith({ deck_id: 1, anchor_id: 3, side: 'after' })
  })

  test('is a no-op when the dragged deck has no id (e.g. a placeholder)', () => {
    const container_el = ref(document.createElement('div'))
    const decks = [{ title: 'no id' }, deck(2)]
    ;({ app } = withSetup(() =>
      useDeckGridReorder(
        container_el,
        () => decks,
        () => true,
        () => 'base'
      )
    ))

    reorderDragState.captured_opts.onReorder(0, 1)

    expect(mutateAsyncMock).not.toHaveBeenCalled()
  })

  test('is a no-op when resolveReorderAnchor cannot find a persisted neighbour', () => {
    // Single deck — after removing the dragged deck, "without" is empty.
    const container_el = ref(document.createElement('div'))
    const decks = [deck(1)]
    ;({ app } = withSetup(() =>
      useDeckGridReorder(
        container_el,
        () => decks,
        () => true,
        () => 'base'
      )
    ))

    reorderDragState.captured_opts.onReorder(0, 0)

    expect(mutateAsyncMock).not.toHaveBeenCalled()
  })

  test('shows a warning toast when the mutation rejects [obligation]', async () => {
    mutateAsyncMock.mockRejectedValueOnce(new Error('network'))
    const container_el = ref(document.createElement('div'))
    const decks = [deck(1), deck(2)]
    ;({ app } = withSetup(() =>
      useDeckGridReorder(
        container_el,
        () => decks,
        () => true,
        () => 'base'
      )
    ))

    reorderDragState.captured_opts.onReorder(0, 1)
    await Promise.resolve()
    await Promise.resolve()

    expect(warnMock).toHaveBeenCalledWith('toast.warn.reorder-failed')
  })
})

// ── dragTransform / jiggleStyle ────────────────────────────────────────────────

describe('useDeckGridReorder — dragTransform', () => {
  test('builds a translate() string from the reorder engine offset', () => {
    const container_el = ref(document.createElement('div'))
    let reorder
    ;({ app, result: reorder } = withSetup(() =>
      useDeckGridReorder(
        container_el,
        () => [deck(1)],
        () => true,
        () => 'base'
      )
    ))

    expect(reorder.dragTransform(3)).toBe('translate(3px, 6px)')
  })
})

describe('useDeckGridReorder — jiggleStyle', () => {
  test('varies delay and duration CSS custom properties per index', () => {
    const container_el = ref(document.createElement('div'))
    let reorder
    ;({ app, result: reorder } = withSetup(() =>
      useDeckGridReorder(
        container_el,
        () => [deck(1)],
        () => true,
        () => 'base'
      )
    ))

    const a = reorder.jiggleStyle(0)
    const b = reorder.jiggleStyle(1)
    expect(a['--jiggle-delay']).not.toBe(b['--jiggle-delay'])
    expect(a['--jiggle-duration']).not.toBe(b['--jiggle-duration'])
  })

  test('sets a lighter --jiggle-rotation than the deck-view card grid default [obligation]', () => {
    const container_el = ref(document.createElement('div'))
    let reorder
    ;({ app, result: reorder } = withSetup(() =>
      useDeckGridReorder(
        container_el,
        () => [deck(1)],
        () => true,
        () => 'base'
      )
    ))

    expect(reorder.jiggleStyle(0)['--jiggle-rotation']).toBe('0.7deg')
  })
})

// ── onItemPointerdown ──────────────────────────────────────────────────────────

describe('useDeckGridReorder — onItemPointerdown', () => {
  test('is a no-op when not editing', () => {
    const container_el = ref(document.createElement('div'))
    let reorder
    let editing = false
    ;({ app, result: reorder } = withSetup(() =>
      useDeckGridReorder(
        container_el,
        () => [deck(1)],
        () => editing,
        () => 'base'
      )
    ))

    reorder.onItemPointerdown(0, pointerEvent('pointerdown', { pointerType: 'mouse' }))
    expect(reorder.dragging_index.value).toBeNull()
  })

  test('a mouse pointerdown begins the drag immediately (start is called on the drag engine)', () => {
    const container_el = ref(document.createElement('div'))
    const item_el = document.createElement('div')
    item_el.dataset.testid = 'deck-grid__item'
    const thumb_el = document.createElement('div')
    thumb_el.dataset.testid = 'deck-thumbnail'
    item_el.appendChild(thumb_el)
    document.body.appendChild(item_el)

    let reorder
    ;({ app, result: reorder } = withSetup(() =>
      useDeckGridReorder(
        container_el,
        () => [deck(1)],
        () => true,
        () => 'base'
      )
    ))

    const event = pointerEvent('pointerdown', { pointerType: 'mouse' })
    Object.defineProperty(event, 'target', { value: thumb_el })
    reorder.onItemPointerdown(0, event)

    // start(0) set dragging_index on the mocked engine; beginDrag then found
    // the matching deck-thumbnail child within the item and lifted it.
    expect(reorder.dragging_index.value).toBe(0)
    expect(liftListItemMock).toHaveBeenCalledWith(thumb_el)
    item_el.remove()
  })

  test('does not lift anything when the pointerdown target has no matching deck-grid__item ancestor', () => {
    const container_el = ref(document.createElement('div'))
    let reorder
    ;({ app, result: reorder } = withSetup(() =>
      useDeckGridReorder(
        container_el,
        () => [deck(1)],
        () => true,
        () => 'base'
      )
    ))

    const event = pointerEvent('pointerdown', { pointerType: 'mouse' })
    Object.defineProperty(event, 'target', { value: document.createElement('div') })
    reorder.onItemPointerdown(0, event)

    expect(liftListItemMock).not.toHaveBeenCalled()
  })

  test('a touch pointerdown does not begin the drag before the hold elapses', () => {
    const container_el = ref(document.createElement('div'))
    let reorder
    ;({ app, result: reorder } = withSetup(() =>
      useDeckGridReorder(
        container_el,
        () => [deck(1)],
        () => true,
        () => 'base'
      )
    ))

    const event = pointerEvent('pointerdown', { pointerType: 'touch', clientX: 0, clientY: 0 })
    reorder.onItemPointerdown(0, event)

    // No crash and no immediate drag start — the hold timer hasn't elapsed.
    expect(reorder.dragging_index.value).toBeNull()
  })

  test('a touch hold that elapses without moving begins the drag [obligation]', () => {
    vi.useFakeTimers()
    const container_el = ref(document.createElement('div'))
    const item_el = document.createElement('div')
    item_el.dataset.testid = 'deck-grid__item'
    const thumb_el = document.createElement('div')
    thumb_el.dataset.testid = 'deck-thumbnail'
    item_el.appendChild(thumb_el)
    document.body.appendChild(item_el)

    let reorder
    ;({ app, result: reorder } = withSetup(() =>
      useDeckGridReorder(
        container_el,
        () => [deck(1)],
        () => true,
        () => 'base'
      )
    ))

    const event = pointerEvent('pointerdown', { pointerType: 'touch', clientX: 0, clientY: 0 })
    Object.defineProperty(event, 'target', { value: thumb_el })
    reorder.onItemPointerdown(0, event)

    vi.advanceTimersByTime(300)

    expect(reorder.dragging_index.value).toBe(0)
    expect(liftListItemMock).toHaveBeenCalledWith(thumb_el)

    item_el.remove()
    vi.useRealTimers()
  })

  test('moving the finger past the hold tolerance cancels the pending hold [obligation]', () => {
    vi.useFakeTimers()
    const container_el = ref(document.createElement('div'))
    let reorder
    ;({ app, result: reorder } = withSetup(() =>
      useDeckGridReorder(
        container_el,
        () => [deck(1)],
        () => true,
        () => 'base'
      )
    ))

    const event = pointerEvent('pointerdown', { pointerType: 'touch', clientX: 0, clientY: 0 })
    reorder.onItemPointerdown(0, event)

    window.dispatchEvent(pointerEvent('pointermove', { clientX: 50, clientY: 50 }))
    vi.advanceTimersByTime(300)

    // The hold was cancelled by the move, so the drag never started.
    expect(reorder.dragging_index.value).toBeNull()
    expect(liftListItemMock).not.toHaveBeenCalled()

    vi.useRealTimers()
  })
})

// ── measured / geometry passthrough ────────────────────────────────────────────

describe('useDeckGridReorder — geometry passed to the drag engine', () => {
  test('row_count includes the trailing new-deck tile in its item count', () => {
    const container_el = ref(document.createElement('div'))
    let reorder
    ;({ app, result: reorder } = withSetup(() =>
      useDeckGridReorder(
        container_el,
        () => [deck(1), deck(2)],
        () => true,
        () => 'base'
      )
    ))

    last_resize_observer_callback([{ contentRect: { width: 620 } }])

    // 2 decks + 1 trailing new-deck tile = 3 items, 3 columns fit at 620px → 1 row
    expect(reorder.row_count.value).toBe(1)
  })

  test('geometry.idealIndex maps a horizontal drag delta to a fractional column offset [obligation]', () => {
    const container_el = ref(document.createElement('div'))
    ;({ app } = withSetup(() =>
      useDeckGridReorder(
        container_el,
        () => [deck(1), deck(2), deck(3)],
        () => true,
        () => 'base'
      )
    ))

    last_resize_observer_callback([{ contentRect: { width: 620 } }])

    const { idealIndex } = reorderDragState.captured_opts.geometry
    // 3 columns fit at 620px (cell_width 192 + gap 12 = 204px/slot). Dragging
    // from index 0 by exactly one cell+gap width to the right lands on
    // column 1 of the same row.
    expect(idealIndex(0, 204, 0)).toBeCloseTo(1)
  })

  test('geometry.position delegates to itemPosition', () => {
    const container_el = ref(document.createElement('div'))
    ;({ app } = withSetup(() =>
      useDeckGridReorder(
        container_el,
        () => [deck(1), deck(2)],
        () => true,
        () => 'base'
      )
    ))

    expect(reorderDragState.captured_opts.geometry.position).toBeInstanceOf(Function)
  })
})

describe('useDeckGridReorder — measured', () => {
  test('is false until the container has been measured (width > 0)', () => {
    const container_el = ref(document.createElement('div'))
    let reorder
    ;({ app, result: reorder } = withSetup(() =>
      useDeckGridReorder(
        container_el,
        () => [deck(1)],
        () => true,
        () => 'base'
      )
    ))

    expect(reorder.measured.value).toBe(false)
  })

  test('becomes true once the resize observer reports a non-zero width [obligation]', () => {
    const container_el = ref(document.createElement('div'))
    let reorder
    ;({ app, result: reorder } = withSetup(() =>
      useDeckGridReorder(
        container_el,
        () => [deck(1)],
        () => true,
        () => 'base'
      )
    ))

    last_resize_observer_callback([{ contentRect: { width: 620 } }])

    expect(reorder.measured.value).toBe(true)
    expect(reorder.cell_width.value).toBe(192)
  })

  test('ignores a resize entry callback fired with no entry', () => {
    const container_el = ref(document.createElement('div'))
    let reorder
    ;({ app, result: reorder } = withSetup(() =>
      useDeckGridReorder(
        container_el,
        () => [deck(1)],
        () => true,
        () => 'base'
      )
    ))

    expect(() => last_resize_observer_callback([])).not.toThrow()
    expect(reorder.measured.value).toBe(false)
  })
})

// ── drop-settle watch ──────────────────────────────────────────────────────────

describe('useDeckGridReorder — settling the lifted card on drag end', () => {
  test('drops the lifted card once dragging_index returns to null [obligation]', async () => {
    const container_el = ref(document.createElement('div'))
    const item_el = document.createElement('div')
    item_el.dataset.testid = 'deck-grid__item'
    const thumb_el = document.createElement('div')
    thumb_el.dataset.testid = 'deck-thumbnail'
    item_el.appendChild(thumb_el)
    document.body.appendChild(item_el)

    let reorder
    ;({ app, result: reorder } = withSetup(() =>
      useDeckGridReorder(
        container_el,
        () => [deck(1), deck(2)],
        () => true,
        () => 'base'
      )
    ))

    const event = pointerEvent('pointerdown', { pointerType: 'mouse' })
    Object.defineProperty(event, 'target', { value: thumb_el })
    reorder.onItemPointerdown(0, event)
    expect(reorder.dragging_index.value).toBe(0)
    // Let the watch register the non-null → this transition before flipping
    // back to null, otherwise both mutations coalesce into a single no-op
    // flush (same value before/after).
    await nextTick()

    // The drag engine clears dragging_index on drop (simulated directly here
    // since the real engine is mocked out).
    reorderDragState.dragging_index.value = null
    await nextTick()

    expect(dropListItemMock).toHaveBeenCalledWith(thumb_el)
    item_el.remove()
  })
})
