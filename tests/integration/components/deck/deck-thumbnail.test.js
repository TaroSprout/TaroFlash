import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'

const { coarseRef, mockEmitSfx } = vi.hoisted(() => ({
  coarseRef: { value: true },
  mockEmitSfx: vi.fn()
}))

vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: () => coarseRef
}))

vi.mock('@/sfx/bus', () => ({
  emitSfx: mockEmitSfx,
  emitHoverSfx: vi.fn()
}))

// Stub GSAP — pulled in transitively via Card
vi.mock('gsap', () => ({ gsap: { fromTo: vi.fn(), to: vi.fn() } }))

import Deck from '@/components/deck/deck-thumbnail.vue'

function makeDeck(deck = {}, extraProps = {}) {
  return shallowMount(Deck, {
    props: { deck: { title: 'Test Deck', ...deck }, ...extraProps }
  })
}

describe('Deck', () => {
  // ── Root element ──────────────────────────────────────────────────────────────

  test('renders the deck element', () => {
    const wrapper = makeDeck()
    expect(wrapper.find('[data-testid="deck-thumbnail"]').exists()).toBe(true)
  })

  // ── Card component with cover side ────────────────────────────────────────────

  test('renders a Card component with side=cover', () => {
    const wrapper = makeDeck()
    const card = wrapper.findComponent({ name: 'Card' })
    expect(card.exists()).toBe(true)
    expect(card.props('side')).toBe('cover')
  })

  test('passes deck.cover_config to the Card component', () => {
    const cover_config = { bg_color: 'blue-500', pattern: 'stars' }
    const wrapper = makeDeck({ cover_config })
    expect(wrapper.findComponent({ name: 'Card' }).props('cover_config')).toEqual(cover_config)
  })

  test('passes undefined cover_config when deck has none', () => {
    const wrapper = makeDeck({})
    expect(wrapper.findComponent({ name: 'Card' }).props('cover_config')).toBeUndefined()
  })

  // ── Size prop ─────────────────────────────────────────────────────────────────

  test('defaults to base size', () => {
    const wrapper = makeDeck()
    expect(wrapper.findComponent({ name: 'Card' }).props('size')).toBe('base')
  })

  test('forwards size prop to Card', () => {
    const wrapper = makeDeck({}, { size: 'xl' })
    expect(wrapper.findComponent({ name: 'Card' }).props('size')).toBe('xl')
  })

  // ── Title ─────────────────────────────────────────────────────────────────────

  test('shows deck title by default', () => {
    const wrapper = makeDeck({ title: 'My Deck' })
    expect(wrapper.text()).toContain('My Deck')
  })

  test('hides title when hide_title is true', () => {
    const wrapper = makeDeck({ title: 'My Deck' }, { hide_title: true })
    expect(wrapper.text()).not.toContain('My Deck')
  })

  // ── Optional deck prop ────────────────────────────────────────────────────────

  test('renders without crashing when deck prop is not provided', () => {
    const wrapper = shallowMount(Deck, { props: {} })
    expect(wrapper.find('[data-testid="deck-thumbnail"]').exists()).toBe(true)
  })

  test('passes undefined cover_config to Card when deck is not provided', () => {
    const wrapper = shallowMount(Deck, { props: {} })
    expect(wrapper.findComponent({ name: 'Card' }).props('cover_config')).toBeUndefined()
  })

  test('shows empty title when deck is not provided', () => {
    const wrapper = shallowMount(Deck, { props: {} })
    expect(wrapper.text()).toBe('')
  })

  // ── actions slot ──────────────────────────────────────────────────────────────

  test('renders the actions slot above the title', () => {
    const wrapper = shallowMount(Deck, {
      props: { deck: { title: 'My Deck' } },
      slots: { actions: '<button data-testid="thumbnail-action">act</button>' }
    })
    expect(wrapper.find('[data-testid="thumbnail-action"]').exists()).toBe(true)
  })

  test('emits click when the root wrapper is clicked', async () => {
    const wrapper = makeDeck()
    await wrapper.find('[data-testid="deck-thumbnail"]').trigger('click')
    expect(wrapper.emitted('click')).toBeTruthy()
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  // ── play-on-tap ────────────────────────────────────────────────────────────

  describe('play-on-tap', () => {
    beforeEach(() => {
      coarseRef.value = true
      mockEmitSfx.mockClear()
    })

    test('invokes the parent click handler after the hold completes on coarse pointers', async () => {
      vi.useFakeTimers()
      const onClick = vi.fn()
      const wrapper = shallowMount(Deck, {
        props: { deck: { title: 'X' } },
        attrs: { onClick }
      })

      const click = wrapper.find('[data-testid="deck-thumbnail"]').trigger('click')

      // Hold matches usePlayOnTap default — non-animate path uses setTimeout.
      vi.advanceTimersByTime(500)
      await click
      vi.useRealTimers()

      expect(onClick).toHaveBeenCalledTimes(1)
    })

    test('data-playing flips on while the hold is in flight', async () => {
      vi.useFakeTimers()
      const wrapper = shallowMount(Deck, {
        props: { deck: { title: 'X' } },
        attrs: { onClick: vi.fn() }
      })

      wrapper.find('[data-testid="deck-thumbnail"]').trigger('click')
      await Promise.resolve() // let intercept run up to the await

      expect(wrapper.find('[data-testid="deck-thumbnail"]').attributes('data-playing')).toBe('true')
      vi.advanceTimersByTime(500)
      vi.useRealTimers()
    })

    test('emits click_sfx via beforePlay when provided', async () => {
      vi.useFakeTimers()
      const wrapper = shallowMount(Deck, {
        props: { deck: { title: 'X' }, click_sfx: 'ui.select' },
        attrs: { onClick: vi.fn() }
      })

      wrapper.find('[data-testid="deck-thumbnail"]').trigger('click')
      await Promise.resolve()

      expect(mockEmitSfx).toHaveBeenCalledWith('ui.select')
      vi.advanceTimersByTime(500)
      vi.useRealTimers()
    })

    test('does not emit click_sfx when prop is absent', async () => {
      vi.useFakeTimers()
      const wrapper = shallowMount(Deck, {
        props: { deck: { title: 'X' } },
        attrs: { onClick: vi.fn() }
      })

      wrapper.find('[data-testid="deck-thumbnail"]').trigger('click')
      await Promise.resolve()

      expect(mockEmitSfx).not.toHaveBeenCalled()
      vi.advanceTimersByTime(500)
      vi.useRealTimers()
    })

    test('does not intercept on pointer:fine — click goes through immediately', async () => {
      coarseRef.value = false
      const onClick = vi.fn()
      const wrapper = shallowMount(Deck, {
        props: { deck: { title: 'X' } },
        attrs: { onClick }
      })

      await wrapper.find('[data-testid="deck-thumbnail"]').trigger('click')

      expect(onClick).toHaveBeenCalledTimes(1)
      expect(mockEmitSfx).not.toHaveBeenCalled()
    })
  })
})
