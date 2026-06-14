import { describe, test, expect } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'

const ChildStub = (name) =>
  defineComponent({
    name,
    inheritAttrs: false,
    setup() {
      return () => h('div', { 'data-testid': `${name.toLowerCase()}-stub` })
    }
  })

import DeckHero from '@/views/deck/deck-hero/index.vue'
import { cardEditorKey } from '@/composables/card/list-controller'

function makeEditor({ is_selecting = false } = {}) {
  return { selection: { is_selecting: ref(is_selecting) } }
}

function mount({ editor } = {}) {
  return shallowMount(DeckHero, {
    props: { deck: { id: 1, title: 'd', card_count: 10 } },
    global: {
      provide: editor === undefined ? {} : { [cardEditorKey]: editor },
      stubs: {
        Thumbnail: ChildStub('Thumbnail'),
        DeckDetails: ChildStub('DeckDetails'),
        Actions: ChildStub('Actions'),
        BulkActions: ChildStub('BulkActions')
      }
    }
  })
}

describe('deck-hero/index', () => {
  test('renders the deck-hero root', () => {
    const wrapper = mount()
    expect(wrapper.find('[data-testid="deck-hero"]').exists()).toBe(true)
  })

  test('always renders thumbnail + details', () => {
    const wrapper = mount()
    expect(wrapper.find('[data-testid="thumbnail-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="deckdetails-stub"]').exists()).toBe(true)
  })

  test('renders default actions and hides bulk-actions when not selecting', () => {
    const wrapper = mount({ editor: makeEditor({ is_selecting: false }) })
    expect(wrapper.find('[data-testid="actions-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="bulkactions-stub"]').exists()).toBe(false)
  })

  test('renders bulk-actions and hides default actions when selecting', () => {
    const wrapper = mount({ editor: makeEditor({ is_selecting: true }) })
    expect(wrapper.find('[data-testid="bulkactions-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="actions-stub"]').exists()).toBe(false)
  })

  test('shows default actions when no editor is provided (no selection state)', () => {
    const wrapper = mount()
    expect(wrapper.find('[data-testid="actions-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="bulkactions-stub"]').exists()).toBe(false)
  })
})
