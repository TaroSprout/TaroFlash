import { describe, test, expect, vi, afterEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import TranscriptView from '@/views/audio-reader/transcript/index.vue'

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

// Two paragraphs: [[s0], [s1, s2]]
function makeParagraphs() {
  return [
    [sentence(0, 'Hello world.', [word('Hello ', 0), word('world.', 1)])],
    [
      sentence(1, 'How are you?', [word('How ', 2), word('are ', 3), word('you?', 4)]),
      sentence(2, 'Fine thanks.', [word('Fine ', 5), word('thanks.', 6)])
    ]
  ]
}

function mountView(props = {}) {
  return mount(TranscriptView, {
    props: {
      paragraphs: makeParagraphs(),
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

  describe('paragraph rendering', () => {
    test('renders one paragraph element per paragraph', () => {
      const wrapper = mountView()
      expect(wrapper.findAll('[data-testid="transcript-view__paragraph"]')).toHaveLength(2)
    })

    test('renders one transcript-segment per sentence across all paragraphs', () => {
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
    test('renders a playhead and a hover layer as separate coexisting elements', () => {
      const wrapper = mountView()
      expect(wrapper.find('[data-testid="transcript-view__playhead"]').exists()).toBe(true)
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
})
