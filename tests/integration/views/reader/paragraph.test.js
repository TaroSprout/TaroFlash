import { describe, test, expect } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import ReaderParagraph from '@/views/reader/paragraph.vue'

const WORDS = [
  { display: 'hello', start: 0, index: 0 },
  { display: 'sekai', start: 1, index: 1, reading: 'せかい' }
]

function mountParagraph(props = {}) {
  return shallowMount(ReaderParagraph, {
    props: { words: WORDS, paragraphIndex: 0, ...props }
  })
}

describe('ReaderParagraph', () => {
  test('renders one reader-word per word, in order', () => {
    const wrapper = mountParagraph()

    const words = wrapper.findAll('[data-testid="reader-word"]')
    expect(words).toHaveLength(2)
    expect(words[0].text()).toContain('hello')
    expect(words[1].text()).toContain('sekai')
  })

  test('each word carries its own index and the paragraph index', () => {
    const wrapper = mountParagraph()

    const words = wrapper.findAll('[data-testid="reader-word"]')
    expect(words[0].attributes('data-word-index')).toBe('0')
    expect(words[1].attributes('data-word-index')).toBe('1')
    expect(words[0].attributes('data-paragraph-index')).toBe('0')
    expect(words[1].attributes('data-paragraph-index')).toBe('0')
  })

  test('carries the word display text on data-word-text for text reconstruction', () => {
    const wrapper = mountParagraph()

    const words = wrapper.findAll('[data-testid="reader-word"]')
    expect(words[0].attributes('data-word-text')).toBe('hello')
    expect(words[1].attributes('data-word-text')).toBe('sekai')
  })

  test('renders a reading as rt only for words that have one', () => {
    const wrapper = mountParagraph()

    const words = wrapper.findAll('[data-testid="reader-word"]')
    expect(words[0].find('[data-testid="reader-word__reading"]').exists()).toBe(false)
    const reading = words[1].find('[data-testid="reader-word__reading"]')
    expect(reading.exists()).toBe(true)
    expect(reading.text()).toBe('せかい')
  })

  test('the root carries the paragraph index as a data attribute', () => {
    const wrapper = mountParagraph({ paragraphIndex: 3 })

    expect(wrapper.find('[data-testid="reader-paragraph"]').attributes('data-paragraph')).toBe('3')
  })
})
