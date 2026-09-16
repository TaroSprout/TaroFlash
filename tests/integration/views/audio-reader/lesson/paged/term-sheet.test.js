import { describe, test, expect, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

vi.mock('gsap', () => ({
  gsap: {
    fromTo: vi.fn((_el, _from, to) => to?.onComplete?.()),
    to: vi.fn((_el, opts) => opts?.onComplete?.())
  }
}))

import PagedTermSheet from '@/views/audio-reader/lesson/paged/term-sheet.vue'

const TermCardStub = defineComponent({
  name: 'TermCard',
  inheritAttrs: false,
  props: ['term', 'sentence', 'target_lang', 'existing_decks', 'show_back'],
  emits: ['back', 'close', 'play-from-here', 'play-word'],
  setup(props, { emit }) {
    return () =>
      h('div', { 'data-testid': 'term-card-stub' }, [
        h('span', { 'data-testid': 'term-card-stub__term' }, props.term),
        h('button', { 'data-testid': 'term-card-stub__close', onClick: () => emit('close') }),
        h('button', {
          'data-testid': 'term-card-stub__play-from-here',
          onClick: () => emit('play-from-here')
        }),
        h('button', {
          'data-testid': 'term-card-stub__play-word',
          onClick: () => emit('play-word')
        })
      ])
  }
})

const SELECTION = {
  term: 'hello',
  sentence: 'hello world',
  rect: new DOMRect(0, 0, 10, 10),
  word_index: 0,
  word_end_index: 0
}

function mountSheet(props = {}) {
  return shallowMount(PagedTermSheet, {
    props: {
      selection: SELECTION,
      open: true,
      targetLang: 'en',
      ...props
    },
    global: { stubs: { TermCard: TermCardStub } }
  })
}

describe('PagedTermSheet', () => {
  test('renders the term card with the selection when open', () => {
    const wrapper = mountSheet()

    expect(wrapper.find('[data-testid="paged-term-sheet"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="term-card-stub__term"]').text()).toBe('hello')
  })

  test('renders nothing when closed', () => {
    const wrapper = mountSheet({ open: false })

    expect(wrapper.find('[data-testid="paged-term-sheet"]').exists()).toBe(false)
  })

  test('renders nothing when open but selection is null', () => {
    const wrapper = mountSheet({ selection: null })

    expect(wrapper.find('[data-testid="paged-term-sheet"]').exists()).toBe(false)
  })

  test('a pointerdown on the backdrop emits close', async () => {
    const wrapper = mountSheet()

    await wrapper.find('[data-testid="paged-term-sheet__backdrop"]').trigger('pointerdown')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  test('the term card close button emits close', async () => {
    const wrapper = mountSheet()

    await wrapper.find('[data-testid="term-card-stub__close"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  test('forwards play-from-here and play-word from the term card', async () => {
    const wrapper = mountSheet()

    await wrapper.find('[data-testid="term-card-stub__play-from-here"]').trigger('click')
    await wrapper.find('[data-testid="term-card-stub__play-word"]').trigger('click')

    expect(wrapper.emitted('play-from-here')).toHaveLength(1)
    expect(wrapper.emitted('play-word')).toHaveLength(1)
  })

  test('forwards existingDecks to the term card', () => {
    const wrapper = mountSheet({ existingDecks: [1, 2] })

    const stub = wrapper.findComponent(TermCardStub)
    expect(stub.props('existing_decks')).toEqual([1, 2])
  })
})
