import { describe, test, expect, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, nextTick, shallowRef } from 'vue'
import CoverImageLayer from '@/components/card/cover-image-layer.vue'

// ── Stubs ────────────────────────────────────────────────────────────────────

const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  props: ['iconOnly', 'iconLeft'],
  emits: ['click'],
  setup(_props, { slots, attrs, emit }) {
    return () =>
      h(
        'button',
        { ...attrs, 'data-testid': attrs['data-testid'], onClick: (e) => emit('click', e) },
        slots.default?.()
      )
  }
})

const ImageDropzoneStub = defineComponent({
  name: 'ImageDropzone',
  // Boolean-typed so the shorthand `active` attribute (no explicit value) in
  // the real template coerces to `true` instead of the empty-string literal.
  props: { mode: String, active: Boolean, removeLabel: String, replaceLabel: String },
  emits: ['browse', 'remove'],
  setup(props, { emit }) {
    return () =>
      h('div', { 'data-testid': 'image-dropzone-stub', 'data-mode': props.mode }, [
        h('button', {
          'data-testid': 'image-dropzone-stub__browse',
          onClick: () => emit('browse')
        }),
        h('button', {
          'data-testid': 'image-dropzone-stub__remove',
          onClick: () => emit('remove')
        })
      ])
  }
})

