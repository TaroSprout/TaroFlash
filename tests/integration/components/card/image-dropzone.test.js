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

// FaceOverlay stub — image-dropzone now delegates its scrim/error UI here
// (was inlined as its own __scrim/__error markup before this refactor).
const FaceOverlayStub = defineComponent({
  name: 'FaceOverlay',
  props: ['variant', 'error', 'heading', 'active'],
  emits: ['browse', 'dismiss-error'],
  setup(props, { emit }) {
    return () =>
      h(
        'div',
        {
          'data-testid': 'face-overlay-stub',
          'data-variant': props.variant,
          'data-error': props.error || undefined,
          'data-active': props.active || undefined
        },
        [
          h('button', {
            'data-testid': 'face-overlay-stub__browse',
            onClick: () => emit('browse')
          }),
          h('button', {
            'data-testid': 'face-overlay-stub__dismiss-error',
            onClick: () => emit('dismiss-error')
          })
        ]
      )
  }
})

function mountDropzone(props = {}) {
  return shallowMount(ImageDropzone, {
    props,
    global: {
      stubs: { UiButton: UiButtonStub, FaceOverlay: FaceOverlayStub },
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

  // ── region mode structure ────────────────────────────────────────────────────

  test('region mode renders the <img> when image prop is set', () => {
    const wrapper = mountDropzone({ mode: 'region', image: 'https://example.com/img.jpg' })
    const img = wrapper.find('[data-testid="image-dropzone__image"]')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe('https://example.com/img.jpg')
  })

  test('region mode does NOT render the img when image prop is absent', () => {
    const wrapper = mountDropzone({ mode: 'region' })
    expect(wrapper.find('[data-testid="image-dropzone__image"]').exists()).toBe(false)
  })

  test('region mode renders the __remove button', () => {
    const wrapper = mountDropzone({ mode: 'region', image: 'https://example.com/img.jpg' })
    expect(wrapper.find('[data-testid="image-dropzone__remove"]').exists()).toBe(true)
  })

  test('region mode does NOT render the __replace button', () => {
    const wrapper = mountDropzone({ mode: 'region', image: 'https://example.com/img.jpg' })
    expect(wrapper.find('[data-testid="image-dropzone__replace"]').exists()).toBe(false)
  })

  // ── corners mode structure ───────────────────────────────────────────────────

  test('corners mode renders the __remove button', () => {
    const wrapper = mountDropzone({ mode: 'corners' })
    expect(wrapper.find('[data-testid="image-dropzone__remove"]').exists()).toBe(true)
  })

  test('corners mode renders the __replace button', () => {
    const wrapper = mountDropzone({ mode: 'corners' })
    expect(wrapper.find('[data-testid="image-dropzone__replace"]').exists()).toBe(true)
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

  // ── FaceOverlay delegation [obligation] ──────────────────────────────────────
  // image-dropzone now delegates its scrim/error chrome to <face-overlay> (an
  // "inset" variant) instead of rendering its own __scrim/__error markup.

  test('region mode renders the FaceOverlay (inset variant) when no error [obligation]', () => {
    const wrapper = mountDropzone({ mode: 'region', image: 'https://example.com/img.jpg' })
    const overlay = wrapper.find('[data-testid="face-overlay-stub"]')
    expect(overlay.exists()).toBe(true)
    expect(overlay.attributes('data-variant')).toBe('inset')
  })

  test('corners mode does NOT render the FaceOverlay when there is no error [obligation]', () => {
    const wrapper = mountDropzone({ mode: 'corners' })
    expect(wrapper.find('[data-testid="face-overlay-stub"]').exists()).toBe(false)
  })

  test('corners mode DOES render the FaceOverlay when there is an error [obligation]', () => {
    const wrapper = mountDropzone({ mode: 'corners', error: 'File too large' })
    expect(wrapper.find('[data-testid="face-overlay-stub"]').exists()).toBe(true)
  })

  test('forwards the error prop to the FaceOverlay [obligation]', () => {
    const wrapper = mountDropzone({ mode: 'region', error: 'File too large' })
    expect(wrapper.find('[data-testid="face-overlay-stub"]').attributes('data-error')).toBe(
      'File too large'
    )
  })

  test('forwards the active prop to the FaceOverlay [obligation]', () => {
    const wrapper = mountDropzone({ mode: 'region', active: true })
    expect(wrapper.find('[data-testid="face-overlay-stub"]').attributes('data-active')).toBe('true')
  })

  test('the FaceOverlay browse click re-emits browse [obligation]', async () => {
    const wrapper = mountDropzone({ mode: 'region', image: 'https://example.com/img.jpg' })
    await wrapper.find('[data-testid="face-overlay-stub__browse"]').trigger('click')
    expect(wrapper.emitted('browse')).toHaveLength(1)
  })

  test('the FaceOverlay dismiss-error click re-emits dismiss-error [obligation]', async () => {
    const wrapper = mountDropzone({ mode: 'region', error: 'oops' })
    await wrapper.find('[data-testid="face-overlay-stub__dismiss-error"]').trigger('click')
    expect(wrapper.emitted('dismiss-error')).toHaveLength(1)
  })

  // ── event contracts ───────────────────────────────────────────────────────────

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

  // ── data-active attribute (root) ─────────────────────────────────────────────

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
