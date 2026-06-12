import { describe, test, expect, afterEach, beforeEach, vi } from 'vite-plus/test'
import { createApp, ref, nextTick } from 'vue'

const { mockMoveReaderCursor, mockHideReaderCursor, mockEmitSfx } = vi.hoisted(() => ({
  mockMoveReaderCursor: vi.fn(),
  mockHideReaderCursor: vi.fn(),
  mockEmitSfx: vi.fn()
}))

vi.mock('@/utils/animations/reader-cursor', () => ({
  moveReaderCursor: mockMoveReaderCursor,
  hideReaderCursor: mockHideReaderCursor
}))
vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx, emitHoverSfx: vi.fn() }))
vi.mock('@/utils/animations/transcript-scroll', () => ({ scrollLineIntoView: vi.fn() }))
// usePlayOnTap mock must not use `ref` in the factory — vi.mock hoists before imports.
vi.mock('@/composables/use-play-on-tap', () => ({
  usePlayOnTap: () => {
    const { ref: vueRef } = require('vue')
    return { playing: vueRef(false), interceptClick: vi.fn() }
  }
}))

// ResizeObserver is not in jsdom — stub it globally so onMounted can construct one.
class FakeResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', FakeResizeObserver)

// jsdom does not ship PointerEvent — provide a minimal plain-object implementation.
// We avoid extending Event because clientX/clientY/currentTarget are all read-only
// on the native class; plain objects sidestep that.
function makeFakePointerEvent(type, init = {}) {
  return {
    type,
    bubbles: true,
    cancelable: true,
    pointerType: init.pointerType ?? '',
    pointerId: init.pointerId ?? 1,
    clientX: init.clientX ?? 0,
    clientY: init.clientY ?? 0,
    currentTarget: { setPointerCapture: () => {} },
    preventDefault: () => {},
    stopImmediatePropagation: () => {}
  }
}
// Expose as a constructor so `new PointerEvent(...)` works in tests.
function FakePointerEvent(type, init) {
  return makeFakePointerEvent(type, init)
}
vi.stubGlobal('PointerEvent', FakePointerEvent)

import { useReaderHighlights } from '@/composables/audio-reader/use-reader-highlights'

let app = null
let originalElementFromPoint = null

afterEach(() => {
  app?.unmount()
  app = null
  // Restore document.elementFromPoint if we replaced it
  if (originalElementFromPoint !== null) {
    document.elementFromPoint = originalElementFromPoint
    originalElementFromPoint = null
  }
  vi.clearAllMocks()
})

/**
 * Temporarily replace document.elementFromPoint (jsdom does not define it,
 * so vi.spyOn fails). Returns a setter to change the return value per-test.
 */
function stubElementFromPoint(returnFn) {
  if (!('elementFromPoint' in document)) {
    originalElementFromPoint = null
    document.elementFromPoint = returnFn
  } else {
    originalElementFromPoint = document.elementFromPoint
    document.elementFromPoint = returnFn
  }
}

/**
 * Mount the composable in a host component that renders `ref="content"` and
 * `ref="hover"` DOM nodes. `useTemplateRef` resolves these names from the
 * component instance, so words appended to contentEl are reachable via the
 * internal `content.value?.querySelector(...)` calls inside the composable.
 */
function withHighlights({ active_word = ref(-1), popover_open = ref(false) } = {}) {
  const { h: vueH, defineComponent } = require('vue')
  let result

  const container = document.createElement('div')
  document.body.appendChild(container)

  const onSelect = vi.fn()
  const onDismiss = vi.fn()

  const HostComponent = defineComponent({
    setup() {
      result = useReaderHighlights(
        () => active_word.value,
        onSelect,
        () => popover_open.value,
        onDismiss
      )
      return () =>
        vueH('div', {}, [
          vueH('div', { ref: 'content', 'data-testid': 'content' }),
          vueH('div', { ref: 'hover', 'data-testid': 'hover' })
        ])
    }
  })

  app = createApp(HostComponent)
  app.mount(container)

  // The refs are populated after mount — grab the real DOM elements
  const contentEl = container.querySelector('[data-testid="content"]')
  const hoverEl = container.querySelector('[data-testid="hover"]')

  return { result, onSelect, onDismiss, contentEl, hoverEl, container }
}

