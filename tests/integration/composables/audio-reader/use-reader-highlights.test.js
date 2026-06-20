import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { useReaderHighlights } from '@/composables/audio-reader/reader-highlights'

const { emitSfxMock } = vi.hoisted(() => ({ emitSfxMock: vi.fn() }))

vi.mock('@/sfx/bus', () => ({
  emitSfx: emitSfxMock,
  emitHoverSfx: vi.fn()
}))

const { moveMock, hideMock, scrollMock } = vi.hoisted(() => ({
  moveMock: vi.fn(),
  hideMock: vi.fn(),
  scrollMock: vi.fn()
}))

// Mock the animator so positioning is observable as calls (real geometry is zero
// in the test DOM anyway); selection behaviour is asserted via these.
vi.mock('@/utils/animations/reader-cursor', () => ({
  moveReaderCursor: moveMock,
  hideReaderCursor: hideMock
}))

// Mock the scroll animators so following the active word is observable as a
// call; the real gsap scrolling is exercised in transcript-scroll's own tests.
vi.mock('@/utils/animations/transcript-scroll', () => ({
  cancelScroll: vi.fn(),
  scrollLineIntoView: scrollMock,
  scrollWordIntoDeadzone: scrollMock
}))

// Host wiring the composable's pointer handlers + template refs, with words
// carrying the stable data-word-index handle (including a punctuation-only one).
const Host = defineComponent({
  props: {
    activeWord: { type: Number, default: -1 },
    open: { type: Boolean, default: false },
    onSelect: { type: Function, default: () => {} },
    onDismiss: { type: Function, default: () => {} }
  },
  setup(props) {
    return useReaderHighlights(
      () => props.activeWord,
      props.onSelect,
      () => props.open,
      props.onDismiss
    )
  },
  render() {
    return h(
      'div',
      {
        ref: 'content',
        'data-testid': 'content',
        onPointerdown: this.onPointerDown,
        onPointermove: this.onPointerMove,
        onPointerup: this.onPointerUp,
        onPointerleave: this.onPointerLeave
      },
      [
        // Pre-register three pill elements so hover_el_pool is populated and
        // moveReaderCursor is callable. Enough for single- and multi-line tests.
        h('div', { ref: (el) => this.setHoverEl(el, 0), 'data-testid': 'hover-pill-0' }),
        h('div', { ref: (el) => this.setHoverEl(el, 1), 'data-testid': 'hover-pill-1' }),
        h('div', { ref: (el) => this.setHoverEl(el, 2), 'data-testid': 'hover-pill-2' }),
        h('div', { 'data-testid': 'transcript-segment', 'data-index': '0' }, [
          h(
            'span',
            { 'data-testid': 'w0', 'data-word-index': '0', 'data-word-text': 'Hello ' },
            'Hello '
          ),
          h(
            'span',
            { 'data-testid': 'w1', 'data-word-index': '1', 'data-word-text': 'world' },
            'world'
          ),
          h('span', { 'data-testid': 'w2', 'data-word-index': '2', 'data-word-text': '. ' }, '. ')
        ])
      ]
    )
  }
})

