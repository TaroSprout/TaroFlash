import { describe, test, expect, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, useAttrs } from 'vue'
import { TYPE_SFX } from '@/sfx/config'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { coarseRef } = vi.hoisted(() => ({
  coarseRef: { value: true }
}))

vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: () => coarseRef
}))

vi.mock('@/sfx/bus', () => ({
  emitSfx: vi.fn(),
  emitHoverSfx: vi.fn()
}))

// GSAP pulled in transitively via Card
vi.mock('gsap', () => ({ gsap: { fromTo: vi.fn(), to: vi.fn() } }))

// ── Stubs ──────────────────────────────────────────────────────────────────────

// UiTappable stub — renders slot content and forwards attrs so `data-testid`
// lands on the DOM and child components (Card) are visible to findComponent.
const UiTappableStub = defineComponent({
  name: 'UiTappable',
  inheritAttrs: false,
  props: ['sfx', 'as', 'animate', 'triggerAt'],
  emits: ['tap'],
  setup(props, { slots, emit }) {
    const attrs = useAttrs()
    return () =>
      h(
        'div',
        {
          ...attrs,
          onClick: (e) => emit('tap', e)
        },
        slots.default?.()
      )
  }
})

// ── Imports ───────────────────────────────────────────────────────────────────

import DeckThumbnail from '@/components/deck/deck-thumbnail.vue'

// ── Helpers ───────────────────────────────────────────────────────────────────

function mount(props = {}) {
  return shallowMount(DeckThumbnail, {
    props,
    global: { stubs: { UiTappable: UiTappableStub } }
  })
}

function mountWithDeck(deckOverrides = {}, extraProps = {}) {
  return mount({ deck: { title: 'Test Deck', ...deckOverrides }, ...extraProps })
}

// ── Root element ───────────────────────────────────────────────────────────────