const FaceOverlayStub = defineComponent({
  name: 'FaceOverlay',
  props: ['variant', 'error', 'heading'],
  emits: ['browse', 'dismiss-error'],
  setup(props, { emit }) {
    return () =>
      h(
        'div',
        {
          'data-testid': 'face-overlay-stub',
          'data-variant': props.variant,
          'data-error': props.error
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

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeCoverImage(overrides = {}) {
  return {
    accept: 'image/png,image/jpeg,image/webp,image/gif',
    // A real shallowRef, not a plain { value } object — the component binds
    // it with `:ref`, which Vue resolves as a proper Ref.
    file_input: shallowRef(null),
    dragging: { value: false },
    has_image: { value: false },
    error_message: { value: '' },
    onFileChange: vi.fn(),
    onDragEnter: vi.fn(),
    onDragLeave: vi.fn(),
    onDragOver: vi.fn(),
    onDrop: vi.fn(),
    openPicker: vi.fn(),
    onRemove: vi.fn(),
    onDismissError: vi.fn(),
    ...overrides
  }
}

function mountLayer(props = {}, mountOptions = {}) {
  return shallowMount(CoverImageLayer, {
    props: { cover_image: makeCoverImage(), root: null, ...props },
    global: {
      stubs: {
        UiButton: UiButtonStub,
        ImageDropzone: ImageDropzoneStub,
        FaceOverlay: FaceOverlayStub
      }
    },
    ...mountOptions
  })
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('CoverImageLayer — add button (empty state)', () => {
  test('shows the add button on an empty, idle, error-free cover', () => {
    const wrapper = mountLayer()
    expect(wrapper.find('[data-testid="cover-image-layer__add"]').exists()).toBe(true)
  })

  test('hides the add button once an image is set', () => {
    const cover_image = makeCoverImage({ has_image: { value: true } })
    const wrapper = mountLayer({ cover_image })
    expect(wrapper.find('[data-testid="cover-image-layer__add"]').exists()).toBe(false)
  })

  test('hides the add button while dragging', () => {
    const cover_image = makeCoverImage({ dragging: { value: true } })
    const wrapper = mountLayer({ cover_image })
    expect(wrapper.find('[data-testid="cover-image-layer__add"]').exists()).toBe(false)
  })

  test('hides the add button while a validation error is showing', () => {
    const cover_image = makeCoverImage({ error_message: { value: 'too-large' } })
    const wrapper = mountLayer({ cover_image })
    expect(wrapper.find('[data-testid="cover-image-layer__add"]').exists()).toBe(false)
  })

  test('clicking the add button calls openPicker', async () => {
    const cover_image = makeCoverImage()
    const wrapper = mountLayer({ cover_image })

    await wrapper.find('[data-testid="cover-image-layer__add"]').trigger('click')

    expect(cover_image.openPicker).toHaveBeenCalled()
  })
})

describe('CoverImageLayer — replace/remove controls (image set)', () => {
  test('renders its own replace/remove buttons once an image is set, not the dropzone', () => {
    const cover_image = makeCoverImage({ has_image: { value: true } })
    const wrapper = mountLayer({ cover_image })
    expect(wrapper.find('[data-testid="cover-image-layer__replace"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="cover-image-layer__remove"]').exists()).toBe(true)
    expect(wrapper.findComponent(ImageDropzoneStub).exists()).toBe(false)
  })

  test('hides the controls while dragging, even with an image set', () => {
    const cover_image = makeCoverImage({ has_image: { value: true }, dragging: { value: true } })
    const wrapper = mountLayer({ cover_image })
    expect(wrapper.find('[data-testid="cover-image-layer__replace"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="cover-image-layer__remove"]').exists()).toBe(false)
  })

  test('hides the controls while a validation error is showing', () => {
    const cover_image = makeCoverImage({
      has_image: { value: true },
      error_message: { value: 'invalid-type' }
    })
    const wrapper = mountLayer({ cover_image })
    expect(wrapper.find('[data-testid="cover-image-layer__replace"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="cover-image-layer__remove"]').exists()).toBe(false)
  })

  test('replace click calls openPicker', async () => {
    const cover_image = makeCoverImage({ has_image: { value: true } })
    const wrapper = mountLayer({ cover_image })

    await wrapper.find('[data-testid="cover-image-layer__replace"]').trigger('click')

    expect(cover_image.openPicker).toHaveBeenCalled()
  })

  test('remove click calls onRemove', async () => {
    const cover_image = makeCoverImage({ has_image: { value: true } })
    const wrapper = mountLayer({ cover_image })

    await wrapper.find('[data-testid="cover-image-layer__remove"]').trigger('click')

    expect(cover_image.onRemove).toHaveBeenCalled()
  })
})

describe('CoverImageLayer — full-face overlay (dragging / error)', () => {
  test('renders the full FaceOverlay while dragging', () => {
    const cover_image = makeCoverImage({ dragging: { value: true } })
    const wrapper = mountLayer({ cover_image })
    const overlay = wrapper.findComponent(FaceOverlayStub)
    expect(overlay.exists()).toBe(true)
    expect(overlay.props('variant')).toBe('full')
  })

  test('renders the full FaceOverlay when a validation error is present', () => {
    const cover_image = makeCoverImage({ error_message: { value: 'Image must be under 5 MB.' } })
    const wrapper = mountLayer({ cover_image })
    const overlay = wrapper.findComponent(FaceOverlayStub)
    expect(overlay.exists()).toBe(true)
    expect(overlay.props('error')).toBe('Image must be under 5 MB.')
  })

  test('does not render the overlay on an idle, error-free, empty cover', () => {
    const wrapper = mountLayer()
    expect(wrapper.findComponent(FaceOverlayStub).exists()).toBe(false)
  })

  test('the overlay browse click calls openPicker', async () => {
    const cover_image = makeCoverImage({ dragging: { value: true } })
    const wrapper = mountLayer({ cover_image })

    await wrapper.find('[data-testid="face-overlay-stub__browse"]').trigger('click')

    expect(cover_image.openPicker).toHaveBeenCalled()
  })

  test('the overlay dismiss-error click calls onDismissError', async () => {
    const cover_image = makeCoverImage({ error_message: { value: 'oops' } })
    const wrapper = mountLayer({ cover_image })

    await wrapper.find('[data-testid="face-overlay-stub__dismiss-error"]').trigger('click')

    expect(cover_image.onDismissError).toHaveBeenCalled()
  })
})

describe('CoverImageLayer — hidden file input', () => {
  test('forwards accept from cover_image.accept', () => {
    const cover_image = makeCoverImage({ accept: 'image/png' })
    const wrapper = mountLayer({ cover_image })
    expect(wrapper.find('input[type="file"]').attributes('accept')).toBe('image/png')
  })

  test('the change event reaches onFileChange', async () => {
    const cover_image = makeCoverImage()
    const wrapper = mountLayer({ cover_image })

    await wrapper.find('input[type="file"]').trigger('change')

    expect(cover_image.onFileChange).toHaveBeenCalled()
  })

  test('a click on the input does not bubble to a parent click handler', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const parentClick = vi.fn()
    container.addEventListener('click', parentClick)

    const wrapper = mountLayer({}, { attachTo: container })
    await wrapper.find('input[type="file"]').trigger('click')

    expect(parentClick).not.toHaveBeenCalled()

    wrapper.unmount()
    container.remove()
  })
})

describe('CoverImageLayer — root listener wiring', () => {
  test('attaches drag listeners to the passed-in root element', async () => {
    const cover_image = makeCoverImage()
    const root = document.createElement('div')
    document.body.appendChild(root)

    mountLayer({ cover_image, root })
    await nextTick()

    root.dispatchEvent(new Event('dragenter', { bubbles: true }))
    expect(cover_image.onDragEnter).toHaveBeenCalled()

    root.dispatchEvent(new Event('dragleave', { bubbles: true }))
    expect(cover_image.onDragLeave).toHaveBeenCalled()

    root.dispatchEvent(new Event('dragover', { bubbles: true }))
    expect(cover_image.onDragOver).toHaveBeenCalled()

    root.dispatchEvent(new Event('drop', { bubbles: true }))
    expect(cover_image.onDrop).toHaveBeenCalled()

    root.remove()
  })

  test('detaches listeners from the old root when root changes', async () => {
    const cover_image = makeCoverImage()
    const first_root = document.createElement('div')
    const second_root = document.createElement('div')
    document.body.append(first_root, second_root)

    const wrapper = mountLayer({ cover_image, root: first_root })
    await nextTick()
    await wrapper.setProps({ root: second_root })
    await nextTick()

    first_root.dispatchEvent(new Event('dragenter', { bubbles: true }))
    expect(cover_image.onDragEnter).not.toHaveBeenCalled()

    second_root.dispatchEvent(new Event('dragenter', { bubbles: true }))
    expect(cover_image.onDragEnter).toHaveBeenCalled()

    first_root.remove()
    second_root.remove()
  })

  test('detaches listeners from the root on unmount', async () => {
    const cover_image = makeCoverImage()
    const root = document.createElement('div')
    document.body.appendChild(root)

    const wrapper = mountLayer({ cover_image, root })
    await nextTick()
    wrapper.unmount()

    root.dispatchEvent(new Event('dragenter', { bubbles: true }))
    expect(cover_image.onDragEnter).not.toHaveBeenCalled()

    root.remove()
  })

  test('is a no-op when root is null', async () => {
    const cover_image = makeCoverImage()
    expect(() => mountLayer({ cover_image, root: null })).not.toThrow()
    await nextTick()
  })
})
