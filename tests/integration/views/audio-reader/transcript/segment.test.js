import { describe, test, expect } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import TranscriptSegment from '@/views/audio-reader/transcript/segment.vue'
import TranscriptWord from '@/views/audio-reader/transcript/word.vue'

const word = (display, index, start = index) => ({ display, start, index })

const group = (words = [word('Hello ', 0), word('world', 1)], extra = {}) => ({
  sentence: 'Hello world',
  start: 0,
  end: 2,
  words,
  ...extra
})

function mountSegment(props = {}) {
  return shallowMount(TranscriptSegment, {
    props: {
      group: group(),
      index: 0,
      ...props
    }
  })
}

describe('TranscriptSegment', () => {
  describe('rendering', () => {
    test('exposes data-index matching the index prop', () => {
      const wrapper = mountSegment({ index: 3 })
      expect(wrapper.find('[data-testid="transcript-segment"]').attributes('data-index')).toBe('3')
    })

    test('renders one TranscriptWord per word in the group', () => {
      const wrapper = mountSegment()
      expect(wrapper.findAllComponents(TranscriptWord)).toHaveLength(2)
    })

    test('passes each word display through to TranscriptWord', () => {
      const wrapper = mountSegment()
      const words = wrapper.findAllComponents(TranscriptWord)
      expect(words[0].props('display')).toBe('Hello ')
      expect(words[1].props('display')).toBe('world')
    })

    test('passes each word reading through to TranscriptWord', () => {
      const wrapper = mountSegment({
        group: group([{ display: '猫', start: 0, index: 0, reading: 'ねこ' }])
      })
      expect(wrapper.findAllComponents(TranscriptWord)[0].props('reading')).toBe('ねこ')
    })
  })

  describe('word identity', () => {
    test('passes each word global index through to TranscriptWord', () => {
      const wrapper = mountSegment({ group: group([word('is ', 4), word('here.', 5)]) })
      const words = wrapper.findAllComponents(TranscriptWord)
      expect(words[0].props('index')).toBe(4)
      expect(words[1].props('index')).toBe(5)
    })
  })

  describe('translation line', () => {
    test('renders translation element when group.translation is set', () => {
      const wrapper = mountSegment({ group: group(undefined, { translation: 'こんにちは世界' }) })
      expect(wrapper.find('[data-testid="transcript-segment__translation"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="transcript-segment__translation"]').text()).toBe(
        'こんにちは世界'
      )
    })

    test('omits translation element when group.translation is absent', () => {
      const wrapper = mountSegment()
      expect(wrapper.find('[data-testid="transcript-segment__translation"]').exists()).toBe(false)
    })
  })
})
