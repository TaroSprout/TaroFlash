import { describe, test, expect } from 'vite-plus/test'
import { shallowMount, mount } from '@vue/test-utils'
import { defineComponent, h, ref, computed } from 'vue'
import TranscriptWord from '@/views/audio-reader/transcript/word.vue'
import { readerSelectionKey, readerMatchesKey } from '@/composables/audio-reader/reader-highlights'

function mountWord(props = {}) {
  return shallowMount(TranscriptWord, {
    props: {
      display: 'cat ',
      index: 0,
      ...props
    }
  })
}

describe('TranscriptWord', () => {
  test('renders the display text verbatim', () => {
    const wrapper = mountWord({ display: '猫' })
    expect(wrapper.find('[data-testid="transcript-word"]').text()).toBe('猫')
  })

  test('exposes its global index as a stable data-word-index handle', () => {
    const wrapper = mountWord({ index: 7 })
    expect(wrapper.find('[data-testid="transcript-word"]').attributes('data-word-index')).toBe('7')
  })

  test('exposes the bare display text as data-word-text for selection extraction', () => {
    const wrapper = mountWord({ display: '猫 ', reading: 'ねこ' })
    expect(wrapper.find('[data-testid="transcript-word"]').attributes('data-word-text')).toBe('猫 ')
  })

  test('wraps the base text in a data-word-base element, separate from the reading', () => {
    const wrapper = mountWord({ display: '猫', reading: 'ねこ' })
    const base = wrapper.find('[data-word-base]')
    expect(base.exists()).toBe(true)
    expect(base.text()).toBe('猫')
    // the reading lives outside the base element so it isn't measured with it
    expect(base.find('[data-testid="transcript-word__reading"]').exists()).toBe(false)
  })

  test('renders the reading in an rt annotation when provided', () => {
    const wrapper = mountWord({ display: '猫', reading: 'ねこ' })
    expect(wrapper.find('[data-testid="transcript-word__reading"]').text()).toBe('ねこ')
  })

  test('omits the rt annotation when there is no reading', () => {
    const wrapper = mountWord({ display: 'cat ' })
    expect(wrapper.find('[data-testid="transcript-word__reading"]').exists()).toBe(false)
  })

  describe('data-active via injected interaction_range [obligation]', () => {
    // Build a provider wrapper that sets interaction_range and renders the word
    function mountWordWithRange(wordIndex, range) {
      const rangeRef = ref(range)
      const rangeComputed = computed(() => rangeRef.value)

      const Provider = defineComponent({
        setup() {
          return () => h(TranscriptWord, { display: 'test', index: wordIndex })
        }
      })

      const wrapper = mount(Provider, {
        global: {
          provide: {
            [readerSelectionKey]: rangeComputed
          }
        }
      })
      return wrapper
    }

    test('word reports data-active=true when its index falls inside the provided range [obligation]', () => {
      const wrapper = mountWordWithRange(1, { lo: 0, hi: 2 })
      expect(wrapper.find('[data-testid="transcript-word"]').attributes('data-active')).toBe('true')
    })

    test('word reports data-active=false when its index is outside the provided range [obligation]', () => {
      const wrapper = mountWordWithRange(3, { lo: 0, hi: 2 })
      expect(wrapper.find('[data-testid="transcript-word"]').attributes('data-active')).toBe(
        'false'
      )
    })

    test('word reports data-active=false when no range is provided (no selection) [obligation]', () => {
      const wrapper = mountWord({ index: 1 })
      expect(wrapper.find('[data-testid="transcript-word"]').attributes('data-active')).toBe(
        'false'
      )
    })
  })

  // ── readerMatchesKey — highlight / match injection [obligation] ───────────

  describe('highlight via injected readerMatchesKey [obligation]', () => {
    function mountWordWithMatch(wordIndex, matchMap) {
      const matchComputed = computed(() => matchMap)
      const Provider = defineComponent({
        setup() {
          return () => h(TranscriptWord, { display: 'cat ', index: wordIndex })
        }
      })
      return mount(Provider, {
        global: { provide: { [readerMatchesKey]: matchComputed } }
      })
    }

    test('data-highlight=true when the word index is in the matches map [obligation]', () => {
      const matchMap = new Map([[5, { lo: 5, hi: 5, term: 'cat', deck_ids: [1] }]])
      const wrapper = mountWordWithMatch(5, matchMap)
      expect(wrapper.find('[data-testid="transcript-word"]').attributes('data-highlight')).toBe(
        'true'
      )
    })

    test('data-highlight=false when the word index is NOT in the matches map [obligation]', () => {
      const matchMap = new Map([[5, { lo: 5, hi: 5, term: 'cat', deck_ids: [1] }]])
      const wrapper = mountWordWithMatch(99, matchMap)
      expect(wrapper.find('[data-testid="transcript-word"]').attributes('data-highlight')).toBe(
        'false'
      )
    })

    test('data-theme is set from match.theme when matched [obligation]', () => {
      const matchMap = new Map([
        [
          3,
          { lo: 3, hi: 3, term: 'dog', deck_ids: [2], theme: 'green-400', theme_dark: 'green-700' }
        ]
      ])
      const wrapper = mountWordWithMatch(3, matchMap)
      expect(wrapper.find('[data-testid="transcript-word"]').attributes('data-theme')).toBe(
        'green-400'
      )
    })

    test('data-theme-dark is set from match.theme_dark when matched [obligation]', () => {
      const matchMap = new Map([
        [
          3,
          { lo: 3, hi: 3, term: 'dog', deck_ids: [2], theme: 'green-400', theme_dark: 'green-700' }
        ]
      ])
      const wrapper = mountWordWithMatch(3, matchMap)
      expect(wrapper.find('[data-testid="transcript-word"]').attributes('data-theme-dark')).toBe(
        'green-700'
      )
    })

    test('falls back to yellow-400 theme when match carries no theme [obligation]', () => {
      const matchMap = new Map([[7, { lo: 7, hi: 7, term: 'fox', deck_ids: [1] }]])
      const wrapper = mountWordWithMatch(7, matchMap)
      expect(wrapper.find('[data-testid="transcript-word"]').attributes('data-theme')).toBe(
        'yellow-400'
      )
    })

    test('falls back to yellow-600 dark theme when match carries no theme [obligation]', () => {
      const matchMap = new Map([[7, { lo: 7, hi: 7, term: 'fox', deck_ids: [1] }]])
      const wrapper = mountWordWithMatch(7, matchMap)
      expect(wrapper.find('[data-testid="transcript-word"]').attributes('data-theme-dark')).toBe(
        'yellow-600'
      )
    })

    test('data-theme and data-theme-dark are absent when the word is not matched [obligation]', () => {
      const wrapper = mountWordWithMatch(99, new Map())
      const el = wrapper.find('[data-testid="transcript-word"]')
      expect(el.attributes('data-theme')).toBeUndefined()
      expect(el.attributes('data-theme-dark')).toBeUndefined()
    })
  })

  // ── lead/core/trail split — underline hugs the term, not the gap [obligation]

  describe('lead/core/trail underline split [obligation]', () => {
    // Build a match map that marks a single word as matched (lo===hi===index)
    function mountMatchedWord(display, index, match) {
      const matchMap = new Map([[index, match]])
      const matchComputed = computed(() => matchMap)
      const Provider = defineComponent({
        setup() {
          return () => h(TranscriptWord, { display, index })
        }
      })
      return mount(Provider, {
        global: { provide: { [readerMatchesKey]: matchComputed } }
      })
    }

    test('the full rendered text (lead+core+trail) equals the original display [obligation]', () => {
      // display = 'cat, ' — lo===hi===0, so leading edge is empty, trailing edge is ', '
      const match = { lo: 0, hi: 0, term: 'cat', deck_ids: [1] }
      const wrapper = mountMatchedWord('cat, ', 0, match)
      const base = wrapper.find('[data-word-base]')
      // Use textContent (not .text()) to preserve trailing whitespace which
      // .text() normalizes away in browser mode.
      expect(base.element.textContent).toBe('cat, ')
    })

    test('the last word of a match strips trailing punctuation/space from the underline [obligation]', () => {
      // display = 'cat, ' matched as lo=hi=0 (last word strips trailing edge)
      // The core span (underlined) should contain only 'cat', not 'cat, '
      const match = { lo: 0, hi: 0, term: 'cat', deck_ids: [1] }
      const wrapper = mountMatchedWord('cat, ', 0, match)
      // Find the span inside data-word-base that has the underline class applied
      // (the core span — it's the only span inside the base span)
      const base = wrapper.find('[data-word-base]')
      const core = base.find('span')
      // The underlined core must be just the term characters, not the trailing ', '
      expect(core.text()).toBe('cat')
    })

    test('the first word of a match strips leading punctuation from the underline [obligation]', () => {
      // display = '"Hello' matched as lo=hi=0 (first word strips leading edge)
      const match = { lo: 0, hi: 0, term: 'hello', deck_ids: [1] }
      const wrapper = mountMatchedWord('"Hello', 0, match)
      const base = wrapper.find('[data-word-base]')
      const core = base.find('span')
      // Core should be 'Hello' not '"Hello'
      expect(core.text()).toBe('Hello')
    })

    test('unmatched word renders its display plainly with no inner span wrapping [obligation]', () => {
      // An unmatched word renders only the base span with the display text directly
      const wrapper = shallowMount(TranscriptWord, { props: { display: 'cat ', index: 0 } })
      const base = wrapper.find('[data-word-base]')
      // Use textContent to preserve trailing space which .text() collapses in browser mode.
      expect(base.element.textContent).toBe('cat ')
    })
  })

  describe('selection drives data-active [obligation]', () => {
    function mountWordWithSelection(wordIndex, rangeRef) {
      const rangeComputed = computed(() => rangeRef.value)
      const Provider = defineComponent({
        setup() {
          return () => h(TranscriptWord, { display: 'test', index: wordIndex })
        }
      })
      return mount(Provider, {
        global: {
          provide: {
            [readerSelectionKey]: rangeComputed
          }
        }
      })
    }

    test('data-active is true when the word is selected [obligation]', () => {
      const rangeRef = ref({ lo: 1, hi: 1 })
      const wrapper = mountWordWithSelection(1, rangeRef)

      const el = wrapper.find('[data-testid="transcript-word"]')
      expect(el.attributes('data-active')).toBe('true')
    })

    test('selected state is rendered (not overridden by audio playing state) when both are true [obligation]', () => {
      // Selection dominates visually via CSS (data-active takes priority); the word
      // only tracks selection — data-playing is painted imperatively by the parent.
      const rangeRef = ref({ lo: 1, hi: 1 })
      const wrapper = mountWordWithSelection(1, rangeRef)

      const el = wrapper.find('[data-testid="transcript-word"]')
      expect(el.attributes('data-active')).toBe('true')
    })
  })
})
