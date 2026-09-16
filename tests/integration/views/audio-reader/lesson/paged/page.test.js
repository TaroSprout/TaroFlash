import { describe, test, expect } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import PagedPage from '@/views/audio-reader/lesson/paged/page.vue'

const PagedSegmentStub = defineComponent({
  name: 'PagedSegment',
  inheritAttrs: false,
  props: ['words', 'paragraphIndex', 'translation', 'showGloss'],
  setup(props, { attrs }) {
    return () =>
      h('div', {
        ...attrs,
        'data-testid': 'paged-segment-stub',
        'data-paragraph-index': props.paragraphIndex,
        'data-show-gloss': props.showGloss
      })
  }
})

function mountPage(slices) {
  return shallowMount(PagedPage, {
    props: { slices },
    global: { stubs: { PagedSegment: PagedSegmentStub } }
  })
}

const SLICE = (paragraph_index, word_index) => ({
  paragraph_index,
  words: [{ display: 'w', start: 0, index: word_index }],
  translation: undefined,
  is_start: true,
  show_gloss: false
})

describe('PagedPage', () => {
  test('renders one paged-segment per slice, in order', () => {
    const wrapper = mountPage([SLICE(0, 0), SLICE(1, 1), SLICE(2, 2)])

    const segments = wrapper.findAll('[data-testid="paged-segment-stub"]')
    expect(segments).toHaveLength(3)
    expect(segments.map((s) => s.attributes('data-paragraph-index'))).toEqual(['0', '1', '2'])
  })

  test('forwards showGloss through to each segment', () => {
    const slice = { ...SLICE(0, 0), show_gloss: true }
    const wrapper = mountPage([slice])

    expect(wrapper.find('[data-testid="paged-segment-stub"]').attributes('data-show-gloss')).toBe(
      'true'
    )
  })

  test('renders nothing when the page has no slices', () => {
    const wrapper = mountPage([])

    expect(wrapper.findAll('[data-testid="paged-segment-stub"]').length).toBe(0)
  })
})