describe('useReaderHighlights', () => {
  let words
  let mounted = []

  // The composable hit-tests via elementFromPoint; map a synthetic clientX (the
  // word index) onto its element so the gesture is deterministic, not layout-bound.
  function mountHost(onSelect, onDismiss) {
    const wrapper = mount(Host, { props: { onSelect, onDismiss } })
    mounted.push(wrapper)
    words = ['w0', 'w1', 'w2'].map((id) => wrapper.find(`[data-testid="${id}"]`).element)
    vi.spyOn(document, 'elementFromPoint').mockImplementation((x) => words[x] ?? null)
    return wrapper
  }

  function pointer(wrapper, type, index, buttons) {
    words[index].dispatchEvent(
      new PointerEvent(type, { bubbles: true, pointerId: 1, buttons, clientX: index, clientY: 0 })
    )
    return wrapper.vm.$nextTick()
  }

  // A touch over word `index`, optionally drifted `y` px down (the hit-test keys
  // off clientX = index, so vertical drift moves the finger without leaving the
  // word). Carries pointerType 'touch' so the composable takes its tap path.
  function touch(wrapper, type, index, y = 0) {
    words[index].dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        pointerId: 1,
        pointerType: 'touch',
        clientX: index,
        clientY: y
      })
    )
    return wrapper.vm.$nextTick()
  }

  beforeEach(() => {
    moveMock.mockClear()
    hideMock.mockClear()
    scrollMock.mockClear()
  })

  afterEach(() => {
    mounted.forEach((wrapper) => wrapper.unmount())
    mounted = []
    vi.restoreAllMocks()
  })

  describe('click-to-select one word', () => {
    test('a press and release on a word commits its cleaned term', async () => {
      const onSelect = vi.fn()
      const wrapper = mountHost(onSelect)

      await pointer(wrapper, 'pointerdown', 1, 1)
      await pointer(wrapper, 'pointerup', 1, 0)

      expect(onSelect).toHaveBeenCalledTimes(1)
      expect(onSelect.mock.calls[0][0].term).toBe('world')
      expect(onSelect.mock.calls[0][0].anchor).toBe(words[1])
    })

    test('does not commit a punctuation-only word', async () => {
      const onSelect = vi.fn()
      const wrapper = mountHost(onSelect)

      await pointer(wrapper, 'pointerdown', 2, 1)
      await pointer(wrapper, 'pointerup', 2, 0)

      expect(onSelect).not.toHaveBeenCalled()
    })
  })

  describe('drag-to-select a range', () => {
    test('a drag across words commits the joined term', async () => {
      const onSelect = vi.fn()
      const wrapper = mountHost(onSelect)

      await pointer(wrapper, 'pointerdown', 0, 1)
      await pointer(wrapper, 'pointermove', 1, 1)
      await pointer(wrapper, 'pointerup', 1, 0)

      expect(onSelect.mock.calls[0][0].term).toBe('Hello world')
    })

    test('strips trailing punctuation swept into the range', async () => {
      const onSelect = vi.fn()
      const wrapper = mountHost(onSelect)

      await pointer(wrapper, 'pointerdown', 0, 1)
      await pointer(wrapper, 'pointermove', 2, 1)
      await pointer(wrapper, 'pointerup', 2, 0)

      expect(onSelect.mock.calls[0][0].term).toBe('Hello world')
    })

    test('anchors the term to the first word of the range regardless of drag direction', async () => {
      const onSelect = vi.fn()
      const wrapper = mountHost(onSelect)

      // drag right-to-left: press word 1, drag back to word 0
      await pointer(wrapper, 'pointerdown', 1, 1)
      await pointer(wrapper, 'pointermove', 0, 1)
      await pointer(wrapper, 'pointerup', 0, 0)

      expect(onSelect.mock.calls[0][0].term).toBe('Hello world')
      expect(onSelect.mock.calls[0][0].anchor).toBe(words[0])
    })
  })

  describe('touch selects on release, not on press', () => {
    test('a stationary tap commits the word on release', async () => {
      const onSelect = vi.fn()
      const wrapper = mountHost(onSelect)

      await touch(wrapper, 'pointerdown', 1)
      expect(onSelect).not.toHaveBeenCalled()

      await touch(wrapper, 'pointerup', 1)

      expect(onSelect).toHaveBeenCalledTimes(1)
      expect(onSelect.mock.calls[0][0].term).toBe('world')
    })

    test('press does not claim the gesture, so the column can still scroll', async () => {
      const wrapper = mountHost(vi.fn())
      const prevent = vi.fn()

      const event = new PointerEvent('pointerdown', {
        bubbles: true,
        pointerId: 1,
        pointerType: 'touch',
        clientX: 1,
        clientY: 0
      })
      event.preventDefault = prevent
      words[1].dispatchEvent(event)
      await wrapper.vm.$nextTick()

      expect(prevent).not.toHaveBeenCalled()
    })

    test('a touch that drifts past the slop is a scroll and commits nothing', async () => {
      const onSelect = vi.fn()
      const wrapper = mountHost(onSelect)

      await touch(wrapper, 'pointerdown', 1)
      await touch(wrapper, 'pointermove', 1, 40)
      await touch(wrapper, 'pointerup', 1, 40)

      expect(onSelect).not.toHaveBeenCalled()
    })

    test('a touch that drifts within the slop still commits', async () => {
      const onSelect = vi.fn()
      const wrapper = mountHost(onSelect)

      await touch(wrapper, 'pointerdown', 1)
      await touch(wrapper, 'pointermove', 1, 5)
      await touch(wrapper, 'pointerup', 1, 5)

      expect(onSelect).toHaveBeenCalledTimes(1)
      expect(onSelect.mock.calls[0][0].term).toBe('world')
    })
  })

  describe('selection persists while the popover is open', () => {
    test('hover does not steal the pill from a committed selection', async () => {
      const wrapper = mountHost(vi.fn())

      await pointer(wrapper, 'pointerdown', 0, 1)
      await pointer(wrapper, 'pointerup', 0, 0)
      await wrapper.setProps({ open: true })

      moveMock.mockClear()
      await pointer(wrapper, 'pointermove', 2, 0)

      expect(moveMock).not.toHaveBeenCalled()
    })

    test('hover resumes once the popover closes', async () => {
      const wrapper = mountHost(vi.fn())

      await pointer(wrapper, 'pointerdown', 0, 1)
      await pointer(wrapper, 'pointerup', 0, 0)
      await wrapper.setProps({ open: true })
      await wrapper.setProps({ open: false })

      moveMock.mockClear()
      await pointer(wrapper, 'pointermove', 2, 0)
      // positionInteraction is async — awaits a nextTick before calling moveReaderCursor
      await flushPromises()

      expect(moveMock).toHaveBeenCalled()
    })
  })

  describe('gesture guards', () => {
    test('a press that does not land on a word commits nothing', async () => {
      const onSelect = vi.fn()
      const wrapper = mountHost(onSelect)
      document.elementFromPoint.mockReturnValue(null)

      wrapper
        .find('[data-testid="content"]')
        .element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }))
      await pointer(wrapper, 'pointerup', 1, 0)

      expect(onSelect).not.toHaveBeenCalled()
    })
  })

  describe('swallows the gesture compatibility click', () => {
    test('stops a click originating inside the reader from reaching document handlers', () => {
      const wrapper = mountHost(vi.fn())
      const onDocClick = vi.fn()
      document.addEventListener('click', onDocClick, true)

      words[1].dispatchEvent(new MouseEvent('click', { bubbles: true }))

      document.removeEventListener('click', onDocClick, true)
      wrapper.unmount()
      expect(onDocClick).not.toHaveBeenCalled()
    })

    test('lets a click outside the reader reach document handlers', () => {
      const wrapper = mountHost(vi.fn())
      const onDocClick = vi.fn()
      document.addEventListener('click', onDocClick, true)

      const outside = document.createElement('button')
      document.body.appendChild(outside)
      outside.dispatchEvent(new MouseEvent('click', { bubbles: true }))

      document.removeEventListener('click', onDocClick, true)
      outside.remove()
      wrapper.unmount()
      expect(onDocClick).toHaveBeenCalled()
    })
  })

  describe('active-word scroll follow', () => {
    test('scrolls the active word into view when active_word changes', async () => {
      vi.useFakeTimers()
      const wrapper = mountHost()

      await wrapper.setProps({ activeWord: 1 })
      // followActiveWord is debounced 100ms
      vi.advanceTimersByTime(100)
      await flushPromises()
      vi.useRealTimers()

      expect(scrollMock).toHaveBeenCalled()
    })
  })

  describe('trailing-click swallow after touch commit', () => {
    test('after a touch tap commits, the next click outside the reader is swallowed [obligation]', async () => {
      const wrapper = mountHost(vi.fn())
      const onDocClick = vi.fn()
      document.addEventListener('click', onDocClick, true)

      await touch(wrapper, 'pointerdown', 1)
      await touch(wrapper, 'pointerup', 1)

      const outside = document.createElement('button')
      document.body.appendChild(outside)
      outside.dispatchEvent(new MouseEvent('click', { bubbles: true }))

      document.removeEventListener('click', onDocClick, true)
      outside.remove()

      expect(onDocClick).not.toHaveBeenCalled()
    })

    test('the swallow is one-shot: a subsequent click outside the reader reaches document handlers [obligation]', async () => {
      const wrapper = mountHost(vi.fn())
      const onDocClick = vi.fn()
      document.addEventListener('click', onDocClick, true)

      await touch(wrapper, 'pointerdown', 1)
      await touch(wrapper, 'pointerup', 1)

      const outside = document.createElement('button')
      document.body.appendChild(outside)

      // first click — consumed by the one-shot swallow
      outside.dispatchEvent(new MouseEvent('click', { bubbles: true }))

      // second click — swallow is disarmed, reaches document
      outside.dispatchEvent(new MouseEvent('click', { bubbles: true }))

      document.removeEventListener('click', onDocClick, true)
      outside.remove()

      expect(onDocClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('standing selection persists and re-tap reopens (mobile)', () => {
    test('committed selection is NOT cleared when popover_open stays false (mobile path) [obligation]', async () => {
      const onSelect = vi.fn()
      const wrapper = mountHost(onSelect)

      // Commit via touch tap (mobile: popover_open stays false)
      await touch(wrapper, 'pointerdown', 1)
      await touch(wrapper, 'pointerup', 1)
      expect(onSelect).toHaveBeenCalledTimes(1)

      // popover_open remains false throughout — committed must still be live
      // Re-tap inside the committed word to confirm selection is still active
      onSelect.mockClear()
      await touch(wrapper, 'pointerdown', 1)
      await touch(wrapper, 'pointerup', 1)

      // Should re-emit the same committed range (not nothing)
      expect(onSelect).toHaveBeenCalledTimes(1)
    })

    test('re-tapping a word inside the committed range re-emits the whole range [obligation]', async () => {
      const onSelect = vi.fn()
      const wrapper = mountHost(onSelect)

      // Commit a long-press drag to cover words 0..1
      vi.useFakeTimers()
      await touch(wrapper, 'pointerdown', 0)
      vi.advanceTimersByTime(500) // arm long-press
      await wrapper.vm.$nextTick()
      // drag from 0 to 1
      words[1].dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          pointerId: 1,
          pointerType: 'touch',
          clientX: 1,
          clientY: 0
        })
      )
      await wrapper.vm.$nextTick()
      await touch(wrapper, 'pointerup', 1)
      vi.useRealTimers()

      expect(onSelect).toHaveBeenCalledTimes(1)
      expect(onSelect.mock.calls[0][0].index).toBe(0)
      expect(onSelect.mock.calls[0][0].end_index).toBe(1)

      // Re-tap word 1 which is inside range lo=0 hi=1 — should re-emit the whole range
      onSelect.mockClear()
      await touch(wrapper, 'pointerdown', 1)
      await touch(wrapper, 'pointerup', 1)

      expect(onSelect).toHaveBeenCalledTimes(1)
      expect(onSelect.mock.calls[0][0].index).toBe(0)
      expect(onSelect.mock.calls[0][0].end_index).toBe(1)
    })

    test('tapping a word outside the committed range replaces the selection [obligation]', async () => {
      const onSelect = vi.fn()
      const wrapper = mountHost(onSelect)

      // Commit word 1
      await touch(wrapper, 'pointerdown', 1)
      await touch(wrapper, 'pointerup', 1)
      onSelect.mockClear()

      // Tap word 0 — outside committed range {lo:1, hi:1}
      await touch(wrapper, 'pointerdown', 0)
      await touch(wrapper, 'pointerup', 0)

      expect(onSelect).toHaveBeenCalledTimes(1)
      expect(onSelect.mock.calls[0][0].term).toBe('Hello')
      expect(onSelect.mock.calls[0][0].index).toBe(0)
      expect(onSelect.mock.calls[0][0].end_index).toBe(0)
    })
  })

  describe('empty-space tap deselects; scroll does not', () => {
    test('a stationary tap that lands on no word clears the committed selection [obligation]', async () => {
      const onSelect = vi.fn()
      const onDismiss = vi.fn()
      const wrapper = mountHost(onSelect, onDismiss)

      // Commit word 1
      await touch(wrapper, 'pointerdown', 1)
      await touch(wrapper, 'pointerup', 1)
      expect(onSelect).toHaveBeenCalledTimes(1)

      // Tap empty space (no word under finger) — elementFromPoint returns null for index 3
      const content = wrapper.find('[data-testid="content"]').element
      content.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          pointerId: 1,
          pointerType: 'touch',
          clientX: 3,
          clientY: 0
        })
      )
      await wrapper.vm.$nextTick()
      content.dispatchEvent(
        new PointerEvent('pointerup', {
          bubbles: true,
          pointerId: 1,
          pointerType: 'touch',
          clientX: 3,
          clientY: 0
        })
      )
      await wrapper.vm.$nextTick()

      // Verify: interaction_range should now be null (no committed selection)
      expect(wrapper.vm.interaction_range).toBeNull()
    })

    test('a tap on empty space calls onDismiss [obligation]', async () => {
      const onSelect = vi.fn()
      const onDismiss = vi.fn()
      const wrapper = mountHost(onSelect, onDismiss)

      // Commit word 1 first
      await touch(wrapper, 'pointerdown', 1)
      await touch(wrapper, 'pointerup', 1)
      onDismiss.mockClear()

      // Tap empty space — no word under clientX=3
      const content = wrapper.find('[data-testid="content"]').element
      content.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          pointerId: 1,
          pointerType: 'touch',
          clientX: 3,
          clientY: 0
        })
      )
      await wrapper.vm.$nextTick()
      content.dispatchEvent(
        new PointerEvent('pointerup', {
          bubbles: true,
          pointerId: 1,
          pointerType: 'touch',
          clientX: 3,
          clientY: 0
        })
      )
      await wrapper.vm.$nextTick()

      expect(onDismiss).toHaveBeenCalledTimes(1)
    })

    test('a tap ON a word commits onSelect and does NOT call onDismiss [obligation]', async () => {
      const onSelect = vi.fn()
      const onDismiss = vi.fn()
      const wrapper = mountHost(onSelect, onDismiss)

      await touch(wrapper, 'pointerdown', 1)
      await touch(wrapper, 'pointerup', 1)

      expect(onSelect).toHaveBeenCalledTimes(1)
      expect(onDismiss).not.toHaveBeenCalled()
    })

    test('a touch drift past slop (scroll) does not clear the committed selection [obligation]', async () => {
      const onSelect = vi.fn()
      const onDismiss = vi.fn()
      const wrapper = mountHost(onSelect, onDismiss)

      // Commit word 1
      await touch(wrapper, 'pointerdown', 1)
      await touch(wrapper, 'pointerup', 1)
      expect(onSelect).toHaveBeenCalledTimes(1)
      onSelect.mockClear()
      onDismiss.mockClear()

      // Drift past the slop — this is a scroll, commits nothing, leaves committed lit
      await touch(wrapper, 'pointerdown', 1)
      await touch(wrapper, 'pointermove', 1, 40) // y=40 > TAP_SLOP=10
      await touch(wrapper, 'pointerup', 1, 40)

      // committed selection must still be live (interaction_range non-null)
      expect(wrapper.vm.interaction_range).not.toBeNull()
      // No new commit fired, no dismiss either
      expect(onSelect).not.toHaveBeenCalled()
      expect(onDismiss).not.toHaveBeenCalled()
    })
  })

  describe('interaction_range provide + word data-active tint', () => {
    test('a word with index inside the committed range reports data-active=true [obligation]', async () => {
      const onSelect = vi.fn()
      const wrapper = mountHost(onSelect)

      await pointer(wrapper, 'pointerdown', 1, 1)
      await pointer(wrapper, 'pointerup', 1, 0)

      // interaction_range should cover lo=1 hi=1
      const range = wrapper.vm.interaction_range
      expect(range).not.toBeNull()
      expect(range.lo).toBe(1)
      expect(range.hi).toBe(1)
    })

    test('a word with index outside the committed range reports data-active=false [obligation]', async () => {
      const onSelect = vi.fn()
      const wrapper = mountHost(onSelect)

      await pointer(wrapper, 'pointerdown', 1, 1)
      await pointer(wrapper, 'pointerup', 1, 0)

      // word 0 is outside range {lo:1, hi:1}
      const range = wrapper.vm.interaction_range
      expect(range).not.toBeNull()
      const word0Active = range !== null && 0 >= range.lo && 0 <= range.hi
      expect(word0Active).toBe(false)
    })

    test('interaction_range is null when there is no selection or hover [obligation]', () => {
      const wrapper = mountHost(vi.fn())
      expect(wrapper.vm.interaction_range).toBeNull()
    })

    test('interaction_range reflects hover (focus_index) when not dragging and not committed [obligation]', async () => {
      const wrapper = mountHost(vi.fn())

      await pointer(wrapper, 'pointermove', 1, 0)

      const range = wrapper.vm.interaction_range
      expect(range).toEqual({ lo: 1, hi: 1 })
    })

    test('interaction_range prefers drag over hover when drag is in progress [obligation]', async () => {
      const wrapper = mountHost(vi.fn())

      await pointer(wrapper, 'pointerdown', 0, 1)
      await pointer(wrapper, 'pointermove', 1, 1)

      // drag in progress: anchor=0, focus=1 → range 0..1
      const range = wrapper.vm.interaction_range
      expect(range).toEqual({ lo: 0, hi: 1 })
    })
  })

  describe('pointerdown disarms the suppress flag (regression guard) [obligation]', () => {
    test('after a touch tap whose trailing click never fires, a fresh pointerdown+click reaches document handlers', async () => {
      const wrapper = mountHost(vi.fn())
      const onDocClick = vi.fn()
      document.addEventListener('click', onDocClick, true)

      // Commit a touch tap — this arms suppress_gesture_click
      await touch(wrapper, 'pointerdown', 1)
      await touch(wrapper, 'pointerup', 1)

      // The trailing click never fires (e.g. cancelled by scroll). A fresh
      // pointerdown starts a new gesture and must disarm the flag.
      const outside = document.createElement('button')
      document.body.appendChild(outside)

      outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }))
      await wrapper.vm.$nextTick()

      // Now a click on that element should NOT be swallowed (flag was disarmed)
      outside.dispatchEvent(new MouseEvent('click', { bubbles: true }))

      document.removeEventListener('click', onDocClick, true)
      outside.remove()

      expect(onDocClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('tap_05 ratchet on range-select via long-press', () => {
    test('arming range-select via long-press emits ui.tap_05 for the first word [obligation]', async () => {
      const wrapper = mountHost(vi.fn())
      emitSfxMock.mockClear()

      vi.useFakeTimers()
      await touch(wrapper, 'pointerdown', 0)
      vi.advanceTimersByTime(500) // past LONG_PRESS_MS=400
      await wrapper.vm.$nextTick()
      vi.useRealTimers()

      expect(emitSfxMock).toHaveBeenCalledWith('tap_05')
    })

    test('each new word the drag adds emits ui.tap_05 [obligation]', async () => {
      const wrapper = mountHost(vi.fn())

      vi.useFakeTimers()
      await touch(wrapper, 'pointerdown', 0)
      vi.advanceTimersByTime(500)
      await wrapper.vm.$nextTick()
      emitSfxMock.mockClear()

      // drag to word 1
      words[1].dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          pointerId: 1,
          pointerType: 'touch',
          clientX: 1,
          clientY: 0
        })
      )
      await wrapper.vm.$nextTick()
      vi.useRealTimers()

      expect(emitSfxMock).toHaveBeenCalledWith('tap_05')
    })

    test('release does not emit an extra ui.tap_05 [obligation]', async () => {
      const wrapper = mountHost(vi.fn())

      vi.useFakeTimers()
      await touch(wrapper, 'pointerdown', 0)
      vi.advanceTimersByTime(500)
      await wrapper.vm.$nextTick()

      words[1].dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          pointerId: 1,
          pointerType: 'touch',
          clientX: 1,
          clientY: 0
        })
      )
      await wrapper.vm.$nextTick()
      emitSfxMock.mockClear()

      await touch(wrapper, 'pointerup', 1)
      vi.useRealTimers()

      // release should not call tap_05 again
      expect(emitSfxMock).not.toHaveBeenCalledWith('tap_05')
    })
  })

  describe('selection_preview', () => {
    test('is non-null the instant a touch long-press arms with NO drag [obligation]', async () => {
      const wrapper = mountHost(vi.fn())

      vi.useFakeTimers()
      await touch(wrapper, 'pointerdown', 0)

      // Not armed yet — selection_preview is null
      expect(wrapper.vm.selection_preview).toBeNull()

      // Advance past LONG_PRESS_MS=400 — no pointermove dispatched
      vi.advanceTimersByTime(500)
      await wrapper.vm.$nextTick()
      vi.useRealTimers()

      // Immediately non-null without any drag [regression guard for the fixed bug]
      expect(wrapper.vm.selection_preview).not.toBeNull()
    })

    test('selection_preview x comes from finger clientX at arm time, top/bottom from word rect [obligation]', async () => {
      const wrapper = mountHost(vi.fn())

      // words[0] is 'Hello ' — give it a measured rect
      vi.spyOn(words[0], 'getBoundingClientRect').mockReturnValue(new DOMRect(10, 120, 50, 24))

      vi.useFakeTimers()
      // Press at clientX=0 (maps to words[0] via elementFromPoint stub)
      words[0].dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          pointerId: 1,
          pointerType: 'touch',
          clientX: 0,
          clientY: 5
        })
      )
      await wrapper.vm.$nextTick()

      vi.advanceTimersByTime(500)
      await wrapper.vm.$nextTick()
      vi.useRealTimers()

      const preview = wrapper.vm.selection_preview
      expect(preview).not.toBeNull()
      // x is the finger's clientX at arm time
      expect(preview.x).toBe(0)
      // top/bottom come from the word's getBoundingClientRect
      expect(preview.top).toBe(120)
      expect(preview.bottom).toBe(120 + 24)
    })

    test('selection_preview stays null for a mouse drag [obligation]', async () => {
      const wrapper = mountHost(vi.fn())

      await pointer(wrapper, 'pointerdown', 0, 1)
      await pointer(wrapper, 'pointermove', 1, 1)

      expect(wrapper.vm.selection_preview).toBeNull()
    })

    test('selection_preview resets to null after commitTouch (pointerup) [obligation]', async () => {
      const wrapper = mountHost(vi.fn())

      vi.useFakeTimers()
      await touch(wrapper, 'pointerdown', 0)
      vi.advanceTimersByTime(500)
      await wrapper.vm.$nextTick()
      vi.useRealTimers()

      expect(wrapper.vm.selection_preview).not.toBeNull()

      await touch(wrapper, 'pointerup', 0)

      expect(wrapper.vm.selection_preview).toBeNull()
    })

    test('selection_preview resets to null after onPointerCancel [obligation]', async () => {
      const wrapper = mountHost(vi.fn())

      vi.useFakeTimers()
      await touch(wrapper, 'pointerdown', 0)
      vi.advanceTimersByTime(500)
      await wrapper.vm.$nextTick()
      vi.useRealTimers()

      expect(wrapper.vm.selection_preview).not.toBeNull()

      // The Host component doesn't bind onPointercancel on the content element;
      // call the handler directly (the composable exposes it on the vm).
      wrapper.vm.onPointerCancel(
        new PointerEvent('pointercancel', { bubbles: true, pointerId: 1, pointerType: 'touch' })
      )
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.selection_preview).toBeNull()
    })
  })
})
