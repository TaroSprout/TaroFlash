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
  props: ['sfx', 'as', 'animate', 'triggerAt', 'active'],
  emits: ['tap'],
  setup(props, { slots, emit }) {
    const attrs = useAttrs()
    return () =>
      h(
        'div',
        {
          ...attrs,
          'data-tap-active': props.active || null,
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

  // ── rearranging/dragging/corner_action_always_visible [obligation] ───────────

  describe('rearranging/dragging/corner_action_always_visible [obligation]', () => {
    test('rearranging adds pointer-events-none select-none to the Card and cursor-grab to the root', () => {
      const wrapper = mountWithDeck({}, { rearranging: true })
      const card = wrapper.findComponent({ name: 'Card' })
      expect(card.classes()).toContain('pointer-events-none')
      expect(card.classes()).toContain('select-none')
      expect(wrapper.find('[data-testid="deck-thumbnail"]').classes()).toContain('cursor-grab')
    })

    test('not rearranging keeps the default hover-scale classes and drops cursor-grab', () => {
      const wrapper = mountWithDeck({}, { rearranging: false })
      const root = wrapper.find('[data-testid="deck-thumbnail"]')
      expect(root.classes()).not.toContain('cursor-grab')
      expect(root.classes()).toContain('cursor-pointer')
    })

    test('dragging adds drop-shadow-sm to the root', () => {
      const wrapper = mountWithDeck({}, { dragging: true })
      expect(wrapper.find('[data-testid="deck-thumbnail"]').classes()).toContain('drop-shadow-sm')
    })

    test('not dragging omits drop-shadow-sm', () => {
      const wrapper = mountWithDeck({}, { dragging: false })
      expect(wrapper.find('[data-testid="deck-thumbnail"]').classes()).not.toContain(
        'drop-shadow-sm'
      )
    })

    test('corner_action_always_visible keeps the corner-action slot visible without hover', () => {
      const wrapper = shallowMount(DeckThumbnail, {
        props: { deck: { title: 'X' }, corner_action_always_visible: true },
        slots: { 'corner-action': '<button data-testid="corner-button">act</button>' },
        global: { stubs: { UiTappable: UiTappableStub } }
      })
      const corner = wrapper.find('[data-testid="deck-thumbnail__corner-action"]')
      expect(corner.classes()).toContain('opacity-100')
      expect(corner.classes()).toContain('pointer-events-auto')
    })

    test('defaults to hover-only visibility for the corner-action slot', () => {
      const wrapper = shallowMount(DeckThumbnail, {
        props: { deck: { title: 'X' } },
        slots: { 'corner-action': '<button data-testid="corner-button">act</button>' },
        global: { stubs: { UiTappable: UiTappableStub } }
      })
      const corner = wrapper.find('[data-testid="deck-thumbnail__corner-action"]')
      expect(corner.classes()).toContain('opacity-0')
      expect(corner.classes()).not.toContain('opacity-100')
    })
  })

  // ── active prop [obligation] ──────────────────────────────────────────────
  // Forwards to UiTappable's `active`, so the root carries data-tap-active —
  // never assert classes for this. The corner-action also stays visible while
  // active (it normally hover-fades).

  describe('active prop [obligation]', () => {
    test('active=true forwards to UiTappable and sets data-tap-active on the root', () => {
      const wrapper = mountWithDeck({}, { active: true })
      expect(wrapper.find('[data-testid="deck-thumbnail"]').attributes('data-tap-active')).toBe(
        'true'
      )
    })

    test('active=false (default) leaves data-tap-active unset', () => {
      const wrapper = mountWithDeck()
      expect(
        wrapper.find('[data-testid="deck-thumbnail"]').attributes('data-tap-active')
      ).toBeUndefined()
    })

    test('active=true keeps the corner-action visible without hover', () => {
      const wrapper = shallowMount(DeckThumbnail, {
        props: { deck: { title: 'X' }, active: true },
        slots: { 'corner-action': '<button data-testid="corner-button">act</button>' },
        global: { stubs: { UiTappable: UiTappableStub } }
      })
      const corner = wrapper.find('[data-testid="deck-thumbnail__corner-action"]')
      expect(corner.classes()).toContain('opacity-100')
      expect(corner.classes()).toContain('pointer-events-auto')
    })
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
