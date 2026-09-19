import '@/styles/main.css'
import { describe, test, expect } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import ReaderPage from '@/views/reader/page.vue'

const ReaderParagraphStub = defineComponent({
  name: 'ReaderParagraph',
  inheritAttrs: false,
  props: ['words', 'paragraphIndex'],
  setup(props, { attrs }) {
    return () =>
      h('div', {
        ...attrs,
        'data-testid': 'reader-paragraph-stub',
        'data-paragraph-index': props.paragraphIndex
      })
  }
})

function mountPage(slices) {
  return shallowMount(ReaderPage, {
    props: { slices },
    global: { stubs: { ReaderParagraph: ReaderParagraphStub } },
    attachTo: document.body
  })
}

const SLICE = (paragraph_index, word_index) => ({
  paragraph_index,
  words: [{ display: 'w', start: 0, index: word_index }],
  translation: undefined
})

describe('ReaderPage', () => {
  test('renders one reader-paragraph per slice, in order', () => {
    const wrapper = mountPage([SLICE(0, 0), SLICE(1, 1), SLICE(2, 2)])

    const paragraphs = wrapper.findAll('[data-testid="reader-paragraph-stub"]')
    expect(paragraphs).toHaveLength(3)
    expect(paragraphs.map((p) => p.attributes('data-paragraph-index'))).toEqual(['0', '1', '2'])
  })

  test('renders nothing when the page has no slices', () => {
    const wrapper = mountPage([])

    expect(wrapper.findAll('[data-testid="reader-paragraph-stub"]').length).toBe(0)
  })

  test('adds top margin to every paragraph after the first', () => {
    const wrapper = mountPage([SLICE(0, 0), SLICE(1, 1)])

    const paragraphs = wrapper.findAll('[data-testid="reader-paragraph-stub"]')
    expect(getComputedStyle(paragraphs[0].element).marginTop).toBe('0px')
    expect(getComputedStyle(paragraphs[1].element).marginTop).not.toBe('0px')
  })
})
