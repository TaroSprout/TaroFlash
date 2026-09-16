import { describe, test, expect, afterEach, vi } from 'vite-plus/test'
import { createApp, defineComponent, h, nextTick, ref } from 'vue'
import { usePagedSelection } from '@/composables/audio-reader/paged-selection'

let app = null
let original_element_from_point = null

afterEach(() => {
  app?.unmount()
  app = null
  if (original_element_from_point !== null) {
    document.elementFromPoint = original_element_from_point
    original_element_from_point = null
  }
})

/** jsdom does not define elementFromPoint — stub it per test. */
function stubElementFromPoint(returnFn) {
  original_element_from_point = document.elementFromPoint ?? null
  document.elementFromPoint = returnFn
}

/** Mount the composable in a host that renders `ref="content"`, resolving via useTemplateRef. */
function withSelection({
  active_word = ref(-1),
  popover_open = ref(false),
  matchRangeAt = () => null
} = {}) {
  let result

  const onSelect = vi.fn()
  const onDismiss = vi.fn()

  const Host = defineComponent({
    setup() {
      result = usePagedSelection(
        content_el,
        () => active_word.value,
        () => paragraphs.value,
        matchRangeAt,
        onSelect,
        onDismiss,
        () => popover_open.value
      )
      return () => h('div', { ref: 'content_ref', 'data-testid': 'content' })
    }
  })

  const paragraphs = ref([])
  const content_el = { value: null }

  const container = document.createElement('div')
  document.body.appendChild(container)
  app = createApp(Host)
  app.mount(container)

  content_el.value = container.querySelector('[data-testid="content"]')

  return { result, onSelect, onDismiss, contentEl: content_el.value, container, paragraphs }
}

/** Add a fake word element carrying the attributes the composable reads. */
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

