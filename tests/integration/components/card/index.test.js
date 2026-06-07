import { describe, test, expect, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import Card from '@/components/card/index.vue'

// Stub GSAP so transition hooks don't error in jsdom
vi.mock('gsap', () => ({ gsap: { fromTo: vi.fn(), to: vi.fn() } }))

// CardFace stub that renders its #image and #editor named slots so slot-
// forwarding tests can observe what the Card passes through.
const CardFaceStub = defineComponent({
  name: 'CardFace',
  props: ['image', 'text', 'mode', 'attributes'],
  setup(props, { slots }) {
    return () =>
      h('div', { 'data-testid': 'card-face-stub', 'data-image': props.image }, [
        h('div', { 'data-testid': 'card-face-stub__image-slot' }, slots.image?.()),
        h('div', { 'data-testid': 'card-face-stub__editor-slot' }, slots.editor?.())
      ])
  }
})

function mountCard(props = {}, slots = {}) {
  return shallowMount(Card, {
    props: { side: 'front', ...props },
    slots,
    global: { stubs: { CardFace: CardFaceStub }, directives: { sfx: {} } }
  })
}

describe('Card (cover side)', () => {
  // ── Cover rendering ──────────────────────────────��────────────────────────────

  test('renders card-cover-stub when side is cover', () => {
    const wrapper = mountCard({ side: 'cover' })
    expect(wrapper.findComponent({ name: 'CardCover' }).exists()).toBe(true)
  })

  test('does not render card-cover-stub when side is front', () => {
    const wrapper = mountCard({ side: 'front' })
    expect(wrapper.findComponent({ name: 'CardCover' }).exists()).toBe(false)
  })

  test('does not render card-cover-stub when side is back', () => {
    const wrapper = mountCard({ side: 'back' })
    expect(wrapper.findComponent({ name: 'CardCover' }).exists()).toBe(false)
  })

  // ── cover_config forwarding ──────────────────────────────��────────────────────

  test('passes cover_config to card-cover', () => {
    const cover_config = { bg_color: 'blue-500', pattern: 'stars' }
    const wrapper = mountCard({ side: 'cover', cover_config })
    const coverStub = wrapper.findComponent({ name: 'CardCover' })
    expect(coverStub.props('cover')).toEqual(cover_config)
  })

  test('passes undefined cover_config when not provided', () => {
    const wrapper = mountCard({ side: 'cover' })
    const coverStub = wrapper.findComponent({ name: 'CardCover' })
    expect(coverStub.props('cover')).toBeUndefined()
  })

  // ── error prop → data-error attribute (drives red outline in CSS) ────────────

  test('does not set data-error on the root when error is false', () => {
    const wrapper = mountCard({ error: false })
    expect(wrapper.find('[data-testid="card"]').attributes('data-error')).toBeUndefined()
  })

  test('does not set data-error on the root when error is omitted (defaults to false)', () => {
    const wrapper = mountCard()
    expect(wrapper.find('[data-testid="card"]').attributes('data-error')).toBeUndefined()
  })

  test('sets data-error on the root when error is true', () => {
    const wrapper = mountCard({ error: true })
    // Binding uses `error || undefined` so the attribute is absent when false
    // and present when true; we don't assert a specific value string.
    expect(wrapper.find('[data-testid="card"]').attributes('data-error')).toBeDefined()
  })
})

describe('Card slot-forwarding [obligation]', () => {
  // ── #image slot forwarding ────────────────────────────────────────────────────
  // The card forwards the caller's #image slot to the active face's #image slot.
  // When no #image slot is provided the face uses its default <img> from the
  // `image` prop. This is a regression guard — an unfilled forwarded slot must
  // not blank out images in study/grid views.

  test('forwards the #image slot to the front face', () => {
    const wrapper = mountCard(
      { side: 'front' },
      { image: '<div data-testid="slot-content">x</div>' }
    )
    expect(wrapper.find('[data-testid="slot-content"]').exists()).toBe(true)
  })

  test('forwards the #image slot to the back face', () => {
    const wrapper = mountCard(
      { side: 'back' },
      { image: '<div data-testid="slot-content">x</div>' }
    )
    expect(wrapper.find('[data-testid="slot-content"]').exists()).toBe(true)
  })

  test('renders default <img> from front_image_path when no #image slot is provided', () => {
    const wrapper = mountCard({ side: 'front', front_image_path: 'cards/front.jpg' })
    // The default slot in card-face renders an <img> — card-face-stub exposes
    // via findComponent since shallowMount stubs the inner CardFace.
    const face = wrapper.findComponent({ name: 'CardFace' })
    expect(face.props('image')).toContain('cards/front.jpg')
  })

  test('renders default <img> from back_image_path when no #image slot is provided', () => {
    const wrapper = mountCard({ side: 'back', back_image_path: 'cards/back.jpg' })
    const face = wrapper.findComponent({ name: 'CardFace' })
    expect(face.props('image')).toContain('cards/back.jpg')
  })

  test('passes card_attributes.front to the front face', () => {
    const card_attributes = { front: { image_layout: 'behind' }, back: {} }
    const wrapper = mountCard({ side: 'front', card_attributes })
    const face = wrapper.findComponent({ name: 'CardFace' })
    expect(face.props('attributes')).toEqual({ image_layout: 'behind' })
  })

  test('passes card_attributes.back to the back face', () => {
    const card_attributes = { front: {}, back: { image_layout: 'below' } }
    const wrapper = mountCard({ side: 'back', card_attributes })
    const face = wrapper.findComponent({ name: 'CardFace' })
    expect(face.props('attributes')).toEqual({ image_layout: 'below' })
  })
})