describe('DeckThumbnail', () => {
  test('renders the root element with testid', () => {
    const wrapper = mountWithDeck()
    expect(wrapper.find('[data-testid="deck-thumbnail"]').exists()).toBe(true)
  })

  // ── Card component ───────────────────────────────────────────────────────────

  test('renders a Card component with side=cover', () => {
    const wrapper = mountWithDeck()
    const card = wrapper.findComponent({ name: 'Card' })
    expect(card.exists()).toBe(true)
    expect(card.props('side')).toBe('cover')
  })

  test('passes deck.cover_config to the Card component', () => {
    const cover_config = { bg_color: 'blue-500', pattern: 'stars' }
    const wrapper = mountWithDeck({ cover_config })
    expect(wrapper.findComponent({ name: 'Card' }).props('cover_config')).toEqual(cover_config)
  })

  test('passes undefined cover_config when deck has none', () => {
    const wrapper = mountWithDeck({})
    expect(wrapper.findComponent({ name: 'Card' }).props('cover_config')).toBeUndefined()
  })

  // ── Size prop ─────────────────────────────────────────────────────────────────

  test('defaults to base size', () => {
    const wrapper = mountWithDeck()
    expect(wrapper.findComponent({ name: 'Card' }).props('size')).toBe('base')
  })

  test('forwards size prop to Card', () => {
    const wrapper = mount({ deck: { title: 'X' }, size: 'xl' })
    expect(wrapper.findComponent({ name: 'Card' }).props('size')).toBe('xl')
  })

  // ── Title ────────────────────────────────────────────────────────────────────

  test('shows deck title by default', () => {
    const wrapper = mountWithDeck({ title: 'My Deck' })
    expect(wrapper.text()).toContain('My Deck')
  })

  test('hides title when hide_title is true', () => {
    const wrapper = mount({ deck: { title: 'My Deck' }, hide_title: true })
    expect(wrapper.text()).not.toContain('My Deck')
  })

  // ── Optional deck prop ────────────────────────────────────────────────────────

  test('renders without crashing when deck prop is not provided', () => {
    const wrapper = mount({})
    expect(wrapper.find('[data-testid="deck-thumbnail"]').exists()).toBe(true)
  })

  test('passes undefined cover_config to Card when deck is not provided', () => {
    const wrapper = mount({})
    expect(wrapper.findComponent({ name: 'Card' }).props('cover_config')).toBeUndefined()
  })

  test('shows empty title when deck is not provided', () => {
    const wrapper = mount({})
    expect(wrapper.text()).toBe('')
  })

  // ── actions slot ──────────────────────────────────────────────────────────────

  test('renders the actions slot above the title', () => {
    const wrapper = shallowMount(DeckThumbnail, {
      props: { deck: { title: 'My Deck' } },
      slots: { actions: '<button data-testid="thumbnail-action">act</button>' },
      global: { stubs: { UiTappable: UiTappableStub } }
    })
    expect(wrapper.find('[data-testid="thumbnail-action"]').exists()).toBe(true)
  })

  // ── corner-action slot [obligation] ──────────────────────────────────────────

  describe('corner-action slot [obligation]', () => {
    test('does not render the corner-action wrapper when the slot is not provided', () => {
      const wrapper = mountWithDeck()
      expect(wrapper.find('[data-testid="deck-thumbnail__corner-action"]').exists()).toBe(false)
    })

    test('renders the corner-action wrapper and slot content when the slot is provided', () => {
      const wrapper = shallowMount(DeckThumbnail, {
        props: { deck: { title: 'My Deck' } },
        slots: { 'corner-action': '<button data-testid="corner-button">act</button>' },
        global: { stubs: { UiTappable: UiTappableStub } }
      })
      expect(wrapper.find('[data-testid="deck-thumbnail__corner-action"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="corner-button"]').exists()).toBe(true)
    })
  })

  // ── card-count label [obligation] ────────────────────────────────────────────

  describe('card-count label [obligation]', () => {
    test('does not render the card-count label when deck.card_count is undefined', () => {
      const wrapper = mountWithDeck()
      expect(wrapper.find('[data-testid="deck-thumbnail__card-count"]').exists()).toBe(false)
    })

    test('renders the card-count label when deck.card_count is defined', () => {
      const wrapper = mountWithDeck({ card_count: 5 })
      const label = wrapper.find('[data-testid="deck-thumbnail__card-count"]')
      expect(label.exists()).toBe(true)
      expect(label.text()).toContain('5')
    })

    test('renders the card-count label even when card_count is 0', () => {
      const wrapper = mountWithDeck({ card_count: 0 })
      expect(wrapper.find('[data-testid="deck-thumbnail__card-count"]').exists()).toBe(true)
    })
  })

  // ── press event ───────────────────────────────────────────────────────────────

  test('emits press when the tappable is tapped', async () => {
    const wrapper = mountWithDeck()
    await wrapper.find('[data-testid="deck-thumbnail"]').trigger('click')
    expect(wrapper.emitted('press')).toBeTruthy()
    expect(wrapper.emitted('press')).toHaveLength(1)
  })

  // ── sfx prop spread (obligation 7) ───────────────────────────────────────────

  describe('sfx prop — default + override [obligation]', () => {
    test('passes { hover: TYPE_SFX } to UiTappable when sfx prop is omitted', () => {
      const wrapper = mountWithDeck()
      const sfx = wrapper.findComponent(UiTappableStub).props('sfx')
      expect(sfx).toEqual({ hover: TYPE_SFX })
    })

    test('merges caller sfx over the default so both hover and custom key are present', () => {
      const wrapper = mount({ deck: { title: 'X' }, sfx: { press: 'card_drop' } })
      const sfx = wrapper.findComponent(UiTappableStub).props('sfx')
      expect(sfx.hover).toEqual(TYPE_SFX)
      expect(sfx.press).toBe('card_drop')
    })

    test('caller-supplied hover overrides the TYPE_SFX default', () => {
      const custom_hover = ['click_04']
      const wrapper = mount({ deck: { title: 'X' }, sfx: { hover: custom_hover } })
      const sfx = wrapper.findComponent(UiTappableStub).props('sfx')
      expect(sfx.hover).toEqual(custom_hover)
    })
  })
})
