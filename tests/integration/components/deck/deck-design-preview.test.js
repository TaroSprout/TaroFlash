import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

vi.mock('@/sfx/bus', () => ({ emitSfx: vi.fn() }))

import DeckPreview from '@/components/deck/deck-design-preview.vue'

const CardStub = defineComponent({
  name: 'Card',
  props: ['side', 'front_text', 'back_text', 'cover_config', 'card_attributes', 'face_classes'],
  emits: ['click'],
  setup(props, { emit }) {
    return () =>
      h('div', {
        'data-testid': 'card-stub',
        'data-side': props.side ?? '',
        'data-front': props.front_text ?? '',
        'data-back': props.back_text ?? '',
        onClick: () => emit('click')
      })
  }
})

const baseProps = {
  cover: { theme: 'blue-500' },
  card_attributes: { front: {}, back: {} },
  side: 'cover'
}

function mountPreview(props = {}) {
  return shallowMount(DeckPreview, {
    props: { ...baseProps, ...props },
    global: { stubs: { Card: CardStub } }
  })
}

describe('DeckPreview (presentational)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Structure ────────────────────────────────────────────────────────────────

  test('renders the preview container with a single card stub', () => {
    const wrapper = mountPreview()
    expect(wrapper.find('[data-testid="deck-design-preview"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid="card-stub"]')).toHaveLength(1)
  })

  test('passes the active side to the card', () => {
    const wrapper = mountPreview({ side: 'front' })
    expect(wrapper.find('[data-testid="card-stub"]').attributes('data-side')).toBe('front')
  })

  // ── preview_text — front side [obligation] ──────────────────────────────────

  test('uses front_text prop when side is front [obligation]', () => {
    const wrapper = mountPreview({ side: 'front', front_text: 'hello front' })
    expect(wrapper.find('[data-testid="card-stub"]').attributes('data-front')).toBe('hello front')
  })

  test('falls back to locale placeholder when front_text is absent and side is front [obligation]', () => {
    const wrapper = mountPreview({ side: 'front' })
    // The real locale resolves to "Front" (deck.settings-modal.preview.front-fallback)
    const frontAttr = wrapper.find('[data-testid="card-stub"]').attributes('data-front')
    expect(frontAttr).not.toBe('')
    // Not empty — the component shows a non-blank fallback string
    expect(frontAttr?.length).toBeGreaterThan(0)
  })

  // ── preview_text — back side [obligation] ───────────────────────────────────

  test('uses back_text prop when side is back [obligation]', () => {
    const wrapper = mountPreview({ side: 'back', back_text: 'hello back' })
    expect(wrapper.find('[data-testid="card-stub"]').attributes('data-back')).toBe('hello back')
  })

  test('falls back to locale placeholder when back_text is absent and side is back [obligation]', () => {
    const wrapper = mountPreview({ side: 'back' })
    // The real locale resolves to "Back" (deck.settings-modal.preview.back-fallback)
    const backAttr = wrapper.find('[data-testid="card-stub"]').attributes('data-back')
    expect(backAttr).not.toBe('')
    expect(backAttr?.length).toBeGreaterThan(0)
  })

  // ── cover side — no text ─────────────────────────────────────────────────────

  test('does not pass front/back text on the cover side', () => {
    const wrapper = mountPreview({
      side: 'cover',
      front_text: 'hello front',
      back_text: 'hello back'
    })
    const card = wrapper.find('[data-testid="card-stub"]')
    expect(card.attributes('data-front')).toBe('')
    expect(card.attributes('data-back')).toBe('')
  })

  // ── cycleSide via @update:side [obligation] ──────────────────────────────────

  test('clicking the card emits update:side cycling cover → front [obligation]', async () => {
    const wrapper = mountPreview({ side: 'cover' })
    await wrapper.find('[data-testid="card-stub"]').trigger('click')
    expect(wrapper.emitted('update:side')).toEqual([['front']])
  })

  test('clicking cycles front → back [obligation]', async () => {
    const wrapper = mountPreview({ side: 'front' })
    await wrapper.find('[data-testid="card-stub"]').trigger('click')
    expect(wrapper.emitted('update:side')).toEqual([['back']])
  })

  test('clicking cycles back → cover (wraps around) [obligation]', async () => {
    const wrapper = mountPreview({ side: 'back' })
    await wrapper.find('[data-testid="card-stub"]').trigger('click')
    expect(wrapper.emitted('update:side')).toEqual([['cover']])
  })
})
