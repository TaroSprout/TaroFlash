import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { card } from '@tests/fixtures/card'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mockDecksData, emitSfxMock } = vi.hoisted(() => ({
  mockDecksData: {
    data: [
      { id: 10, title: 'Deck A' },
      { id: 20, title: 'Deck B' },
      { id: 30, title: 'Current Deck' }
    ]
  },
  emitSfxMock: vi.fn()
}))

vi.mock('@/api/decks', () => ({
  useMemberDecksQuery: () => mockDecksData
}))

vi.mock('@/sfx/bus', () => ({
  emitSfx: emitSfxMock,
  emitHoverSfx: vi.fn()
}))

// ── Component stubs (render functions only — no runtime compiler) ──────────────

const CardStub = defineComponent({
  name: 'CardIndex',
  props: ['size'],
  setup() {
    return () => h('div', { 'data-testid': 'card-stub' })
  }
})

const UiListItemStub = defineComponent({
  name: 'UiListItem',
  props: ['disabled', 'appearance'],
  setup(props, { slots }) {
    return () =>
      h(
        'div',
        {
          'data-testid': 'list-item',
          'data-disabled': props.disabled ? 'true' : 'false'
        },
        slots.default?.()
      )
  }
})

const UiRadioStub = defineComponent({
  name: 'UiRadio',
  props: ['checked'],
  setup(props) {
    return () => h('div', { 'data-testid': 'radio', 'data-checked': String(props.checked) })
  }
})

const UiButtonStub = defineComponent({
  name: 'UiButton',
  props: ['disabled', 'iconLeft'],
  emits: ['press'],
  setup(props, { slots, emit }) {
    return () =>
      h(
        'button',
        {
          'data-testid': 'button',
          disabled: props.disabled,
          onClick: () => emit('press')
        },
        slots.default?.()
      )
  }
})

import MoveCardsModal from '@/components/modals/move-cards.vue'

function makeCard(overrides = {}) {
  return card.one({ overrides })
}

function mountModal({ cards = [], current_deck_id = 30, count, close = vi.fn() } = {}) {
  const wrapper = shallowMount(MoveCardsModal, {
    props: { cards, current_deck_id, count, close },
    global: {
      stubs: {
        Card: CardStub,
        UiListItem: UiListItemStub,
        UiRadio: UiRadioStub,
        UiButton: UiButtonStub
      }
    }
  })
  return { wrapper, close }
}

describe('MoveCardsModal', () => {
  beforeEach(() => {
    emitSfxMock.mockReset()
  })

  // ── Layout ──────────────────────────────────────────────────────────────────

  test('renders the header, deck list, and action buttons', () => {
    const cards = [makeCard({ front_text: 'Q', back_text: 'A' })]
    const { wrapper } = mountModal({ cards })
    expect(wrapper.find('[data-testid="move-cards__header"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="move-cards__deck-list"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="move-cards__actions"]').exists()).toBe(true)
  })

  test('renders one list item per deck from useMemberDecksQuery', () => {
    const cards = [makeCard()]
    const { wrapper } = mountModal({ cards })
    const items = wrapper.findAll('[data-testid="list-item"]')
    // 3 decks seeded in the mock
    expect(items).toHaveLength(3)
  })

  test('disables list item for the current deck', () => {
    const cards = [makeCard()]
    const { wrapper } = mountModal({ cards, current_deck_id: 10 })
    const items = wrapper.findAll('[data-testid="list-item"]')
    // deck 10 is current — item at index 0 is disabled
    expect(items[0].attributes('data-disabled')).toBe('true')
    expect(items[1].attributes('data-disabled')).toBe('false')
  })

  // ── Title / count obligation ─────────────────────────────────────────────────

  // [obligation] move-cards modal — count prop overrides cards.length for title display
  test('count prop overrides cards.length for title computation', async () => {
    const preview_cards = [
      makeCard({ front_text: 'Q1', back_text: 'A1' }),
      makeCard({ front_text: 'Q2', back_text: 'A2' }),
      makeCard({ front_text: 'Q3', back_text: 'A3' })
    ]
    // count=200 but only 3 preview cards: title should say "200" not "3"
    const { wrapper } = mountModal({ cards: preview_cards, count: 200 })
    const title = wrapper.find('.move-cards__title')
    // The i18n key uses { count: 200 } → "Move 200 Cards" (plural)
    // We can't parse i18n exactly in integration, but we assert the count
    // drives the rendered text (200, not 3)
    const titleText = title.text()
    expect(titleText).toContain('200')
    expect(titleText).not.toMatch(/\b3\b/)
  })

  test('without count prop, title reflects cards.length when cards have content', async () => {
    const two_cards = [
      makeCard({ front_text: 'Q1', back_text: 'A1' }),
      makeCard({ front_text: 'Q2', back_text: 'A2' })
    ]
    const { wrapper } = mountModal({ cards: two_cards })
    const titleText = wrapper.find('.move-cards__title').text()
    expect(titleText).toContain('2')
  })

  // ── Selection and move ───────────────────────────────────────────────────────

  test('move button is disabled when no deck is selected', () => {
    const { wrapper } = mountModal({ cards: [makeCard()] })
    expect(wrapper.find('[data-testid="move-cards__move"]').attributes('disabled')).toBeDefined()
  })

  test('clicking a deck list item selects that deck', async () => {
    const cards = [makeCard()]
    const { wrapper } = mountModal({ cards })
    const items = wrapper.findAll('[data-testid="list-item"]')
    // Click deck B (index 1, id=20)
    await items[1].trigger('click')
    // Move button should become enabled
    expect(wrapper.find('[data-testid="move-cards__move"]').attributes('disabled')).toBeUndefined()
  })

  test('clicking the same deck again deselects it', async () => {
    const cards = [makeCard()]
    const { wrapper } = mountModal({ cards })
    const items = wrapper.findAll('[data-testid="list-item"]')
    await items[1].trigger('click')
    await items[1].trigger('click')
    expect(wrapper.find('[data-testid="move-cards__move"]').attributes('disabled')).toBeDefined()
  })

  test('emits sfx on deck click', async () => {
    const { wrapper } = mountModal({ cards: [makeCard()] })
    await wrapper.findAll('[data-testid="list-item"]')[0].trigger('click')
    expect(emitSfxMock).toHaveBeenCalledWith('etc_camera_shutter')
  })

  test('move button click calls close with the selected deck_id', async () => {
    const cards = [makeCard()]
    const { wrapper, close } = mountModal({ cards })
    await wrapper.findAll('[data-testid="list-item"]')[1].trigger('click')
    await wrapper.find('[data-testid="move-cards__move"]').trigger('click')
    expect(close).toHaveBeenCalledWith({ deck_id: 20 })
  })

  test('move button click is a no-op when no deck is selected', async () => {
    const { wrapper, close } = mountModal({ cards: [makeCard()] })
    await wrapper.find('[data-testid="move-cards__move"]').trigger('click')
    await flushPromises()
    expect(close).not.toHaveBeenCalled()
  })

  // ── Cancel ──────────────────────────────────────────────────────────────────

  test('cancel button calls close with false', async () => {
    const { wrapper, close } = mountModal({ cards: [makeCard()] })
    await wrapper.find('[data-testid="move-cards__cancel"]').trigger('click')
    expect(close).toHaveBeenCalledWith(false)
  })
})
