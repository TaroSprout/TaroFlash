import { describe, test, expect, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import CardFace from '@/components/card/card-face.vue'

// TextEditor stub — no real rendering needed; just suppresses warnings
const TextEditorStub = defineComponent({
  name: 'TextEditor',
  props: ['content', 'attributes', 'disabled'],
  setup: () => () => h('div', { 'data-testid': 'text-editor-stub' })
})

vi.mock('gsap', () => ({ gsap: { fromTo: vi.fn(), to: vi.fn() } }))

function mountFace(props = {}, slots = {}) {
  return shallowMount(CardFace, {
    props,
    slots,
    global: {
      stubs: { TextEditor: TextEditorStub }
    }
  })
}

describe('CardFace', () => {
  // ── data-layout attribute ────────────────────────────────────────────────────

  test('data-layout defaults to "above" when no attributes provided', () => {
    const wrapper = mountFace()
    expect(wrapper.find('.card-face').attributes('data-layout')).toBe('above')
  })

  test('data-layout defaults to "above" when attributes has no image_layout', () => {
    const wrapper = mountFace({ attributes: { text_align: 'center' } })
    expect(wrapper.find('.card-face').attributes('data-layout')).toBe('above')
  })

  test('data-layout equals attributes.image_layout when set to "below"', () => {
    const wrapper = mountFace({ attributes: { image_layout: 'below' } })
    expect(wrapper.find('.card-face').attributes('data-layout')).toBe('below')
  })

  test('data-layout equals attributes.image_layout when set to "behind"', () => {
    const wrapper = mountFace({ attributes: { image_layout: 'behind' } })
    expect(wrapper.find('.card-face').attributes('data-layout')).toBe('behind')
  })

  test('data-layout equals attributes.image_layout when set to "above"', () => {
    const wrapper = mountFace({ attributes: { image_layout: 'above' } })
    expect(wrapper.find('.card-face').attributes('data-layout')).toBe('above')
  })

  // ── data-image / data-text attributes ───────────────────────────────────────

  test('data-image is false when no image prop', () => {
    const wrapper = mountFace({ text: 'hello' })
    expect(wrapper.find('.card-face').attributes('data-image')).toBe('false')
  })

  test('data-image is true when image prop is provided', () => {
    const wrapper = mountFace({ image: 'https://example.com/img.jpg' })
    expect(wrapper.find('.card-face').attributes('data-image')).toBe('true')
  })

  test('data-text is false when no text prop', () => {
    const wrapper = mountFace({ image: 'https://example.com/img.jpg' })
    expect(wrapper.find('.card-face').attributes('data-text')).toBe('false')
  })

  test('data-text is true when text prop is provided', () => {
    const wrapper = mountFace({ text: 'hello' })
    expect(wrapper.find('.card-face').attributes('data-text')).toBe('true')
  })

  // ── Image region and text region render simultaneously ───────────────────────
  // Core feature: old XOR behavior gone; both regions always render.

  test('renders both image-region and text-region when only image is present [obligation]', () => {
    const wrapper = mountFace({ image: 'https://example.com/img.jpg' })
    expect(wrapper.find('[data-testid="card-face__image-region"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="card-face__text-region"]').exists()).toBe(true)
  })

  test('renders both image-region and text-region when only text is present [obligation]', () => {
    const wrapper = mountFace({ text: 'hello' })
    expect(wrapper.find('[data-testid="card-face__image-region"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="card-face__text-region"]').exists()).toBe(true)
  })

  test('renders both image-region and text-region when both image and text are present [obligation]', () => {
    const wrapper = mountFace({ image: 'https://example.com/img.jpg', text: 'hello' })
    expect(wrapper.find('[data-testid="card-face__image-region"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="card-face__text-region"]').exists()).toBe(true)
  })

  test('renders both image-region and text-region when neither image nor text is provided', () => {
    const wrapper = mountFace()
    expect(wrapper.find('[data-testid="card-face__image-region"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="card-face__text-region"]').exists()).toBe(true)
  })

  // ── Default image slot: renders <img> when image prop is present ─────────────

  test('renders img element inside image-region when image prop is set', () => {
    const wrapper = mountFace({ image: 'https://example.com/img.jpg' })
    const img = wrapper.find('[data-testid="card-face__image"]')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe('https://example.com/img.jpg')
  })

  test('does not render img element when image prop is absent', () => {
    const wrapper = mountFace()
    expect(wrapper.find('[data-testid="card-face__image"]').exists()).toBe(false)
  })

  // ── Custom #image slot replaces the default img ──────────────────────────────

  test('renders the #image slot content instead of the default img', () => {
    const wrapper = mountFace(
      { image: 'https://example.com/img.jpg' },
      { image: '<div data-testid="custom-image-slot">Custom</div>' }
    )
    // The slot replaces the default img
    expect(wrapper.find('[data-testid="custom-image-slot"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="card-face__image"]').exists()).toBe(false)
  })

  // ── data-mode attribute ─────────────────────────────────────────────────────

  test('sets data-mode to "view" when mode prop is view', () => {
    const wrapper = mountFace({ mode: 'view' })
    expect(wrapper.find('.card-face').attributes('data-mode')).toBe('view')
  })

  test('sets data-mode to "edit" when mode prop is edit', () => {
    const wrapper = mountFace({ mode: 'edit' })
    expect(wrapper.find('.card-face').attributes('data-mode')).toBe('edit')
  })

  test('data-mode is absent when mode prop is not provided', () => {
    const wrapper = mountFace()
    expect(wrapper.find('.card-face').attributes('data-mode')).toBeUndefined()
  })

  // ── Text-region font size (size × text_size level) ───────────────────────────
  // Font size scales with BOTH the card size and the per-deck text_size level.
  // The editor inherits it from the text-region via the cascade.

  function textRegionStyle(wrapper) {
    return wrapper.find('[data-testid="card-face__text-region"]').attributes('style')
  }

  test('defaults to base size, level 4 (15px) when no size/attributes provided', () => {
    expect(textRegionStyle(mountFace())).toContain('font-size: 15px')
  })

  test('xl size preserves the canonical scale: level 4 maps to 30px', () => {
    const wrapper = mountFace({ size: 'xl', attributes: { text_size: 4 } })
    expect(textRegionStyle(wrapper)).toContain('font-size: 30px')
  })

  test('xl level 1 maps to 16px and level 10 maps to 84px', () => {
    expect(textRegionStyle(mountFace({ size: 'xl', attributes: { text_size: 1 } }))).toContain(
      'font-size: 16px'
    )
    expect(textRegionStyle(mountFace({ size: 'xl', attributes: { text_size: 10 } }))).toContain(
      'font-size: 84px'
    )
  })

  test('md size row: default level 4 maps to 19px [obligation]', () => {
    expect(textRegionStyle(mountFace({ size: 'md', attributes: { text_size: 4 } }))).toContain(
      'font-size: 19px'
    )
  })

  test('md size row: level 1 maps to 10px [obligation]', () => {
    expect(textRegionStyle(mountFace({ size: 'md', attributes: { text_size: 1 } }))).toContain(
      'font-size: 10px'
    )
  })

  test('md size row: level 10 maps to 52px', () => {
    expect(textRegionStyle(mountFace({ size: 'md', attributes: { text_size: 10 } }))).toContain(
      'font-size: 52px'
    )
  })

  test('the same level scales down for smaller cards', () => {
    expect(textRegionStyle(mountFace({ size: '2xl', attributes: { text_size: 4 } }))).toContain(
      'font-size: 36px'
    )
    expect(textRegionStyle(mountFace({ size: 'xs', attributes: { text_size: 4 } }))).toContain(
      'font-size: 10px'
    )
  })

  test('level clamps within the size row', () => {
    expect(textRegionStyle(mountFace({ size: 'xl', attributes: { text_size: 99 } }))).toContain(
      'font-size: 84px'
    )
    expect(textRegionStyle(mountFace({ size: 'xl', attributes: { text_size: 0 } }))).toContain(
      'font-size: 16px'
    )
  })

  test('non-integer level rounds to the nearest level', () => {
    const wrapper = mountFace({ size: 'xl', attributes: { text_size: 3.7 } })
    expect(textRegionStyle(wrapper)).toContain('font-size: 30px')
  })
})
