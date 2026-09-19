import { describe, test, expect } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { nextTick } from 'vue'
import BookMeasure from '@/views/reader/book-measure.vue'

function paragraph(index, { translation, words } = {}) {
  return {
    index,
    sentence: `sentence ${index}`,
    translation,
    start: index,
    end: index + 1,
    words: words ?? [
      { display: `word${index}a`, start: index, index: index * 2 },
      { display: `word${index}b`, start: index, index: index * 2 + 1 }
    ]
  }
}

function frame() {
  return new Promise((resolve) => requestAnimationFrame(resolve))
}

/** One measurement tick: an animation frame, then the DOM flush it triggers. */
async function tick() {
  await frame()
  await nextTick()
}

describe('BookMeasure', () => {
  test('renders a hidden, non-interactive measurement scratchpad', () => {
    const wrapper = shallowMount(BookMeasure, {
      props: { paragraphs: [paragraph(0)], width: 400 }
    })

    const root = wrapper.find('[data-testid="book-measure"]')
    expect(root.attributes('aria-hidden')).toBe('true')
    expect(root.classes()).toContain('pointer-events-none')
    expect(root.classes()).toContain('invisible')
  })

  test('the words host is sized to the width prop', () => {
    const wrapper = shallowMount(BookMeasure, {
      props: { paragraphs: [paragraph(0)], width: 400 }
    })

    expect(wrapper.find('[data-testid="book-measure__words"]').attributes('style')).toContain(
      'width: 400px'
    )
  })

  test('progressively renders paragraph words while measuring, then clears the scratchpad once settled', async () => {
    const wrapper = shallowMount(BookMeasure, {
      props: { paragraphs: [paragraph(0)], width: 400 }
    })

    await nextTick()
    await tick()
    expect(wrapper.findAll('[data-word-index]').length).toBeGreaterThan(0)

    await tick()
    expect(wrapper.findAll('[data-word-index]')).toHaveLength(0)
  })

  test('renders a translation band only for a paragraph carrying one', async () => {
    const wrapper = shallowMount(BookMeasure, {
      props: {
        paragraphs: [
          paragraph(0, { translation: 'hello' }),
          paragraph(1, { translation: undefined })
        ],
        width: 400
      }
    })

    await nextTick()
    await tick()

    const bands = wrapper.findAll('[data-band-index]')
    expect(bands.map((b) => b.attributes('data-band-index'))).toEqual(['0'])
    expect(bands[0].text()).toBe('hello')
  })

  test('renders a reading above a word that carries one, and none for a word without', async () => {
    const wrapper = shallowMount(BookMeasure, {
      props: {
        paragraphs: [
          paragraph(0, {
            words: [
              { display: '読む', start: 0, index: 0, reading: 'よむ' },
              { display: 'plain', start: 1, index: 1 }
            ]
          })
        ],
        width: 400
      }
    })

    await nextTick()
    await tick()

    const words = wrapper.findAll('[data-word-index]')
    expect(words[0].find('rt').exists()).toBe(true)
    expect(words[0].find('rt').text()).toBe('よむ')
    expect(words[1].find('rt').exists()).toBe(false)
  })

  test('an empty paragraph list renders no words and no bands', async () => {
    const wrapper = shallowMount(BookMeasure, { props: { paragraphs: [], width: 400 } })

    await frame()
    await frame()

    expect(wrapper.findAll('[data-word-index]')).toHaveLength(0)
    expect(wrapper.findAll('[data-band-index]')).toHaveLength(0)
  })
})
