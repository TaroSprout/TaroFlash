import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, ref, useAttrs } from 'vue'

// Stub UiButton to render its default slot so label text is inspectable,
// and forward attrs (including data-testid) for querying.
const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  setup(_p, { slots }) {
    const attrs = useAttrs()
    return () => h('button', attrs, slots.default?.())
  }
})

const mocks = vi.hoisted(() => ({
  prependCardMock: vi.fn(),
  appendCardMock: vi.fn(),
  onDeleteCardsMock: vi.fn(),
  onMoveCardsMock: vi.fn(),
  onSelectCardMock: vi.fn(),
  isCardSelectedMock: vi.fn()
}))

import ListItem from '@/views/deck/card-editor/list-item.vue'
import ItemOptions from '@/views/deck/card-editor/list-item-options.vue'

function makeCard(overrides = {}) {
  return {
    id: 1,
    deck_id: 10,
    front_text: 'Q',
    back_text: 'A',
    rank: 1000,
    ...overrides
  }
}

function makeProvide({ is_selecting = ref(false) } = {}) {
  return {
    'card-editor': {
      // appendCard/prependCard are injected from the root controller surface
      // (card-list-controller.ts exposes them directly, not nested under list)
      appendCard: mocks.appendCardMock,
      prependCard: mocks.prependCardMock,
      selection: {
        is_selecting,
        isCardSelected: mocks.isCardSelectedMock
      },
      actions: {
        onDeleteCards: mocks.onDeleteCardsMock,
        onMoveCards: mocks.onMoveCardsMock,
        onSelectCard: mocks.onSelectCardMock
      }
    }
  }
}

function mount({ card, index = 0, is_selecting } = {}) {
  return shallowMount(ListItem, {
    props: { card: makeCard(card), index },
    global: {
      stubs: { UiButton: UiButtonStub },
      provide: makeProvide({ is_selecting })
    }
  })
}

beforeEach(() => {
  mocks.prependCardMock.mockReset()
  mocks.appendCardMock.mockReset()
  mocks.onDeleteCardsMock.mockReset()
  mocks.onMoveCardsMock.mockReset()
  mocks.onSelectCardMock.mockReset()
  mocks.isCardSelectedMock.mockReset()
  mocks.isCardSelectedMock.mockReturnValue(false)
})

describe('ListItem', () => {
  // ── Add-card buttons — label text ────────────────────────────────────────

  test('add-above button carries the localized "Add Card" label text', () => {
    const wrapper = mount()
    const btn = wrapper.find('[data-testid="card-list-item__add-above"]')
    expect(btn.exists()).toBe(true)
    expect(btn.text()).toContain('Add Card')
  })

  test('add-below button carries the localized "Add Card" label text', () => {
    const wrapper = mount()
    const btn = wrapper.find('[data-testid="card-list-item__add-below"]')
    expect(btn.exists()).toBe(true)
    expect(btn.text()).toContain('Add Card')
  })

  // ── Add-card buttons — click wiring ──────────────────────────────────────

  test('clicking add-above calls prependCard with the card id', async () => {
    const wrapper = mount({ card: { id: 7 } })
    await wrapper.find('[data-testid="card-list-item__add-above"]').trigger('click')
    expect(mocks.prependCardMock).toHaveBeenCalledWith(7)
  })

  test('clicking add-below calls appendCard with the card id', async () => {
    const wrapper = mount({ card: { id: 7 } })
    await wrapper.find('[data-testid="card-list-item__add-below"]').trigger('click')
    expect(mocks.appendCardMock).toHaveBeenCalledWith(7)
  })

  // ── Add-card buttons — hidden in selection mode ───────────────────────────

  test('add-above and add-below buttons are hidden when is_selecting is true', () => {
    const wrapper = mount({ is_selecting: ref(true) })
    expect(wrapper.find('[data-testid="card-list-item__add-above"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="card-list-item__add-below"]').exists()).toBe(false)
  })

  // ── Rendering ─────────────────────────────────────────────────────────────

  test('renders the card-list-item root with the correct data-id', () => {
    const wrapper = mount({ card: { id: 42 } })
    expect(wrapper.find('[data-testid="card-list-item"]').attributes('data-id')).toBe('42')
  })

  test('renders the index number in the reorder pill', () => {
    const wrapper = mount({ index: 3 })
    expect(wrapper.find('[data-testid="card-list-item__reorder"]').text()).toContain('4')
  })

  // ── ItemOptions wiring ────────────────────────────────────────────────────

  test('forwards the options move event to onMoveCards with the card id', () => {
    const wrapper = mount({ card: { id: 9 } })
    wrapper.findComponent(ItemOptions).vm.$emit('move')
    expect(mocks.onMoveCardsMock).toHaveBeenCalledWith(9)
  })

  test('forwards the options delete event to onDeleteCards with the card id', () => {
    const wrapper = mount({ card: { id: 9 } })
    wrapper.findComponent(ItemOptions).vm.$emit('delete')
    expect(mocks.onDeleteCardsMock).toHaveBeenCalledWith(9)
  })

  test('hides ItemOptions in selection mode and shows the radio instead', () => {
    const wrapper = mount({ is_selecting: ref(true) })
    expect(wrapper.findComponent(ItemOptions).exists()).toBe(false)
  })

  // ── onClick — selection mode vs normal mode ───────────────────────────────

  test('mousedown in selection mode calls onSelectCard with the card id', async () => {
    const wrapper = mount({ card: { id: 5 }, is_selecting: ref(true) })
    await wrapper.find('[data-testid="card-list-item"]').trigger('mousedown')
    expect(mocks.onSelectCardMock).toHaveBeenCalledWith(5)
  })

  test('radio reflects isCardSelected result for the card', () => {
    mocks.isCardSelectedMock.mockReturnValue(true)
    const wrapper = mount({ card: { id: 3 }, is_selecting: ref(true) })
    const radio = wrapper.findComponent({ name: 'UiRadio' })
    expect(radio.props('checked')).toBe(true)
  })
})
