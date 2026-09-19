import { describe, test, expect, afterEach, beforeEach, vi } from 'vite-plus/test'
import { createApp, defineComponent, h, ref, nextTick } from 'vue'

const { mockMoveReaderCursor, mockHideReaderCursor, mockEmitSfx, mockScrollLineIntoView } =
  vi.hoisted(() => ({
    mockMoveReaderCursor: vi.fn(),
    mockHideReaderCursor: vi.fn(),
    mockEmitSfx: vi.fn(),
    mockScrollLineIntoView: vi.fn()
  }))

vi.mock('@/utils/animations/reader-cursor', () => ({
  moveReaderCursor: mockMoveReaderCursor,
  hideReaderCursor: mockHideReaderCursor
}))
vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx, emitHoverSfx: vi.fn() }))
vi.mock('@/utils/animations/transcript-scroll', () => ({
  scrollLineIntoView: mockScrollLineIntoView
}))
vi.mock('@/composables/ui/staged-tap', () => ({
  useStagedTap: () => ({ playing: ref(false), tap: () => vi.fn() })
}))

class FakeResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', FakeResizeObserver)

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
function FakePointerEvent(type, init) {
  return makeFakePointerEvent(type, init)
}
vi.stubGlobal('PointerEvent', FakePointerEvent)

const { useWordSelection } = await import('@/composables/audio-reader/word-selection')

let app = null
let originalElementFromPoint = null

afterEach(() => {
  app?.unmount()
  app = null
  if (originalElementFromPoint !== null) {
    document.elementFromPoint = originalElementFromPoint
    originalElementFromPoint = null
  }
  vi.clearAllMocks()
})

function stubElementFromPoint(returnFn) {
  originalElementFromPoint = document.elementFromPoint ?? null
  document.elementFromPoint = returnFn
}

function withSelection({
  active_word = ref(-1),
  popover_open = ref(false),
  matchRangeAt,
  onManualScroll
} = {}) {
  let result

  const container = document.createElement('div')
  document.body.appendChild(container)

  const onSelect = vi.fn()
  const onDismiss = vi.fn()
  const virtualizer = { value: { scrollToIndex: vi.fn() } }
  const rowIndexOfWord = (index) => index

  const paragraphs = ref([])

  const Host = defineComponent({
    setup() {
      const content = { value: null }
      result = useWordSelection({
        content,
        active_word: () => active_word.value,
        paragraphs: () => paragraphs.value,
        onSelect,
        onDismiss,
        popover_open: () => popover_open.value,
        matchRangeAt,
        virtualizer,
        rowIndexOfWord,
        onManualScroll
      })
      return () =>
        h('div', {}, [
          h('div', { ref: (el) => (content.value = el), 'data-testid': 'content' }),
          h('div', { ref: 'hover', 'data-testid': 'hover' })
        ])
    }
  })

  app = createApp(Host)
  app.mount(container)

  const contentEl = container.querySelector('[data-testid="content"]')

  return { result, onSelect, onDismiss, contentEl, container, paragraphs }
}

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

function withRect(el, rect) {
  el.querySelector('[data-word-base]').getBoundingClientRect = () => rect
  return el
}

