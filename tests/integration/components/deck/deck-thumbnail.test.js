import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
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
