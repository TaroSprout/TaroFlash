import { describe, test, expect } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

const DeckThumbnailStub = defineComponent({
  name: 'DeckThumbnail',
  props: ['deck', 'size', 'sfx'],
  emits: ['press'],
  setup(props, { emit, slots }) {
    return () =>
      h(
        'div',
        {
          'data-testid': 'deck-thumbnail',
          onClick: () => emit('press')
        },
        [slots['corner-action']?.()]
      )
  }
})

const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  props: ['iconLeft', 'iconOnly'],
  emits: ['press'],
  setup(_p, { slots, attrs, emit }) {
    return () =>
      h(
        'button',
        {
          'data-testid': attrs['data-testid'] ?? 'ui-button',
          onClick: (e) => {
            attrs.onClick?.(e)
            emit('press')
          }
        },
        [slots.default?.()]
      )
  }
})

import DeckGridItem from '@/views/dashboard/deck-grid/item.vue'

function mount(props) {
  return shallowMount(DeckGridItem, {
    props,
    global: { stubs: { DeckThumbnail: DeckThumbnailStub, UiButton: UiButtonStub } }
  })
}

const DECK = { id: 1, title: 'Deck 1', due_count: 0 }

describe('DeckGridItem — press emit [obligation]', () => {
  test('pressing the deck thumbnail emits press', async () => {
    const wrapper = mount({ deck: DECK, size: 'base' })
    await wrapper.find('[data-testid="deck-thumbnail"]').trigger('click')
    expect(wrapper.emitted('press')).toHaveLength(1)
  })
})

describe('DeckGridItem — settings emit [obligation]', () => {
  test('pressing the settings button emits settings and not press', async () => {
    const wrapper = mount({ deck: DECK, size: 'base' })
    await wrapper.find('[data-testid="dashboard__deck-settings-button"]').trigger('click')
    expect(wrapper.emitted('settings')).toHaveLength(1)
    expect(wrapper.emitted('press')).toBeFalsy()
  })
})
