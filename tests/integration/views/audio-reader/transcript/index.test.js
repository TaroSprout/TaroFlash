import { describe, test, expect, vi, afterEach } from 'vite-plus/test'
import { mount, flushPromises } from '@vue/test-utils'
import TranscriptView from '@/views/audio-reader/transcript/index.vue'
import { readerActiveWordKey } from '@/composables/audio-reader/reader-highlights'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const word = (display, index, start = index) => ({ display, start, index })

const sentence = (index, sentenceText, words, extra = {}) => ({
  index,
  sentence: sentenceText,
  start: index,
  end: index + 1,
  words,
  ...extra
})

// Each sentence renders as its own block (one segment apiece).
function makeSentences() {
  return [
    sentence(0, 'Hello world.', [word('Hello ', 0), word('world.', 1)]),
    sentence(1, 'How are you?', [word('How ', 2), word('are ', 3), word('you?', 4)]),
    sentence(2, 'Fine thanks.', [word('Fine ', 5), word('thanks.', 6)])
  ]
}

function mountView(props = {}) {
  return mount(TranscriptView, {
    props: {
      paragraphs: makeSentences(),
      active_word: -1,
      ...props
    }
  })
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('TranscriptView', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('segment rendering', () => {
    test('renders one transcript-segment per sentence block', () => {
      const wrapper = mountView()
      expect(wrapper.findAll('[data-testid="transcript-segment"]')).toHaveLength(3)
    })

    test('assigns data-index matching each sentence index', () => {
      const wrapper = mountView()
      const segments = wrapper.findAll('[data-testid="transcript-segment"]')
      expect(segments[0].attributes('data-index')).toBe('0')
      expect(segments[1].attributes('data-index')).toBe('1')
      expect(segments[2].attributes('data-index')).toBe('2')
    })
  })

  describe('highlight layers', () => {
    test('no hover pill rendered before any interaction', () => {
      const wrapper = mountView()
      expect(wrapper.find('[data-testid="transcript-view__hover"]').exists()).toBe(false)
    })

    test('one hover pill appears after a word is selected', async () => {
      const wrapper = mountView()
      const wordEls = wrapper.findAll('[data-testid="transcript-word"]').map((w) => w.element)
      vi.spyOn(document, 'elementFromPoint').mockImplementation((x) => wordEls[x] ?? null)

      const content = wrapper.find('[data-testid="transcript-view__content"]').element
      content.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, buttons: 1, clientX: 0 })
      )
      content.dispatchEvent(
        new PointerEvent('pointerup', { bubbles: true, pointerId: 1, clientX: 0 })
      )
      // positionInteraction is async (hover_lines update + nextTick inside it)
      await flushPromises()

      expect(wrapper.find('[data-testid="transcript-view__hover"]').exists()).toBe(true)
    })

    test('words expose a stable data-word-index for the layers to target', () => {
      const wrapper = mountView()
      const words = wrapper.findAll('[data-testid="transcript-word"]')
      expect(words.map((w) => w.attributes('data-word-index'))).toEqual([
        '0',
        '1',
        '2',
        '3',
        '4',
        '5',
        '6'
      ])
    })
  })

  describe('word-range selection → select emit', () => {
    // Drag (or click, when from === to) word indices via pointer events. The
    // composable hit-tests with elementFromPoint, mapped here onto each word so
    // the gesture is deterministic, not layout-bound.
    function select(wrapper, from, to) {
      const wordEls = wrapper.findAll('[data-testid="transcript-word"]').map((w) => w.element)
      vi.spyOn(document, 'elementFromPoint').mockImplementation((x) => wordEls[x] ?? null)

      const fire = (type, index, buttons) =>
        wordEls[index].dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            pointerId: 1,
            buttons,
            clientX: index,
            clientY: 0
          })
        )

      fire('pointerdown', from, 1)
      if (to !== from) fire('pointermove', to, 1)
      fire('pointerup', to, 0)
      return wrapper.vm.$nextTick()
    }

    test('a drag across words emits the joined term, anchor sentence, and a rect', async () => {
      const wrapper = mountView()

      await select(wrapper, 0, 1)

      expect(wrapper.emitted('select')).toBeTruthy()
      const [payload] = wrapper.emitted('select')[0]
      expect(payload.term).toBe('Hello world')
      expect(payload.sentence).toBe('Hello world.')
      expect(payload.rect).toBeDefined()
    })

    test('a click on a single word emits that word and its sentence', async () => {
      const wrapper = mountView()

      await select(wrapper, 2, 2)

      const [payload] = wrapper.emitted('select')[0]
      expect(payload.term).toBe('How')
      expect(payload.sentence).toBe('How are you?')
    })

    test('does NOT emit when the press lands off any word', async () => {
      const wrapper = mountView()
      vi.spyOn(document, 'elementFromPoint').mockReturnValue(null)

      const content = wrapper.find('[data-testid="transcript-view__content"]').element
      content.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }))
      content.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }))
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('select')).toBeFalsy()
    })
  })

  describe('dismiss event [obligation]', () => {
    test('a touch tap on empty space emits dismiss [obligation]', async () => {
      const wrapper = mountView()
      const wordEls = wrapper.findAll('[data-testid="transcript-word"]').map((w) => w.element)
      // Map clientX → word element; anything beyond the word count returns null (empty space)
      vi.spyOn(document, 'elementFromPoint').mockImplementation((x) => wordEls[x] ?? null)

      const content = wrapper.find('[data-testid="transcript-view__content"]').element
      // Tap at clientX=99 — no word there, so elementFromPoint returns null
      content.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          pointerId: 1,
          pointerType: 'touch',
          clientX: 99,
          clientY: 0
        })
      )
      await wrapper.vm.$nextTick()
      content.dispatchEvent(
        new PointerEvent('pointerup', {
          bubbles: true,
          pointerId: 1,
          pointerType: 'touch',
          clientX: 99,
          clientY: 0
        })
      )
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('dismiss')).toBeTruthy()
      expect(wrapper.emitted('select')).toBeFalsy()
    })

    test('a touch tap ON a word emits select and does NOT emit dismiss [obligation]', async () => {
      const wrapper = mountView()
      const wordEls = wrapper.findAll('[data-testid="transcript-word"]').map((w) => w.element)
      vi.spyOn(document, 'elementFromPoint').mockImplementation((x) => wordEls[x] ?? null)

      const content = wrapper.find('[data-testid="transcript-view__content"]').element
      content.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          pointerId: 1,
          pointerType: 'touch',
          clientX: 0,
          clientY: 0
        })
      )
      await wrapper.vm.$nextTick()
      content.dispatchEvent(
        new PointerEvent('pointerup', {
          bubbles: true,
          pointerId: 1,
          pointerType: 'touch',
          clientX: 0,
          clientY: 0
        })
      )
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('select')).toBeTruthy()
      expect(wrapper.emitted('dismiss')).toBeFalsy()
    })
  })

  describe('pointerleave and pointercancel handlers', () => {
    test('pointerleave on the content element does not throw', async () => {
      const wrapper = mountView()
      const content = wrapper.find('[data-testid="transcript-view__content"]').element

      expect(() => {
        content.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true, pointerId: 1 }))
      }).not.toThrow()
    })

    test('pointercancel on the content element does not throw', async () => {
      const wrapper = mountView()
      const content = wrapper.find('[data-testid="transcript-view__content"]').element

      expect(() => {
        content.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerId: 1 }))
      }).not.toThrow()
    })

    test('pointercancel after a touch long-press does not leave selection active', async () => {
      const wrapper = mountView()
      const wordEls = wrapper.findAll('[data-testid="transcript-word"]').map((w) => w.element)
      vi.spyOn(document, 'elementFromPoint').mockImplementation((x) => wordEls[x] ?? null)

      const content = wrapper.find('[data-testid="transcript-view__content"]').element

      vi.useFakeTimers()
      // Touch press on word 0
      content.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          pointerId: 1,
          pointerType: 'touch',
          clientX: 0,
          clientY: 0
        })
      )
      await wrapper.vm.$nextTick()

      // Cancel the gesture (browser claims the scroll)
      content.dispatchEvent(
        new PointerEvent('pointercancel', {
          bubbles: true,
          pointerId: 1,
          pointerType: 'touch'
        })
      )
      await wrapper.vm.$nextTick()

      // Advance past long-press — should NOT arm after cancel
      vi.advanceTimersByTime(500)
      await wrapper.vm.$nextTick()
      vi.useRealTimers()

      // No selection should have been committed
      expect(wrapper.emitted('select')).toBeFalsy()
    })
  })

  describe('sentence marking for repeated terms [obligation]', () => {
    function tap(wrapper, wordIndex) {
      const wordEls = wrapper.findAll('[data-testid="transcript-word"]').map((w) => w.element)
      vi.spyOn(document, 'elementFromPoint').mockImplementation((x) => wordEls[x] ?? null)
      wordEls[wordIndex].dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          pointerId: 1,
          buttons: 1,
          clientX: wordIndex,
          clientY: 0
        })
      )
      wordEls[wordIndex].dispatchEvent(
        new PointerEvent('pointerup', {
          bubbles: true,
          pointerId: 1,
          clientX: wordIndex,
          clientY: 0
        })
      )
      return wrapper.vm.$nextTick()
    }

    test('marks correct occurrence when selected word is the second of two identical terms', async () => {
      const wrapper = mount(TranscriptView, {
        props: {
          paragraphs: [sentence(0, 'go or go', [word('go ', 0), word('or ', 1), word('go', 2)])],
          active_word: -1
        }
      })

      await tap(wrapper, 2)

      const [payload] = wrapper.emitted('select')[0]
      expect(payload.sentence).toBe('go or [go]')
    })

    test('does not mark when term is unambiguous', async () => {
      const wrapper = mount(TranscriptView, {
        props: {
          paragraphs: [
            sentence(0, 'go or stop', [word('go ', 0), word('or ', 1), word('stop', 2)])
          ],
          active_word: -1
        }
      })

      await tap(wrapper, 0)

      const [payload] = wrapper.emitted('select')[0]
      expect(payload.sentence).toBe('go or stop')
    })
  })

  describe('readerActiveWordKey provide [obligation]', () => {
    test('provides readerActiveWordKey to child words reflecting active_word prop [obligation]', async () => {
      const wrapper = mountView({ active_word: 3 })
      // The provided value is a ComputedRef<number>. We can inspect it via
      // the component's provides (internal). Drive it via a child word instead:
      // a word at index 3 should have data-playing=true when active_word=3.
      const words = wrapper.findAll('[data-testid="transcript-word"]')
      // word at index 3 is "are " in sentence 1 (index 3 in the flat list)
      expect(words[3].attributes('data-playing')).toBe('true')
    })

    test('words that are not the active word have data-playing=false [obligation]', async () => {
      const wrapper = mountView({ active_word: 3 })
      const words = wrapper.findAll('[data-testid="transcript-word"]')
      // word 0 is not the active word
      expect(words[0].attributes('data-playing')).toBe('false')
    })
  })
})
