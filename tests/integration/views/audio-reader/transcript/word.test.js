import { describe, test, expect } from 'vite-plus/test'
import { shallowMount, mount } from '@vue/test-utils'
import { defineComponent, h, ref, computed } from 'vue'
import TranscriptWord from '@/views/audio-reader/transcript/word.vue'
import {
  readerActiveWordKey,
  readerSelectionKey
} from '@/composables/audio-reader/use-reader-highlights'

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

  describe('data-playing via injected readerActiveWordKey [obligation]', () => {
    function mountWordWithActiveWord(wordIndex, activeWord) {
      const activeRef = computed(() => activeWord)
      const Provider = defineComponent({
        setup() {
          return () => h(TranscriptWord, { display: 'test', index: wordIndex })
        }
      })
      return mount(Provider, {
        global: { provide: { [readerActiveWordKey]: activeRef } }
      })
    }

    test('data-playing is true when active-word index equals this word index [obligation]', () => {
      const wrapper = mountWordWithActiveWord(2, 2)
      expect(wrapper.find('[data-testid="transcript-word"]').attributes('data-playing')).toBe(
        'true'
      )
    })

    test('data-playing is false when active-word index differs from this word index [obligation]', () => {
      const wrapper = mountWordWithActiveWord(2, 5)
      expect(wrapper.find('[data-testid="transcript-word"]').attributes('data-playing')).toBe(
        'false'
      )
    })

    test('data-playing is false when no active-word is injected', () => {
      const wrapper = mountWord({ index: 1 })
      expect(wrapper.find('[data-testid="transcript-word"]').attributes('data-playing')).toBe(
        'false'
      )
    })
  })

  describe('selection wins over audio state [obligation]', () => {
    function mountWordWithBoth(wordIndex, rangeRef, activeWordRef) {
      const rangeComputed = computed(() => rangeRef.value)
      const activeComputed = computed(() => activeWordRef.value)
      const Provider = defineComponent({
        setup() {
          return () => h(TranscriptWord, { display: 'test', index: wordIndex })
        }
      })
      return mount(Provider, {
        global: {
          provide: {
            [readerSelectionKey]: rangeComputed,
            [readerActiveWordKey]: activeComputed
          }
        }
      })
    }

    test('when a word is both selected and the active audio word, data-active is true and data-playing is true [obligation]', () => {
      const rangeRef = ref({ lo: 1, hi: 1 })
      const activeRef = ref(1)
      const wrapper = mountWordWithBoth(1, rangeRef, activeRef)

      const el = wrapper.find('[data-testid="transcript-word"]')
      expect(el.attributes('data-active')).toBe('true')
      expect(el.attributes('data-playing')).toBe('true')
    })

    test('selected state is rendered (not overridden by audio playing state) when both are true [obligation]', () => {
      // Both selected and playing — the word should report both flags true;
      // the CSS rendering logic (selection wins visually) is driven by the
      // data-active attribute taking priority in the template class logic.
      const rangeRef = ref({ lo: 1, hi: 1 })
      const activeRef = ref(1)
      const wrapper = mountWordWithBoth(1, rangeRef, activeRef)

      const el = wrapper.find('[data-testid="transcript-word"]')
      // Selection dominates: data-active=true means the selected styles apply
      expect(el.attributes('data-active')).toBe('true')
    })
  })
})
