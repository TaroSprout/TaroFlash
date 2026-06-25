import { describe, test, expect, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, useAttrs } from 'vue'
import ImageDropzone from '@/components/card/image-dropzone.vue'

// UiButton stub: forward attrs + native clicks, render default slot
const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  props: ['iconOnly', 'iconLeft', 'size'],
  setup(_p, { slots }) {
    const attrs = useAttrs()
    return () => h('button', attrs, slots.default?.())
  }
})

// UiIcon stub: no output needed
const UiIconStub = defineComponent({
  name: 'UiIcon',
  props: ['src'],
  setup: () => () => h('i')
})

function mountDropzone(props = {}) {
  return shallowMount(ImageDropzone, {
    props,
    global: {
      stubs: { UiButton: UiButtonStub, UiIcon: UiIconStub },
      directives: { sfx: {} }
    }
  })
}

describe('ImageDropzone', () => {
  // ── data-mode attribute ─────────────────────────────────────────────────────

  test('renders with data-mode="region" in region mode', () => {
    const wrapper = mountDropzone({ mode: 'region' })
    expect(wrapper.find('[data-testid="image-dropzone"]').attributes('data-mode')).toBe('region')
  })

  test('renders with data-mode="corners" in corners mode', () => {
    const wrapper = mountDropzone({ mode: 'corners' })
    expect(wrapper.find('[data-testid="image-dropzone"]').attributes('data-mode')).toBe('corners')
  })

  // ── region mode structure [obligation] ──────────────────────────────────────

  test('region mode renders the <img> when image prop is set [obligation]', () => {
    const wrapper = mountDropzone({ mode: 'region', image: 'https://example.com/img.jpg' })
    const img = wrapper.find('[data-testid="image-dropzone__image"]')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe('https://example.com/img.jpg')
  })

  test('region mode does NOT render the img when image prop is absent', () => {
    const wrapper = mountDropzone({ mode: 'region' })
    expect(wrapper.find('[data-testid="image-dropzone__image"]').exists()).toBe(false)
  })

  test('region mode renders the __scrim when no error [obligation]', () => {
    const wrapper = mountDropzone({ mode: 'region', image: 'https://example.com/img.jpg' })
    expect(wrapper.find('[data-testid="image-dropzone__scrim"]').exists()).toBe(true)
  })

  test('region mode renders the __remove button [obligation]', () => {
    const wrapper = mountDropzone({ mode: 'region', image: 'https://example.com/img.jpg' })
    expect(wrapper.find('[data-testid="image-dropzone__remove"]').exists()).toBe(true)
  })

  test('region mode does NOT render the __replace button', () => {
    const wrapper = mountDropzone({ mode: 'region', image: 'https://example.com/img.jpg' })
    expect(wrapper.find('[data-testid="image-dropzone__replace"]').exists()).toBe(false)
  })

  // ── corners mode structure [obligation] ─────────────────────────────────────

  test('corners mode renders the __remove button [obligation]', () => {
    const wrapper = mountDropzone({ mode: 'corners' })
    expect(wrapper.find('[data-testid="image-dropzone__remove"]').exists()).toBe(true)
  })

  test('corners mode renders the __replace button [obligation]', () => {
    const wrapper = mountDropzone({ mode: 'corners' })
    expect(wrapper.find('[data-testid="image-dropzone__replace"]').exists()).toBe(true)
  })

  test('corners mode does NOT render the __scrim [obligation]', () => {
    const wrapper = mountDropzone({ mode: 'corners' })
    expect(wrapper.find('[data-testid="image-dropzone__scrim"]').exists()).toBe(false)
  })

  test('corners mode does NOT render the <img>', () => {
    const wrapper = mountDropzone({ mode: 'corners', image: 'https://example.com/img.jpg' })
    expect(wrapper.find('[data-testid="image-dropzone__image"]').exists()).toBe(false)
  })

  // ── disabled prop hides controls ────────────────────────────────────────────

  test('hides the __remove button when disabled in region mode', () => {
    const wrapper = mountDropzone({
      mode: 'region',
      image: 'https://example.com/img.jpg',
      disabled: true
    })
    expect(wrapper.find('[data-testid="image-dropzone__remove"]').exists()).toBe(false)
  })

  test('hides the __replace button when disabled in corners mode', () => {
    const wrapper = mountDropzone({ mode: 'corners', disabled: true })
    expect(wrapper.find('[data-testid="image-dropzone__replace"]').exists()).toBe(false)
  })

  test('hides the __scrim when disabled in region mode', () => {
    const wrapper = mountDropzone({
      mode: 'region',
      image: 'https://example.com/img.jpg',
      disabled: true
    })
    expect(wrapper.find('[data-testid="image-dropzone__scrim"]').exists()).toBe(false)
  })

  // ── error prop [obligation] ─────────────────────────────────────────────────

  test('truthy error renders the __error element [obligation]', () => {
    const wrapper = mountDropzone({ mode: 'region', error: 'File too large' })
    expect(wrapper.find('[data-testid="image-dropzone__error"]').exists()).toBe(true)
  })

  test('__error contains the dismiss button [obligation]', () => {
    const wrapper = mountDropzone({ mode: 'region', error: 'File too large' })
    expect(wrapper.find('[data-testid="image-dropzone__dismiss-error"]').exists()).toBe(true)
  })

  test('no error: __error element is absent', () => {
    const wrapper = mountDropzone({ mode: 'region' })
    expect(wrapper.find('[data-testid="image-dropzone__error"]').exists()).toBe(false)
  })

  test('error hides the __scrim in region mode (both cannot show simultaneously)', () => {
    const wrapper = mountDropzone({ mode: 'region', error: 'File too large' })
    expect(wrapper.find('[data-testid="image-dropzone__scrim"]').exists()).toBe(false)
  })

  // ── event contracts [obligation] ────────────────────────────────────────────

  test('__scrim click emits browse [obligation]', async () => {
    const wrapper = mountDropzone({ mode: 'region', image: 'https://example.com/img.jpg' })
    await wrapper.find('[data-testid="image-dropzone__scrim"]').trigger('click')
    expect(wrapper.emitted('browse')).toHaveLength(1)
  })

  test('__replace click emits browse in corners mode [obligation]', async () => {
    const wrapper = mountDropzone({ mode: 'corners' })
    await wrapper.find('[data-testid="image-dropzone__replace"]').trigger('click')
    expect(wrapper.emitted('browse')).toHaveLength(1)
  })

  test('__remove click emits remove [obligation]', async () => {
    const wrapper = mountDropzone({ mode: 'region', image: 'https://example.com/img.jpg' })
    await wrapper.find('[data-testid="image-dropzone__remove"]').trigger('click')
    expect(wrapper.emitted('remove')).toHaveLength(1)
  })

  test('__dismiss-error button emits dismiss-error [obligation]', async () => {
    const wrapper = mountDropzone({ mode: 'region', error: 'File too large' })
    await wrapper.find('[data-testid="image-dropzone__dismiss-error"]').trigger('click')
    expect(wrapper.emitted('dismiss-error')).toHaveLength(1)
  })

  test('__error click emits browse (re-pick after error) [obligation]', async () => {
    const wrapper = mountDropzone({ mode: 'region', error: 'File too large' })
    await wrapper.find('[data-testid="image-dropzone__error"]').trigger('click')
    expect(wrapper.emitted('browse')).toHaveLength(1)
  })

  // ── data-active attribute ───────────────────────────────────────────────────

  test('sets data-active on the root when active is true', () => {
    const wrapper = mountDropzone({ mode: 'region', active: true })
    expect(wrapper.find('[data-testid="image-dropzone"]').attributes('data-active')).toBe('true')
  })

  test('data-active is absent on the root when active is false', () => {
    const wrapper = mountDropzone({ mode: 'region', active: false })
    expect(wrapper.find('[data-testid="image-dropzone"]').attributes('data-active')).toBeUndefined()
  })

  test('data-active defaults to absent when active prop is omitted', () => {
    const wrapper = mountDropzone({ mode: 'region' })
    expect(wrapper.find('[data-testid="image-dropzone"]').attributes('data-active')).toBeUndefined()
  })
})
