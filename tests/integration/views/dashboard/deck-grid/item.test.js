import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { onSelectMock, pressHoldArmMock, pressHoldCancelMock } = vi.hoisted(() => ({
  onSelectMock: vi.fn(),
  pressHoldArmMock: vi.fn(),
  pressHoldCancelMock: vi.fn()
}))

vi.mock('@/views/dashboard/composables/deck-options-menu', () => ({
  useDeckOptionsMenu: () => ({
    options: [
      { label: 'Settings', value: 'settings', icon: 'build' },
      { label: 'Rearrange', value: 'rearrange', icon: 'rearrange' },
      { label: 'Delete', value: 'delete', icon: 'delete' }
    ],
    onSelect: onSelectMock
  })
}))

vi.mock('@/composables/ui/press-hold', () => ({
  usePressHold: () => ({ arm: pressHoldArmMock, cancel: pressHoldCancelMock })
}))

// ── Stubs ─────────────────────────────────────────────────────────────────────

const DeckThumbnailStub = defineComponent({
  name: 'DeckThumbnail',
  props: [
    'deck',
    'size',
    'sfx',
    'rearranging',
    'dragging',
    'corner_action_always_visible',
    'active'
  ],
  emits: ['press'],
  setup(props, { emit, slots }) {
    return () =>
      h(
        'div',
        {
          'data-testid': 'deck-thumbnail',
          'data-active': String(!!props.active),
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

const UiDropdownButtonStub = defineComponent({
  name: 'UiDropdownButton',
  inheritAttrs: false,
  props: ['options', 'triggerOnly', 'triggerIcon'],
  emits: ['select'],
  setup(props, { emit, expose, attrs }) {
    const open = ref(false)
    function show() {
      open.value = true
    }
    expose({ open, show })
    return () =>
      h(
        'div',
        {
          ...attrs,
          'data-testid': attrs['data-testid'] ?? 'dropdown-stub',
          'data-open': String(open.value),
          'data-trigger-icon': props.triggerIcon
        },
        [
          h('button', {
            'data-testid': 'dropdown-stub__select',
            onClick: () => emit('select', (props.options ?? [])[0])
          })
        ]
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
        UiDropdownButton: UiDropdownButtonStub,
        DeckGridDeleteButton: DeckGridDeleteButtonStub
      }
    }
  })
}

const DECK = { id: 1, title: 'Deck 1', due_count: 0 }

beforeEach(() => {
  onSelectMock.mockClear()
  pressHoldArmMock.mockClear()
  pressHoldCancelMock.mockClear()
})

describe('DeckGridItem — press emit [obligation]', () => {
  test('pressing the deck thumbnail emits press', async () => {
    const wrapper = mount({ deck: DECK })
    await wrapper.find('[data-testid="deck-thumbnail"]').trigger('click')
    expect(wrapper.emitted('press')).toHaveLength(1)
  })
})

describe('DeckGridItem — rearranging mode suppresses press [obligation]', () => {
  test('pressing the thumbnail while rearranging does not emit press', async () => {
    const wrapper = mount({ deck: DECK, rearranging: true })
    await wrapper.find('[data-testid="deck-thumbnail"]').trigger('click')
    expect(wrapper.emitted('press')).toBeFalsy()
  })

  test('the corner-action (options dropdown) is not rendered while rearranging', () => {
    const wrapper = mount({ deck: DECK, rearranging: true })
    expect(wrapper.find('[data-testid="dashboard__deck-options-button"]').exists()).toBe(false)
  })
})

describe('DeckGridItem — jiggle sits on the wrapper, not DeckThumbnail root [obligation]', () => {
  test('applies .jiggle to the outer wrapper element while rearranging and not dragging', () => {
    const wrapper = mount({ deck: DECK, rearranging: true, dragging: false })
    expect(wrapper.classes()).toContain('jiggle')
    expect(wrapper.find('[data-testid="deck-thumbnail"]').classes()).not.toContain('jiggle')
  })

  test('omits .jiggle while dragging (opts out of the idle jiggle)', () => {
    const wrapper = mount({ deck: DECK, rearranging: true, dragging: true })
    expect(wrapper.classes()).not.toContain('jiggle')
  })

  test('omits .jiggle when not rearranging', () => {
    const wrapper = mount({ deck: DECK })
    expect(wrapper.classes()).not.toContain('jiggle')
  })
})

describe('DeckGridItem — corner-action swaps to the delete button while rearranging [obligation]', () => {
  test('renders DeckGridDeleteButton with the deck while rearranging', () => {
    const wrapper = mount({ deck: DECK, rearranging: true })
    const delete_button = wrapper.findComponent(DeckGridDeleteButtonStub)
    expect(delete_button.exists()).toBe(true)
    expect(delete_button.props('deck')).toEqual(DECK)
  })

  test('does not render DeckGridDeleteButton when not rearranging', () => {
    const wrapper = mount({ deck: DECK, rearranging: false })
    expect(wrapper.findComponent(DeckGridDeleteButtonStub).exists()).toBe(false)
  })
})

describe('DeckGridItem — forwards rearranging/dragging to DeckThumbnail [obligation]', () => {
  test('forwards rearranging as corner_action_always_visible and rearranging', () => {
    const wrapper = mount({ deck: DECK, rearranging: true })
    const thumbnail = wrapper.findComponent(DeckThumbnailStub)
    expect(thumbnail.props('rearranging')).toBe(true)
    expect(thumbnail.props('corner_action_always_visible')).toBe(true)
  })

  test('forwards dragging to DeckThumbnail', () => {
    const wrapper = mount({ deck: DECK, rearranging: true, dragging: true })
    expect(wrapper.findComponent(DeckThumbnailStub).props('dragging')).toBe(true)
  })
})

describe('DeckGridItem — testid rename to dashboard__deck-options-button', () => {
  test('renders the options dropdown with the new testid', () => {
    const wrapper = mount({ deck: DECK })
    expect(wrapper.find('[data-testid="dashboard__deck-options-button"]').exists()).toBe(true)
  })

  test('does not render the old dashboard__deck-settings-button testid', () => {
    const wrapper = mount({ deck: DECK })
    expect(wrapper.find('[data-testid="dashboard__deck-settings-button"]').exists()).toBe(false)
  })
})

describe('DeckGridItem — trigger icon swap [obligation]', () => {
  test('shows the "more" icon when the dropdown is closed', () => {
    const wrapper = mount({ deck: DECK })
    expect(
      wrapper.find('[data-testid="dashboard__deck-options-button"]').attributes('data-trigger-icon')
    ).toBe('more')
  })

  test('swaps to the "close" icon once the dropdown opens', async () => {
    const wrapper = mount({ deck: DECK })
    await wrapper.trigger('pointerdown', { pointerType: 'touch' })
    pressHoldArmMock.mock.calls[0][1]()
    await nextTick()
    expect(
      wrapper.find('[data-testid="dashboard__deck-options-button"]').attributes('data-trigger-icon')
    ).toBe('close')
  })
})

describe('DeckGridItem — DeckThumbnail active prop mirrors the dropdown open state [obligation]', () => {
  test('DeckThumbnail is not active while the dropdown is closed', () => {
    const wrapper = mount({ deck: DECK })
    expect(wrapper.findComponent(DeckThumbnailStub).props('active')).toBe(false)
  })

  test('DeckThumbnail becomes active once the dropdown opens', async () => {
    const wrapper = mount({ deck: DECK })
    await wrapper.trigger('pointerdown', { pointerType: 'touch' })
    pressHoldArmMock.mock.calls[0][1]()
    await nextTick()
    expect(wrapper.findComponent(DeckThumbnailStub).props('active')).toBe(true)
  })
})

describe('DeckGridItem — dropdown select forwards to useDeckOptionsMenu.onSelect [obligation]', () => {
  test('selecting an option calls onSelect with the option and the deck', async () => {
    const wrapper = mount({ deck: DECK })
    await wrapper.find('[data-testid="dropdown-stub__select"]').trigger('click')
    expect(onSelectMock).toHaveBeenCalledWith(
      { label: 'Settings', value: 'settings', icon: 'build' },
      DECK
    )
  })

  test('clicking a dropdown option does not bubble a click into the thumbnail (no press emit) [obligation]', async () => {
    // Regression: dropdown-button drops all on* attrs in trigger-only mode, so
    // `.stop` lives on the wrapper div around it — without that, selecting a
    // menu option would bubble into DeckThumbnail's tappable and navigate.
    const wrapper = mount({ deck: DECK })
    await wrapper.find('[data-testid="dropdown-stub__select"]').trigger('click')
    expect(wrapper.emitted('press')).toBeFalsy()
  })
})

describe('DeckGridItem — mode arbitration on pointerdown [obligation]', () => {
  test('a touch pointerdown in normal mode arms a hold that calls the dropdown show()', async () => {
    const wrapper = mount({ deck: DECK })
    await wrapper.trigger('pointerdown', { pointerType: 'touch' })

    expect(pressHoldArmMock).toHaveBeenCalledTimes(1)
    const onHold = pressHoldArmMock.mock.calls[0][1]
    onHold()
    await nextTick()

    expect(wrapper.findComponent(DeckThumbnailStub).props('active')).toBe(true)
  })

  test('a mouse pointerdown does NOT arm the hold', async () => {
    const wrapper = mount({ deck: DECK })
    await wrapper.trigger('pointerdown', { pointerType: 'mouse' })
    expect(pressHoldArmMock).not.toHaveBeenCalled()
  })

  test('rearranging mode does NOT arm the hold — the grid owns pointerdown for pickup', async () => {
    const wrapper = mount({ deck: DECK, rearranging: true })
    await wrapper.trigger('pointerdown', { pointerType: 'touch' })
    expect(pressHoldArmMock).not.toHaveBeenCalled()
  })
})
