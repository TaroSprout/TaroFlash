import { describe, test, expect, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import SummaryCard from '@/views/study-session/session-summary/category-page/summary-card.vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockEmitSfx, mockAppearanceFor } = vi.hoisted(() => ({
  mockEmitSfx: vi.fn(),
  mockAppearanceFor: vi.fn(() => ({ card_attributes: { some: 'attrs' } }))
}))

vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))

vi.mock('@/views/study-session/deck-resolution', () => ({
  useDeckResolution: () => ({ appearanceFor: mockAppearanceFor })
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeCard(overrides = {}) {
  return {
    id: 1,
    deck_id: 7,
    front_text: 'Front',
    back_text: 'Back',
    front_image_path: null,
    back_image_path: null,
    state: 'passed',
    ...overrides
  }
}

function mountCard(props = {}) {
  return shallowMount(SummaryCard, { props: { card: makeCard(), ...props } })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SummaryCard', () => {
  test('renders the card content wrapped in a flip button', () => {
    const wrapper = mountCard()
    expect(wrapper.find('[data-testid="session-summary__card"]').exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'Card' }).exists()).toBe(true)
  })

  test('starts showing the front side', () => {
    const wrapper = mountCard()
    expect(wrapper.findComponent({ name: 'Card' }).props('side')).toBe('front')
  })

  test('clicking flips to the back side and plays a transition sfx', async () => {
    const wrapper = mountCard()
    await wrapper.find('[data-testid="session-summary__card"]').trigger('click')

    expect(wrapper.findComponent({ name: 'Card' }).props('side')).toBe('back')
    expect(mockEmitSfx).toHaveBeenCalledWith('transition_up')
  })

  test('clicking twice flips back to the front and plays the opposite sfx', async () => {
    const wrapper = mountCard()
    const button = wrapper.find('[data-testid="session-summary__card"]')

    await button.trigger('click')
    await button.trigger('click')

    expect(wrapper.findComponent({ name: 'Card' }).props('side')).toBe('front')
    expect(mockEmitSfx).toHaveBeenLastCalledWith('transition_down')
  })

  test('resolves card_attributes via appearanceFor(card.deck_id)', () => {
    const wrapper = mountCard({ card: makeCard({ deck_id: 42 }) })

    expect(mockAppearanceFor).toHaveBeenCalledWith(42)
    expect(wrapper.findComponent({ name: 'Card' }).props('card_attributes')).toEqual({
      some: 'attrs'
    })
  })

  test('forwards front/back text and image paths to the card', () => {
    const card = makeCard({
      front_text: 'Q text',
      back_text: 'A text',
      front_image_path: 'front.png',
      back_image_path: 'back.png'
    })
    const wrapper = mountCard({ card })
    const rendered = wrapper.findComponent({ name: 'Card' })

    expect(rendered.props('front_text')).toBe('Q text')
    expect(rendered.props('back_text')).toBe('A text')
    expect(rendered.props('front_image_path')).toBe('front.png')
    expect(rendered.props('back_image_path')).toBe('back.png')
  })
})
