import { describe, test, expect, vi } from 'vite-plus/test'
import { shallowMount, mount as fullMount } from '@vue/test-utils'
import { defineComponent, h, useAttrs } from 'vue'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

vi.mock('@/sfx/bus', () => ({
  emitSfx: vi.fn(),
  emitHoverSfx: vi.fn()
}))

// GSAP pulled in transitively via Card
vi.mock('gsap', () => ({ gsap: { fromTo: vi.fn(), to: vi.fn() } }))

// ── Stubs ──────────────────────────────────────────────────────────────────────

const UiTappableStub = defineComponent({
  name: 'UiTappable',
  inheritAttrs: false,
  props: ['sfx', 'as'],
  emits: ['tap'],
  setup(_props, { slots, emit }) {
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

import NewDeckCard from '@/components/deck/new-deck-card.vue'

// ── Helpers ───────────────────────────────────────────────────────────────────

function mount(props = {}) {
  return shallowMount(NewDeckCard, {
    props,
    global: { stubs: { UiTappable: UiTappableStub } }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('NewDeckCard', () => {
  test('renders the root element with testid', () => {
    const wrapper = mount()
    expect(wrapper.find('[data-testid="new-deck-card"]').exists()).toBe(true)
  })

  test('renders a Card component with side=front', () => {
    const wrapper = mount()
    const card = wrapper.findComponent({ name: 'Card' })
    expect(card.exists()).toBe(true)
    expect(card.props('side')).toBe('front')
  })

  test('renders the outline with the new-deck-card label text', () => {
    // Card renders its #front slot only when fully mounted — Card is stubbed
    // (and its slot content discarded) under shallowMount.
    const wrapper = fullMount(NewDeckCard, {
      global: { stubs: { UiTappable: UiTappableStub }, directives: { sfx: {} } }
    })
    const outline = wrapper.find('[data-testid="new-deck-card__outline"]')
    expect(outline.exists()).toBe(true)
    expect(outline.text()).toContain('New Deck')
  })

  test('emits press when the tappable is tapped', async () => {
    const wrapper = mount()
    await wrapper.find('[data-testid="new-deck-card"]').trigger('click')
    expect(wrapper.emitted('press')).toBeTruthy()
    expect(wrapper.emitted('press')).toHaveLength(1)
  })

  describe('disabled prop [obligation]', () => {
    test('does not emit press when tapped while disabled', async () => {
      const wrapper = mount({ disabled: true })
      await wrapper.find('[data-testid="new-deck-card"]').trigger('click')
      expect(wrapper.emitted('press')).toBeFalsy()
    })

    test('still emits press when tapped and not disabled', async () => {
      const wrapper = mount({ disabled: false })
      await wrapper.find('[data-testid="new-deck-card"]').trigger('click')
      expect(wrapper.emitted('press')).toHaveLength(1)
    })
  })

  describe('loading prop [obligation]', () => {
    test('does not apply the disabled visual classes by default', () => {
      const wrapper = mount()
      const root = wrapper.find('[data-testid="new-deck-card"]')
      expect(root.classes()).not.toContain('opacity-50')
      expect(root.classes()).not.toContain('pointer-events-none')
    })

    test('applies opacity and pointer-events-none classes while loading', () => {
      const wrapper = mount({ loading: true })
      const root = wrapper.find('[data-testid="new-deck-card"]')
      expect(root.classes()).toContain('opacity-50')
      expect(root.classes()).toContain('pointer-events-none')
    })
  })

  describe('disabled prop [obligation]', () => {
    test('does not emit press when tapped while disabled [obligation]', async () => {
      const wrapper = mount({ disabled: true })
      await wrapper.find('[data-testid="new-deck-card"]').trigger('click')
      expect(wrapper.emitted('press')).toBeFalsy()
    })

    test('still emits press when tapped and not disabled', async () => {
      const wrapper = mount({ disabled: false })
      await wrapper.find('[data-testid="new-deck-card"]').trigger('click')
      expect(wrapper.emitted('press')).toBeTruthy()
    })
  })
})
