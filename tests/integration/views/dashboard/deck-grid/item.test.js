import { describe, test, expect } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

const DeckThumbnailStub = defineComponent({
  name: 'DeckThumbnail',
  props: ['deck', 'size', 'sfx', 'rearranging', 'dragging', 'corner_action_always_visible'],
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

const DeckGridDeleteButtonStub = defineComponent({
  name: 'DeckGridDeleteButton',
  props: ['deck'],
  setup(props) {
    return () =>
      h('div', { 'data-testid': 'deck-grid-delete-button', 'data-deck-id': props.deck.id })
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
    global: {
      stubs: {
        DeckThumbnail: DeckThumbnailStub,
        UiButton: UiButtonStub,
        DeckGridDeleteButton: DeckGridDeleteButtonStub
      }
    }
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

describe('DeckGridItem — rearranging mode suppresses press [obligation]', () => {
  test('pressing the thumbnail while rearranging does not emit press', async () => {
    const wrapper = mount({ deck: DECK, size: 'base', rearranging: true })
    await wrapper.find('[data-testid="deck-thumbnail"]').trigger('click')
    expect(wrapper.emitted('press')).toBeFalsy()
  })

  test('the corner-action (settings button) is not rendered while rearranging', () => {
    const wrapper = mount({ deck: DECK, size: 'base', rearranging: true })
    expect(wrapper.find('[data-testid="dashboard__deck-settings-button"]').exists()).toBe(false)
  })
})

describe('DeckGridItem — jiggle sits on the wrapper, not DeckThumbnail root [obligation]', () => {
  test('applies .jiggle to the outer wrapper element while rearranging and not dragging', () => {
    const wrapper = mount({ deck: DECK, size: 'base', rearranging: true, dragging: false })
    expect(wrapper.classes()).toContain('jiggle')
    expect(wrapper.find('[data-testid="deck-thumbnail"]').classes()).not.toContain('jiggle')
  })

  test('omits .jiggle while dragging (opts out of the idle jiggle)', () => {
    const wrapper = mount({ deck: DECK, size: 'base', rearranging: true, dragging: true })
    expect(wrapper.classes()).not.toContain('jiggle')
  })

  test('omits .jiggle when not rearranging', () => {
    const wrapper = mount({ deck: DECK, size: 'base' })
    expect(wrapper.classes()).not.toContain('jiggle')
  })
})

describe('DeckGridItem — corner-action swaps to the delete button while rearranging [obligation]', () => {
  test('renders DeckGridDeleteButton with the deck while rearranging', () => {
    const wrapper = mount({ deck: DECK, size: 'base', rearranging: true })
    const delete_button = wrapper.findComponent(DeckGridDeleteButtonStub)
    expect(delete_button.exists()).toBe(true)
    expect(delete_button.props('deck')).toEqual(DECK)
  })

  test('does not render DeckGridDeleteButton when not rearranging', () => {
    const wrapper = mount({ deck: DECK, size: 'base', rearranging: false })
    expect(wrapper.findComponent(DeckGridDeleteButtonStub).exists()).toBe(false)
  })
})

describe('DeckGridItem — forwards rearranging/dragging to DeckThumbnail [obligation]', () => {
  test('forwards rearranging as corner_action_always_visible and rearranging', () => {
    const wrapper = mount({ deck: DECK, size: 'base', rearranging: true })
    const thumbnail = wrapper.findComponent(DeckThumbnailStub)
    expect(thumbnail.props('rearranging')).toBe(true)
    expect(thumbnail.props('corner_action_always_visible')).toBe(true)
  })

  test('forwards dragging to DeckThumbnail', () => {
    const wrapper = mount({ deck: DECK, size: 'base', rearranging: true, dragging: true })
    expect(wrapper.findComponent(DeckThumbnailStub).props('dragging')).toBe(true)
  })
})
