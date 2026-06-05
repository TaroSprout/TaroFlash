import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { useReaderHighlights } from '@/composables/audio-reader/use-reader-highlights'

const { moveMock, hideMock } = vi.hoisted(() => ({ moveMock: vi.fn(), hideMock: vi.fn() }))

// Mock the animator so positioning is observable as calls (real geometry is zero
// in the test DOM anyway); selection behaviour is asserted via these.
vi.mock('@/utils/animations/reader-cursor', () => ({
  moveReaderCursor: moveMock,
  hideReaderCursor: hideMock
}))

// Host wiring the composable's pointer handlers + template refs, with words
// carrying the stable data-word-index handle (including a punctuation-only one).
const Host = defineComponent({
  props: {
    activeWord: { type: Number, default: -1 },
    open: { type: Boolean, default: false },
    onSelect: { type: Function, default: () => {} }
  },
  setup(props) {
    return useReaderHighlights(
      () => props.activeWord,
      props.onSelect,
      () => props.open
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
        h('div', { ref: 'playhead' }),
        h('div', { ref: 'hover' }),
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
      ]
    )
  }
})

describe('useReaderHighlights', () => {
  let words
  let scroll_into_view

  // The composable hit-tests via elementFromPoint; map a synthetic clientX (the
  // word index) onto its element so the gesture is deterministic, not layout-bound.
  function mountHost(onSelect) {
    const wrapper = mount(Host, { props: { onSelect } })
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

  beforeEach(() => {
    moveMock.mockClear()
    hideMock.mockClear()
    scroll_into_view = vi.fn()
    Element.prototype.scrollIntoView = scroll_into_view
  })

  afterEach(() => {
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

  describe('playhead from active word', () => {
    test('scrolls the active word into view when active_word changes', async () => {
      const wrapper = mountHost()

      await wrapper.setProps({ activeWord: 1 })

      expect(scroll_into_view).toHaveBeenCalled()
    })
  })
})