describe('usePagedSelection', () => {
  describe('return shape', () => {
    test('returns selectAtPoint, paintActiveWord, paintRange', () => {
      const { result } = withSelection()

      expect(result).toMatchObject({
        selectAtPoint: expect.any(Function),
        paintActiveWord: expect.any(Function),
        paintRange: expect.any(Function)
      })
    })
  })

  describe('tap on a single word', () => {
    test('commits the word range and calls onSelect with term, sentence, rect and indexes', () => {
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
      const wordEl = addWord(contentEl, 1, 'world')
      wordEl.querySelector('[data-word-base]').getBoundingClientRect = () =>
        new DOMRect(10, 10, 30, 20)

      stubElementFromPoint(() => wordEl)
      result.selectAtPoint(20, 20)

      expect(onSelect).toHaveBeenCalledTimes(1)
      expect(onSelect.mock.calls[0][0]).toMatchObject({
        term: 'world',
        word_index: 1,
        word_end_index: 1
      })
      expect(onSelect.mock.calls[0][0].rect).toBeInstanceOf(DOMRect)
    })

    test('paints data-active on the committed word', () => {
      const { result, contentEl } = withSelection()
      const wordEl = addWord(contentEl, 2, 'word')
      wordEl.querySelector('[data-word-base]').getBoundingClientRect = () =>
        new DOMRect(0, 0, 10, 10)

      stubElementFromPoint(() => wordEl)
      result.selectAtPoint(5, 5)

      expect(wordEl.getAttribute('data-active')).toBe('true')
    })
  })

  describe('tap on a matched phrase', () => {
    test('expands the committed range to the whole matched phrase', () => {
      const matchRangeAt = (i) => (i === 3 ? { lo: 2, hi: 4 } : null)
      const { result, onSelect, contentEl } = withSelection({ matchRangeAt })
      const words = [2, 3, 4].map((i, n) => {
        const el = addWord(contentEl, i, `w${i}`)
        el.querySelector('[data-word-base]').getBoundingClientRect = () =>
          new DOMRect(10 + n * 30, 10, 20, 20)
        return el
      })

      stubElementFromPoint(() => words[1])
      result.selectAtPoint(45, 15)

      expect(onSelect).toHaveBeenCalledTimes(1)
      expect(onSelect.mock.calls[0][0]).toMatchObject({ word_index: 2, word_end_index: 4 })
    })

    test('paints data-active on every word inside the matched phrase', () => {
      const matchRangeAt = () => ({ lo: 2, hi: 4 })
      const { result, contentEl } = withSelection({ matchRangeAt })
      const words = [2, 3, 4].map((i, n) => {
        const el = addWord(contentEl, i, `w${i}`)
        el.querySelector('[data-word-base]').getBoundingClientRect = () =>
          new DOMRect(10 + n * 30, 10, 20, 20)
        return el
      })

      stubElementFromPoint(() => words[0])
      result.selectAtPoint(15, 15)

      for (const el of words) expect(el.getAttribute('data-active')).toBe('true')
    })
  })

  describe('tap on empty space', () => {
    test('calls onDismiss and never onSelect', () => {
      const { result, onSelect, onDismiss, contentEl } = withSelection()

      stubElementFromPoint(() => contentEl)
      result.selectAtPoint(500, 500)

      expect(onDismiss).toHaveBeenCalledTimes(1)
      expect(onSelect).not.toHaveBeenCalled()
    })

    test('clears a previously committed word', () => {
      const { result, contentEl } = withSelection()
      const wordEl = addWord(contentEl, 1)
      wordEl.querySelector('[data-word-base]').getBoundingClientRect = () =>
        new DOMRect(0, 0, 10, 10)

      stubElementFromPoint(() => wordEl)
      result.selectAtPoint(5, 5)
      expect(wordEl.getAttribute('data-active')).toBe('true')

      stubElementFromPoint(() => contentEl)
      result.selectAtPoint(500, 500)

      expect(wordEl.hasAttribute('data-active')).toBe(false)
    })
  })

  describe('punctuation-only range', () => {
    test('is dropped — no onSelect call', () => {
      const { result, onSelect, contentEl } = withSelection()
      const wordEl = addWord(contentEl, 1, '。')
      wordEl.querySelector('[data-word-base]').getBoundingClientRect = () =>
        new DOMRect(0, 0, 10, 10)

      stubElementFromPoint(() => wordEl)
      result.selectAtPoint(5, 5)

      expect(onSelect).not.toHaveBeenCalled()
    })
  })

  describe('active-word painting', () => {
    test('paintActiveWord sets data-playing on the current active word and clears the previous one', async () => {
      const active_word = ref(0)
      const { contentEl, result } = withSelection({ active_word })
      const w0 = addWord(contentEl, 0)
      const w1 = addWord(contentEl, 1)

      result.paintActiveWord()
      expect(w0.getAttribute('data-playing')).toBe('true')

      active_word.value = 1
      await nextTick()

      expect(w0.hasAttribute('data-playing')).toBe(false)
      expect(w1.getAttribute('data-playing')).toBe('true')
    })

    test('moving to a word not currently mounted clears the previous without throwing', async () => {
      const active_word = ref(0)
      const { contentEl, result } = withSelection({ active_word })
      const w0 = addWord(contentEl, 0)

      // The word wasn't in the DOM yet when onMounted's initial paint ran —
      // repaint now, the way a page swap's recenter() would.
      result.paintActiveWord()
      expect(w0.getAttribute('data-playing')).toBe('true')

      active_word.value = 99
      await nextTick()

      expect(w0.hasAttribute('data-playing')).toBe(false)
    })
  })

  describe('popover close clears the committed selection', () => {
    test('paintRange(null) fires when popover_open flips to false', async () => {
      const popover_open = ref(true)
      const { result, contentEl } = withSelection({ popover_open })
      const wordEl = addWord(contentEl, 1)
      wordEl.querySelector('[data-word-base]').getBoundingClientRect = () =>
        new DOMRect(0, 0, 10, 10)

      stubElementFromPoint(() => wordEl)
      result.selectAtPoint(5, 5)
      expect(wordEl.getAttribute('data-active')).toBe('true')

      popover_open.value = false
      await nextTick()

      expect(wordEl.hasAttribute('data-active')).toBe(false)
    })

    test('does not clear while popover_open stays true', async () => {
      const popover_open = ref(false)
      const { result, contentEl } = withSelection({ popover_open })
      const wordEl = addWord(contentEl, 1)
      wordEl.querySelector('[data-word-base]').getBoundingClientRect = () =>
        new DOMRect(0, 0, 10, 10)

      stubElementFromPoint(() => wordEl)
      result.selectAtPoint(5, 5)

      popover_open.value = true
      await nextTick()

      expect(wordEl.getAttribute('data-active')).toBe('true')
    })
  })
})
