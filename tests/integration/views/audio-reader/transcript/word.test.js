import { describe, test, expect } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import TranscriptWord from '@/views/audio-reader/transcript/word.vue'

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
})