/**
 * Add a fake word element to a container.
 */
function addWord(container, index, text = `word${index}`) {
  const el = document.createElement('span')
  el.setAttribute('data-word-index', String(index))
  el.setAttribute('data-word-text', text)
  const base = document.createElement('span')
  base.setAttribute('data-word-base', '')
  el.appendChild(base)
  container.appendChild(el)
  return el
}

describe('useReaderHighlights', () => {
  describe('return shape', () => {
    test('returns expected handler keys', () => {
      const { result } = withHighlights()

      expect(result).toMatchObject({
        interaction_range: expect.any(Object),
        onPointerDown: expect.any(Function),
        onPointerMove: expect.any(Function),
        onPointerUp: expect.any(Function),
        onPointerLeave: expect.any(Function),
        onPointerCancel: expect.any(Function)
      })
    })
  })

  describe('interaction_range', () => {
    test('is null when no pointer activity has occurred', () => {
      const { result } = withHighlights()

      expect(result.interaction_range.value).toBeNull()
    })
  })

  describe('mouse drag', () => {
    test('pointerdown on a word sets interaction_range to that word', async () => {
      const { result, contentEl } = withHighlights()
      const wordEl = addWord(contentEl, 3)

      stubElementFromPoint(() => wordEl)

      result.onPointerDown(
        new PointerEvent('pointerdown', { pointerType: 'mouse', clientX: 50, clientY: 50 })
      )
      await nextTick()

      expect(result.interaction_range.value).toEqual({ lo: 3, hi: 3 })
    })

    test('pointermove extends the range while dragging', async () => {
      const { result, contentEl } = withHighlights()
      const wordEl3 = addWord(contentEl, 3)
      const wordEl5 = addWord(contentEl, 5)

      stubElementFromPoint(() => wordEl3)
      result.onPointerDown(
        new PointerEvent('pointerdown', { pointerType: 'mouse', clientX: 50, clientY: 50 })
      )

      // Move to word 5
      document.elementFromPoint = () => wordEl5
      result.onPointerMove(
        new PointerEvent('pointermove', { pointerType: 'mouse', clientX: 100, clientY: 50 })
      )
      await nextTick()

      expect(result.interaction_range.value).toEqual({ lo: 3, hi: 5 })
    })

    test('pointerup calls onSelect with the committed range', async () => {
      const { result, contentEl, onSelect } = withHighlights()
      const wordEl2 = addWord(contentEl, 2, '選択')

      const base2 = wordEl2.querySelector('[data-word-base]')
      base2.getBoundingClientRect = () => new DOMRect(10, 10, 30, 20)
      contentEl.getBoundingClientRect = () => new DOMRect(0, 0, 300, 200)

      stubElementFromPoint(() => wordEl2)
      result.onPointerDown(
        new PointerEvent('pointerdown', { pointerType: 'mouse', clientX: 20, clientY: 20 })
      )
      result.onPointerUp(
        new PointerEvent('pointerup', { pointerType: 'mouse', clientX: 20, clientY: 20 })
      )
      await nextTick()

      expect(onSelect).toHaveBeenCalledTimes(1)
      expect(onSelect.mock.calls[0][0]).toMatchObject({ index: 2, end_index: 2 })
    })

    test('pointerup on a multi-word drag commits ordered range', async () => {
      const { result, contentEl, onSelect } = withHighlights()
      const wordEl2 = addWord(contentEl, 2, '選択')
      const wordEl4 = addWord(contentEl, 4, '範囲')

      const base2 = wordEl2.querySelector('[data-word-base]')
      const base4 = wordEl4.querySelector('[data-word-base]')
      base2.getBoundingClientRect = () => new DOMRect(10, 10, 30, 20)
      base4.getBoundingClientRect = () => new DOMRect(50, 10, 30, 20)
      contentEl.getBoundingClientRect = () => new DOMRect(0, 0, 300, 200)

      stubElementFromPoint(() => wordEl2)
      result.onPointerDown(
        new PointerEvent('pointerdown', { pointerType: 'mouse', clientX: 20, clientY: 20 })
      )

      document.elementFromPoint = () => wordEl4
      result.onPointerMove(
        new PointerEvent('pointermove', { pointerType: 'mouse', clientX: 60, clientY: 20 })
      )
      result.onPointerUp(
        new PointerEvent('pointerup', { pointerType: 'mouse', clientX: 60, clientY: 20 })
      )
      await nextTick()

      expect(onSelect.mock.calls[0][0]).toMatchObject({ index: 2, end_index: 4 })
    })
  })

  describe('pointer leave', () => {
    test('onPointerLeave clears focus when not dragging', async () => {
      const { result, contentEl } = withHighlights()
      const wordEl = addWord(contentEl, 1)

      stubElementFromPoint(() => wordEl)
      result.onPointerMove(
        new PointerEvent('pointermove', { pointerType: 'mouse', clientX: 10, clientY: 10 })
      )
      await nextTick()
      expect(result.interaction_range.value).toEqual({ lo: 1, hi: 1 })

      result.onPointerLeave(new PointerEvent('pointerleave', { pointerType: 'mouse' }))
      await nextTick()

      expect(result.interaction_range.value).toBeNull()
    })

    test('onPointerLeave does NOT clear focus mid-drag', async () => {
      const { result, contentEl } = withHighlights()
      const wordEl = addWord(contentEl, 1)

      stubElementFromPoint(() => wordEl)
      // Begin drag
      result.onPointerDown(
        new PointerEvent('pointerdown', { pointerType: 'mouse', clientX: 10, clientY: 10 })
      )
      await nextTick()

      result.onPointerLeave(new PointerEvent('pointerleave', { pointerType: 'mouse' }))
      await nextTick()

      // Anchor is set, so interaction range is still active
      expect(result.interaction_range.value).not.toBeNull()
    })
  })

  describe('pointer cancel', () => {
    test('onPointerCancel clears interaction_range', async () => {
      const { result, contentEl } = withHighlights()
      const wordEl = addWord(contentEl, 2)

      stubElementFromPoint(() => wordEl)
      result.onPointerDown(
        new PointerEvent('pointerdown', { pointerType: 'mouse', clientX: 10, clientY: 10 })
      )
      await nextTick()
      expect(result.interaction_range.value).not.toBeNull()

      result.onPointerCancel(new PointerEvent('pointercancel', { pointerType: 'mouse' }))
      await nextTick()

      expect(result.interaction_range.value).toBeNull()
    })
  })

  describe('touch tap', () => {
    test('touch pointerdown does NOT immediately set interaction_range', async () => {
      const { result, contentEl } = withHighlights()
      const wordEl = addWord(contentEl, 1)

      stubElementFromPoint(() => wordEl)
      result.onPointerDown(
        new PointerEvent('pointerdown', { pointerType: 'touch', clientX: 10, clientY: 10 })
      )
      await nextTick()

      // Touch defers selection to pointerup
      expect(result.interaction_range.value).toBeNull()
    })

    test('stationary touch releases commit a single-word selection', async () => {
      const { result, contentEl, onSelect } = withHighlights()
      const wordEl = addWord(contentEl, 4, '日本語')

      const base = wordEl.querySelector('[data-word-base]')
      base.getBoundingClientRect = () => new DOMRect(20, 20, 40, 20)
      contentEl.getBoundingClientRect = () => new DOMRect(0, 0, 300, 500)

      stubElementFromPoint(() => wordEl)
      result.onPointerDown(
        new PointerEvent('pointerdown', { pointerType: 'touch', clientX: 40, clientY: 30 })
      )
      // Minimal drift (< 10px TAP_SLOP)
      result.onPointerMove(
        new PointerEvent('pointermove', { pointerType: 'touch', clientX: 41, clientY: 30 })
      )
      result.onPointerUp(
        new PointerEvent('pointerup', { pointerType: 'touch', clientX: 41, clientY: 30 })
      )
      await nextTick()

      expect(onSelect).toHaveBeenCalledTimes(1)
      expect(onSelect.mock.calls[0][0]).toMatchObject({ index: 4, end_index: 4 })
    })

    test('touch drift past TAP_SLOP is treated as scroll — does not call onSelect', async () => {
      const { result, contentEl, onSelect } = withHighlights()
      const wordEl = addWord(contentEl, 1)

      stubElementFromPoint(() => wordEl)
      result.onPointerDown(
        new PointerEvent('pointerdown', { pointerType: 'touch', clientX: 10, clientY: 10 })
      )
      // Drift well past the 10px slop
      result.onPointerMove(
        new PointerEvent('pointermove', { pointerType: 'touch', clientX: 10, clientY: 50 })
      )
      result.onPointerUp(
        new PointerEvent('pointerup', { pointerType: 'touch', clientX: 10, clientY: 50 })
      )
      await nextTick()

      expect(onSelect).not.toHaveBeenCalled()
    })

    test('touch tap on empty space calls onDismiss', async () => {
      const { result, contentEl, onDismiss } = withHighlights()

      // No word element — closest('[data-word-index]') returns null
      stubElementFromPoint(() => contentEl)

      result.onPointerDown(
        new PointerEvent('pointerdown', { pointerType: 'touch', clientX: 200, clientY: 200 })
      )
      result.onPointerUp(
        new PointerEvent('pointerup', { pointerType: 'touch', clientX: 200, clientY: 200 })
      )
      await nextTick()

      expect(onDismiss).toHaveBeenCalledTimes(1)
    })
  })

  describe('long-press range-select', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    test('long-press arms range-select — interaction_range appears after 400ms', async () => {
      const { result, contentEl } = withHighlights()
      const wordEl = addWord(contentEl, 2)

      stubElementFromPoint(() => wordEl)
      result.onPointerDown(
        new PointerEvent('pointerdown', { pointerType: 'touch', clientX: 20, clientY: 20 })
      )
      await nextTick()
      // Not armed yet
      expect(result.interaction_range.value).toBeNull()

      // Advance past LONG_PRESS_MS (400ms)
      vi.advanceTimersByTime(410)
      await nextTick()

      // Range-select is now armed on word 2
      expect(result.interaction_range.value).toEqual({ lo: 2, hi: 2 })
    })

    test('long-press emits ui.tap_05 when armed', async () => {
      const { result, contentEl } = withHighlights()
      const wordEl = addWord(contentEl, 3)

      stubElementFromPoint(() => wordEl)
      result.onPointerDown(
        new PointerEvent('pointerdown', { pointerType: 'touch', clientX: 30, clientY: 30 })
      )

      vi.advanceTimersByTime(410)
      await nextTick()

      expect(mockEmitSfx).toHaveBeenCalledWith('ui.tap_05')
    })

    test('drifting past slop before long-press cancels the arm', async () => {
      const { result, contentEl } = withHighlights()
      const wordEl = addWord(contentEl, 1)

      stubElementFromPoint(() => wordEl)
      result.onPointerDown(
        new PointerEvent('pointerdown', { pointerType: 'touch', clientX: 10, clientY: 10 })
      )
      // Drift past slop before 400ms
      result.onPointerMove(
        new PointerEvent('pointermove', { pointerType: 'touch', clientX: 10, clientY: 50 })
      )

      vi.advanceTimersByTime(410)
      await nextTick()

      // Timer was cancelled on drift — no selection armed
      expect(result.interaction_range.value).toBeNull()
    })

    test('extending a long-press drag to a second word emits ui.tap_05', async () => {
      const { result, contentEl } = withHighlights()
      const wordEl1 = addWord(contentEl, 1)
      const wordEl2 = addWord(contentEl, 2)

      stubElementFromPoint(() => wordEl1)
      result.onPointerDown(
        new PointerEvent('pointerdown', { pointerType: 'touch', clientX: 10, clientY: 10 })
      )
      vi.advanceTimersByTime(410)
      await nextTick()
      mockEmitSfx.mockClear()

      // Drag to word 2 — each new word ticks tap_05
      document.elementFromPoint = () => wordEl2
      result.onPointerMove(
        new PointerEvent('pointermove', { pointerType: 'touch', clientX: 30, clientY: 10 })
      )
      await nextTick()

      expect(result.interaction_range.value).toEqual({ lo: 1, hi: 2 })
      expect(mockEmitSfx).toHaveBeenCalledWith('ui.tap_05')
    })
  })

  describe('selection_preview', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    test('is null before any pointer activity', () => {
      const { result } = withHighlights()

      expect(result.selection_preview.value).toBeNull()
    })

    test('is non-null the instant a touch long-press arms with NO drag [obligation]', async () => {
      const { result, contentEl } = withHighlights()
      const wordEl = addWord(contentEl, 1, '語')
      const base = wordEl.querySelector('[data-word-base]')
      base.getBoundingClientRect = () => new DOMRect(10, 50, 40, 20)

      stubElementFromPoint(() => wordEl)
      result.onPointerDown(
        new PointerEvent('pointerdown', { pointerType: 'touch', clientX: 30, clientY: 55 })
      )
      await nextTick()

      // Not armed yet — preview is null before the long-press fires
      expect(result.selection_preview.value).toBeNull()

      // Advance past LONG_PRESS_MS (400ms) without any pointermove
      vi.advanceTimersByTime(500)
      await nextTick()

      // IMMEDIATELY non-null — no drag required [regression guard]
      expect(result.selection_preview.value).not.toBeNull()
    })

    test('selection_preview shape has text, x, top, bottom [obligation]', async () => {
      const { result, contentEl } = withHighlights()
      const wordEl = addWord(contentEl, 2, '日本語')
      const base = wordEl.querySelector('[data-word-base]')
      base.getBoundingClientRect = () => new DOMRect(10, 80, 60, 24)

      stubElementFromPoint(() => wordEl)
      result.onPointerDown(
        new PointerEvent('pointerdown', { pointerType: 'touch', clientX: 40, clientY: 90 })
      )

      vi.advanceTimersByTime(500)
      await nextTick()

      const preview = result.selection_preview.value
      expect(preview).not.toBeNull()
      // text from the word
      expect(typeof preview.text).toBe('string')
      // x comes from the finger's clientX at the time of arming (tap.x)
      expect(preview.x).toBe(40)
      // top/bottom come from the focus word's base-element rect
      expect(preview.top).toBe(80)
      expect(preview.bottom).toBe(80 + 24)
    })

    test('selection_preview stays null for mouse pointerdown + drag [obligation]', async () => {
      const { result, contentEl } = withHighlights()
      const wordEl1 = addWord(contentEl, 0, 'Hello')
      const wordEl2 = addWord(contentEl, 1, 'World')
      const base1 = wordEl1.querySelector('[data-word-base]')
      const base2 = wordEl2.querySelector('[data-word-base]')
      base1.getBoundingClientRect = () => new DOMRect(0, 50, 40, 20)
      base2.getBoundingClientRect = () => new DOMRect(50, 50, 40, 20)
      contentEl.getBoundingClientRect = () => new DOMRect(0, 0, 300, 200)

      stubElementFromPoint(() => wordEl1)
      result.onPointerDown(
        new PointerEvent('pointerdown', { pointerType: 'mouse', clientX: 10, clientY: 55 })
      )
      await nextTick()

      document.elementFromPoint = () => wordEl2
      result.onPointerMove(
        new PointerEvent('pointermove', { pointerType: 'mouse', clientX: 60, clientY: 55 })
      )
      await nextTick()

      // Mouse drag must never produce a selection_preview
      expect(result.selection_preview.value).toBeNull()
    })

    test('selection_preview resets to null after commitTouch (pointerup) [obligation]', async () => {
      const { result, contentEl } = withHighlights()
      const wordEl = addWord(contentEl, 3, '選')
      const base = wordEl.querySelector('[data-word-base]')
      base.getBoundingClientRect = () => new DOMRect(10, 50, 30, 20)
      contentEl.getBoundingClientRect = () => new DOMRect(0, 0, 300, 200)

      stubElementFromPoint(() => wordEl)
      result.onPointerDown(
        new PointerEvent('pointerdown', { pointerType: 'touch', clientX: 25, clientY: 55 })
      )
      vi.advanceTimersByTime(500)
      await nextTick()

      expect(result.selection_preview.value).not.toBeNull()

      result.onPointerUp(
        new PointerEvent('pointerup', { pointerType: 'touch', clientX: 25, clientY: 55 })
      )
      await nextTick()

      expect(result.selection_preview.value).toBeNull()
    })

    test('selection_preview resets to null after onPointerCancel [obligation]', async () => {
      const { result, contentEl } = withHighlights()
      const wordEl = addWord(contentEl, 4, '語')
      const base = wordEl.querySelector('[data-word-base]')
      base.getBoundingClientRect = () => new DOMRect(10, 50, 30, 20)

      stubElementFromPoint(() => wordEl)
      result.onPointerDown(
        new PointerEvent('pointerdown', { pointerType: 'touch', clientX: 25, clientY: 55 })
      )
      vi.advanceTimersByTime(500)
      await nextTick()

      expect(result.selection_preview.value).not.toBeNull()

      result.onPointerCancel(new PointerEvent('pointercancel', { pointerType: 'touch' }))
      await nextTick()

      expect(result.selection_preview.value).toBeNull()
    })
  })

  describe('popover_open watcher', () => {
    test('committed range is cleared when popover_open goes false', async () => {
      // Start with popover open (true) so closing it (false) triggers the watcher.
      const popover_open = ref(true)
      const { result, contentEl, onSelect } = withHighlights({ popover_open })
      const wordEl = addWord(contentEl, 1, '語')

      const base = wordEl.querySelector('[data-word-base]')
      base.getBoundingClientRect = () => new DOMRect(10, 10, 30, 20)
      contentEl.getBoundingClientRect = () => new DOMRect(0, 0, 300, 400)

      stubElementFromPoint(() => wordEl)

      // Commit via mouse click
      result.onPointerDown(
        new PointerEvent('pointerdown', { pointerType: 'mouse', clientX: 20, clientY: 20 })
      )
      result.onPointerUp(
        new PointerEvent('pointerup', { pointerType: 'mouse', clientX: 20, clientY: 20 })
      )
      await nextTick()
      expect(onSelect).toHaveBeenCalledTimes(1)

      // Mouse leaves, then popover closes — committed should clear.
      result.onPointerLeave(new PointerEvent('pointerleave', { pointerType: 'mouse' }))
      await nextTick()
      popover_open.value = false
      await nextTick()

      // Both committed and hover focus are gone → interaction_range is null
      expect(result.interaction_range.value).toBeNull()
    })
  })

  describe('hover does not override committed selection', () => {
    test('pointermove during open popover does not change interaction_range', async () => {
      const popover_open = ref(false)
      const { result, contentEl } = withHighlights({ popover_open })
      const wordEl0 = addWord(contentEl, 0, '一')
      const wordEl1 = addWord(contentEl, 1, '二')

      const base0 = wordEl0.querySelector('[data-word-base]')
      base0.getBoundingClientRect = () => new DOMRect(10, 10, 20, 20)
      contentEl.getBoundingClientRect = () => new DOMRect(0, 0, 300, 400)

      stubElementFromPoint(() => wordEl0)

      // Commit word 0 via mouse click
      result.onPointerDown(
        new PointerEvent('pointerdown', { pointerType: 'mouse', clientX: 15, clientY: 15 })
      )
      result.onPointerUp(
        new PointerEvent('pointerup', { pointerType: 'mouse', clientX: 15, clientY: 15 })
      )
      await nextTick()

      // Open popover so hover is locked out
      popover_open.value = true
      await nextTick()

      // Hover over word 1 — should not change the selection
      document.elementFromPoint = () => wordEl1
      result.onPointerMove(
        new PointerEvent('pointermove', { pointerType: 'mouse', clientX: 50, clientY: 15 })
      )
      await nextTick()

      // interaction_range still reflects committed word 0
      expect(result.interaction_range.value).toEqual({ lo: 0, hi: 0 })
    })
  })
})