describe('useWordSelection', () => {
  describe('return shape', () => {
    test('exposes the pointer handlers, hover_lines and setHoverEl', () => {
      const { result } = withSelection()

      expect(result).toMatchObject({
        hover_lines: expect.any(Object),
        setHoverEl: expect.any(Function),
        onPointerDown: expect.any(Function),
        onPointerMove: expect.any(Function),
        onPointerUp: expect.any(Function),
        onPointerLeave: expect.any(Function),
        onPointerCancel: expect.any(Function)
      })
      expect(result.hover_lines.value).toEqual([])
    })
  })

  describe('mouse click commits a single word', () => {
    test('calls onSelect with term, sentence, rect and word indexes', () => {
      const paragraphs = ref([
        {
          index: 0,
          sentence: 'hello world',
          words: [
            { display: 'hello', start: 0, index: 0 },
            { display: 'world', start: 1, index: 1 }
          ]
        }
      ])
      const { result, onSelect, contentEl } = withSelection({ paragraphs })
      const wordEl = withRect(addWord(contentEl, 1, 'world'), new DOMRect(10, 10, 30, 20))
      stubElementFromPoint(() => wordEl)

      result.onPointerDown(
        new PointerEvent('pointerdown', { pointerType: 'mouse', clientX: 20, clientY: 20 })
      )
      result.onPointerUp(
        new PointerEvent('pointerup', { pointerType: 'mouse', clientX: 20, clientY: 20 })
      )

      expect(onSelect).toHaveBeenCalledTimes(1)
      expect(onSelect.mock.calls[0][0]).toMatchObject({
        term: 'world',
        word_index: 1,
        word_end_index: 1
      })
      expect(onSelect.mock.calls[0][0].rect).toBeInstanceOf(DOMRect)
    })

    test('paints data-active on the committed word', async () => {
      const { result, contentEl } = withSelection()
      const wordEl = withRect(addWord(contentEl, 2), new DOMRect(0, 0, 10, 10))
      stubElementFromPoint(() => wordEl)

      result.onPointerDown(new PointerEvent('pointerdown', { pointerType: 'mouse' }))
      result.onPointerUp(new PointerEvent('pointerup', { pointerType: 'mouse' }))
      await nextTick()

      expect(wordEl.getAttribute('data-active')).toBe('true')
    })
  })

  describe('mouse drag', () => {
    test('pointermove into a new word emits gesture.tick and extends the range', () => {
      const { result, onSelect, contentEl } = withSelection()
      const w3 = withRect(addWord(contentEl, 3), new DOMRect(0, 0, 10, 10))
      const w5 = withRect(addWord(contentEl, 5), new DOMRect(50, 0, 10, 10))

      stubElementFromPoint(() => w3)
      result.onPointerDown(new PointerEvent('pointerdown', { pointerType: 'mouse' }))
      mockEmitSfx.mockClear()

      document.elementFromPoint = () => w5
      result.onPointerMove(new PointerEvent('pointermove', { pointerType: 'mouse' }))
      expect(mockEmitSfx).toHaveBeenCalledWith('gesture.tick')

      result.onPointerUp(new PointerEvent('pointerup', { pointerType: 'mouse' }))

      expect(onSelect).toHaveBeenCalledTimes(1)
      expect(onSelect.mock.calls[0][0]).toMatchObject({ word_index: 3, word_end_index: 5 })
    })
  })

  describe('tap on a matched phrase', () => {
    test('expands the committed range to the whole matched phrase', () => {
      const matchRangeAt = (i) => (i === 3 ? { lo: 2, hi: 4 } : null)
      const { result, onSelect, contentEl } = withSelection({ matchRangeAt })
      const words = [2, 3, 4].map((i, n) =>
        withRect(addWord(contentEl, i, `w${i}`), new DOMRect(10 + n * 30, 10, 20, 20))
      )
      stubElementFromPoint(() => words[1])

      result.onPointerDown(new PointerEvent('pointerdown', { pointerType: 'mouse' }))
      result.onPointerUp(new PointerEvent('pointerup', { pointerType: 'mouse' }))

      expect(onSelect).toHaveBeenCalledTimes(1)
      expect(onSelect.mock.calls[0][0]).toMatchObject({ word_index: 2, word_end_index: 4 })
    })
  })

  describe('punctuation-only range', () => {
    test('is dropped — no onSelect call', () => {
      const { result, onSelect, contentEl } = withSelection()
      const wordEl = withRect(addWord(contentEl, 1, '。'), new DOMRect(0, 0, 10, 10))
      stubElementFromPoint(() => wordEl)

      result.onPointerDown(new PointerEvent('pointerdown', { pointerType: 'mouse' }))
      result.onPointerUp(new PointerEvent('pointerup', { pointerType: 'mouse' }))

      expect(onSelect).not.toHaveBeenCalled()
    })
  })

  describe('touch tap', () => {
    test('a stationary release commits a single-word selection', () => {
      const { result, onSelect, contentEl } = withSelection()
      const wordEl = withRect(addWord(contentEl, 1), new DOMRect(0, 0, 10, 10))
      stubElementFromPoint(() => wordEl)

      result.onPointerDown(
        new PointerEvent('pointerdown', { pointerType: 'touch', clientX: 5, clientY: 5 })
      )
      result.onPointerUp(
        new PointerEvent('pointerup', { pointerType: 'touch', clientX: 5, clientY: 5 })
      )

      expect(onSelect).toHaveBeenCalledTimes(1)
      expect(onSelect.mock.calls[0][0]).toMatchObject({ word_index: 1 })
    })

    test('a tap on empty space calls onDismiss and never onSelect', () => {
      const { result, onSelect, onDismiss, contentEl } = withSelection()
      stubElementFromPoint(() => contentEl)

      result.onPointerDown(
        new PointerEvent('pointerdown', { pointerType: 'touch', clientX: 500, clientY: 500 })
      )
      result.onPointerUp(
        new PointerEvent('pointerup', { pointerType: 'touch', clientX: 500, clientY: 500 })
      )

      expect(onDismiss).toHaveBeenCalledTimes(1)
      expect(onSelect).not.toHaveBeenCalled()
    })

    test('drift past TAP_SLOP is treated as a scroll — commits nothing', () => {
      const onManualScroll = vi.fn()
      const { result, onSelect, contentEl } = withSelection({ onManualScroll })
      const wordEl = withRect(addWord(contentEl, 1), new DOMRect(0, 0, 10, 10))
      stubElementFromPoint(() => wordEl)

      result.onPointerDown(
        new PointerEvent('pointerdown', { pointerType: 'touch', clientX: 0, clientY: 0 })
      )
      result.onPointerMove(
        new PointerEvent('pointermove', { pointerType: 'touch', clientX: 50, clientY: 50 })
      )
      result.onPointerUp(
        new PointerEvent('pointerup', { pointerType: 'touch', clientX: 50, clientY: 50 })
      )

      expect(onManualScroll).toHaveBeenCalled()
      expect(onSelect).not.toHaveBeenCalled()
    })
  })

  describe('long-press range-select', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    test('arms range-select after LONG_PRESS_MS and paints data-active on the anchor word', async () => {
      const { result, contentEl } = withSelection()
      const wordEl = withRect(addWord(contentEl, 1), new DOMRect(0, 0, 10, 10))
      stubElementFromPoint(() => wordEl)

      result.onPointerDown(
        new PointerEvent('pointerdown', { pointerType: 'touch', clientX: 5, clientY: 5 })
      )
      vi.advanceTimersByTime(400)
      await nextTick()

      expect(mockEmitSfx).toHaveBeenCalledWith('gesture.tick')
      expect(wordEl.getAttribute('data-active')).toBe('true')
    })

    test('extending an armed drag to a second word commits the wider range', () => {
      const { result, onSelect, contentEl } = withSelection()
      const w1 = withRect(addWord(contentEl, 1), new DOMRect(0, 0, 10, 10))
      const w2 = withRect(addWord(contentEl, 2), new DOMRect(20, 0, 10, 10))
      stubElementFromPoint(() => w1)

      result.onPointerDown(
        new PointerEvent('pointerdown', { pointerType: 'touch', clientX: 5, clientY: 5 })
      )
      vi.advanceTimersByTime(400)

      document.elementFromPoint = () => w2
      result.onPointerMove(
        new PointerEvent('pointermove', { pointerType: 'touch', clientX: 25, clientY: 5 })
      )
      result.onPointerUp(
        new PointerEvent('pointerup', { pointerType: 'touch', clientX: 25, clientY: 5 })
      )

      expect(onSelect).toHaveBeenCalledTimes(1)
      expect(onSelect.mock.calls[0][0]).toMatchObject({ word_index: 1, word_end_index: 2 })
    })
  })

  describe('pointer leave', () => {
    test('clears the hover word when not dragging', async () => {
      const { result, contentEl } = withSelection()
      const wordEl = withRect(addWord(contentEl, 1), new DOMRect(0, 0, 10, 10))
      stubElementFromPoint(() => wordEl)

      result.onPointerMove(new PointerEvent('pointermove', { pointerType: 'mouse' }))
      await nextTick()
      expect(result.hover_lines.value.length).toBeGreaterThan(0)

      result.onPointerLeave()
      await nextTick()
      expect(result.hover_lines.value).toEqual([])
    })
  })

  describe('pointer cancel', () => {
    test('drops the pending gesture without committing', () => {
      const { result, onSelect, contentEl } = withSelection()
      const wordEl = withRect(addWord(contentEl, 1), new DOMRect(0, 0, 10, 10))
      stubElementFromPoint(() => wordEl)

      result.onPointerDown(new PointerEvent('pointerdown', { pointerType: 'touch' }))
      result.onPointerCancel()
      result.onPointerUp(new PointerEvent('pointerup', { pointerType: 'touch' }))

      expect(onSelect).not.toHaveBeenCalled()
    })
  })

  describe('popover_open watcher', () => {
    test('clears the committed selection when popover_open flips to false', async () => {
      const popover_open = ref(true)
      const { result, contentEl } = withSelection({ popover_open })
      const wordEl = withRect(addWord(contentEl, 1), new DOMRect(0, 0, 10, 10))
      stubElementFromPoint(() => wordEl)

      result.onPointerDown(
        new PointerEvent('pointerdown', { pointerType: 'touch', clientX: 5, clientY: 5 })
      )
      result.onPointerUp(
        new PointerEvent('pointerup', { pointerType: 'touch', clientX: 5, clientY: 5 })
      )
      await nextTick()
      expect(wordEl.getAttribute('data-active')).toBe('true')

      popover_open.value = false
      await nextTick()
      await nextTick()

      expect(wordEl.hasAttribute('data-active')).toBe(false)
    })
  })

  describe('active-word painting', () => {
    test('paintActiveWord moves data-playing from the previous to the current active word', async () => {
      const active_word = ref(0)
      const { contentEl } = withSelection({ active_word })
      const w0 = addWord(contentEl, 0)
      const w1 = addWord(contentEl, 1)
      await nextTick()
      await nextTick()

      expect(w0.getAttribute('data-playing')).toBe('true')

      active_word.value = 1
      await nextTick()

      expect(w0.hasAttribute('data-playing')).toBe(false)
      expect(w1.getAttribute('data-playing')).toBe('true')
    })
  })
})
