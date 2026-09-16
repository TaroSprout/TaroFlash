import { describe, test, expect } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import PagedSegment from '@/views/audio-reader/lesson/paged/segment.vue'

const WORDS = [
  { display: 'hello', start: 0, index: 0 },
  { display: 'sekai', start: 1, index: 1, reading: 'せかい' }
]

function mountSegment(props = {}) {
  return shallowMount(PagedSegment, {
    props: {
      words: WORDS,
      paragraphIndex: 0,
      ...props
    }
  })
}

describe('PagedSegment', () => {
  test('renders one paged-word per word, in order', () => {
    const wrapper = mountSegment()

    const words = wrapper.findAll('[data-testid="paged-word"]')
    expect(words).toHaveLength(2)
    expect(words[0].text()).toContain('hello')
    expect(words[1].text()).toContain('sekai')
  })

  test('each word carries its own index and the segment paragraph index', () => {
    const wrapper = mountSegment()

    const words = wrapper.findAll('[data-testid="paged-word"]')
    expect(words[0].attributes('data-word-index')).toBe('0')
    expect(words[1].attributes('data-word-index')).toBe('1')
    expect(words[0].attributes('data-paragraph-index')).toBe('0')
    expect(words[1].attributes('data-paragraph-index')).toBe('0')
  })

  test('carries the word display text on data-word-text for text reconstruction', () => {
    const wrapper = mountSegment()

    const words = wrapper.findAll('[data-testid="paged-word"]')
    expect(words[0].attributes('data-word-text')).toBe('hello')
    expect(words[1].attributes('data-word-text')).toBe('sekai')
  })

  test('renders a reading as rt only for words that have one', () => {
    const wrapper = mountSegment()

    const words = wrapper.findAll('[data-testid="paged-word"]')
    expect(words[0].find('[data-testid="paged-word__reading"]').exists()).toBe(false)
    const reading = words[1].find('[data-testid="paged-word__reading"]')
    expect(reading.exists()).toBe(true)
    expect(reading.text()).toBe('せかい')
  })

  test('data-last-in-paragraph is set on the final word only when endsParagraph is true', () => {
    const wrapper = mountSegment({ endsParagraph: true })

    const words = wrapper.findAll('[data-testid="paged-word"]')
    expect(words[0].attributes('data-last-in-paragraph')).toBeUndefined()
    expect(words[1].attributes('data-last-in-paragraph')).toBe('')
  })

  test('data-last-in-paragraph is absent from every word when endsParagraph is false', () => {
    const wrapper = mountSegment({ endsParagraph: false })

    const words = wrapper.findAll('[data-testid="paged-word"]')
    for (const word of words) expect(word.attributes('data-last-in-paragraph')).toBeUndefined()
  })

  test('renders the translation only when both translation and showGloss are set', () => {
    const withoutGloss = mountSegment({ translation: 'hello world', showGloss: false })
    expect(withoutGloss.find('[data-testid="paged-segment__translation"]').exists()).toBe(false)

    const withoutTranslation = mountSegment({ showGloss: true })
    expect(withoutTranslation.find('[data-testid="paged-segment__translation"]').exists()).toBe(
      false
    )

    const withGloss = mountSegment({ translation: 'hello world', showGloss: true })
    const gloss = withGloss.find('[data-testid="paged-segment__translation"]')
    expect(gloss.exists()).toBe(true)
    expect(gloss.text()).toBe('hello world')
  })

  test('the translation carries data-gloss for the pagination pass to find it', () => {
    const wrapper = mountSegment({ translation: 'hello world', showGloss: true })

    const gloss = wrapper.find('[data-testid="paged-segment__translation"]')
    expect(gloss.attributes('data-gloss')).toBe('')
  })
})
