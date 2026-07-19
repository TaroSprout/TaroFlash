import { describe, test, expect, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import CardFace from '@/components/card/card-face.vue'
import { cardTextScale } from '@/utils/card/text-scale'

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

  // ── Text-region --card-text-scale (fluid font-size multiplier) ──────────────
  // Font size is fully fluid (cqi) now — not testable in jsdom — but the JS
  // seam (which multiplier the deck's text_size level resolves to) is: the
  // text-region's --card-text-scale var must equal cardTextScale(level).

  function textScaleVar(wrapper) {
    return wrapper
      .find('[data-testid="card-face__text-region"]')
      .element.style.getPropertyValue('--card-text-scale')
  }

  test('defaults to the default level multiplier (1) when no attributes provided', () => {
    expect(textScaleVar(mountFace())).toBe(String(cardTextScale()))
  })

  test('text_size level 4 (the deck default) resolves to a multiplier of 1', () => {
    const wrapper = mountFace({ attributes: { text_size: 4 } })
    expect(textScaleVar(wrapper)).toBe('1')
  })

  test('text_size level 1 resolves to cardTextScale(1)', () => {
    const wrapper = mountFace({ attributes: { text_size: 1 } })
    expect(textScaleVar(wrapper)).toBe(String(cardTextScale(1)))
  })

  test('text_size level 10 resolves to cardTextScale(10)', () => {
    const wrapper = mountFace({ attributes: { text_size: 10 } })
    expect(textScaleVar(wrapper)).toBe(String(cardTextScale(10)))
  })

  test('an out-of-range level clamps the same way cardTextScale does', () => {
    expect(textScaleVar(mountFace({ attributes: { text_size: 99 } }))).toBe(
      String(cardTextScale(99))
    )
    expect(textScaleVar(mountFace({ attributes: { text_size: 0 } }))).toBe(String(cardTextScale(0)))
  })

  test('a fractional level rounds the same way cardTextScale does', () => {
    const wrapper = mountFace({ attributes: { text_size: 3.7 } })
    expect(textScaleVar(wrapper)).toBe(String(cardTextScale(3.7)))
  })
})
