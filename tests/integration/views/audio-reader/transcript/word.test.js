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
})
