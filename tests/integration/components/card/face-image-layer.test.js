import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'

// ── Hoisted mocks ────────────────────────────────────────────────────────────
// vi.hoisted callbacks run before any import (including `vue`) has evaluated,
// so the reactive `upload` state (needs the real `ref`) is built lazily inside
// each vi.mock factory instead, and stashed on this plain container so tests
// can reach it as `state.upload`.

const { state, emitSfxMock, playButtonTapMock } = vi.hoisted(() => ({
  state: {},
  emitSfxMock: vi.fn(),
  playButtonTapMock: vi.fn()
}))

vi.mock('@/composables/card', () => {
  state.upload = {
    accept: ref('image/png,image/jpeg'),
    onFileChange: vi.fn(),
    onDragEnter: vi.fn(),
    onDragLeave: vi.fn(),
    onDragOver: vi.fn(),
    onDrop: vi.fn(),
    dragging: ref(false),
    file_error: ref(''),
    hovered: ref(false),
    active: ref(false),
    covered: ref(false),
    pending: ref(false),
    has_image: ref(false),
    image_path: ref(undefined),
    can_upload: ref(true),
    onRemove: vi.fn(),
    openPicker: vi.fn(),
    onDismissError: vi.fn(),
    onPointerEnter: vi.fn(),
    onPointerLeave: vi.fn()
  }
  return {
    useFaceImageUpload: () => state.upload,
    CARD_IMAGE_MAX_BYTES: 2 * 1024 * 1024
  }
})
vi.mock('@/composables/ui/media-query', () => ({ useMatchMedia: () => state.is_coarse }))
vi.mock('@/api/media', () => ({ cardImageUrl: (p) => `https://cdn/${p}` }))
vi.mock('@/sfx/bus', () => ({ emitSfx: emitSfxMock, emitHoverSfx: vi.fn() }))
vi.mock('@/utils/animations/button-tap', () => ({
  BUTTON_TAP_DURATION: 0.1,
  playButtonTap: playButtonTapMock
}))
vi.mock('gsap', () => ({ gsap: { fromTo: vi.fn(), to: vi.fn() } }))

// ── Stubs ────────────────────────────────────────────────────────────────────

const UiIconStub = defineComponent({
  name: 'UiIcon',
  props: ['src'],
  setup: (props) => () => h('i', { 'data-testid': 'icon', 'data-src': props.src })
})

const UiTooltipStub = defineComponent({
  name: 'UiTooltip',
  inheritAttrs: false,
  props: ['text', 'position', 'gap', 'theme', 'themeDark'],
  emits: ['click'],
  setup(_props, { slots, attrs, emit }) {
    return () => h('button', { ...attrs, onClick: (e) => emit('click', e) }, slots.default?.())
  }
})

const FaceOverlayStub = defineComponent({
  name: 'FaceOverlay',
  props: ['variant', 'error'],
  emits: ['browse', 'dismiss-error'],
  setup: (props) => () =>
    h('div', { 'data-testid': 'face-overlay-stub', 'data-variant': props.variant })
})

const ImageDropzoneStub = defineComponent({
  name: 'ImageDropzone',
  props: ['mode', 'active', 'disabled', 'error'],
  emits: ['browse', 'remove', 'dismiss-error'],
  setup: (props) => () =>
    h('div', { 'data-testid': 'image-dropzone-stub', 'data-mode': props.mode })
})

// ── Imports ──────────────────────────────────────────────────────────────────

import FaceImageLayer from '@/components/card/face-image-layer.vue'

// ── Helpers ──────────────────────────────────────────────────────────────────

function card(overrides = {}) {
  return { id: 5, deck_id: 1, front_text: 'Q', back_text: 'A', ...overrides }
}

function mountLayer(props = {}) {
  return shallowMount(FaceImageLayer, {
    props: { card: card(), side: 'front', root: null, ...props },
    global: {
      stubs: {
        UiIcon: UiIconStub,
        UiTooltip: UiTooltipStub,
        FaceOverlay: FaceOverlayStub,
        ImageDropzone: ImageDropzoneStub
      },
      directives: { sfx: {} }
    }
  })
}

function resetUploadState() {
  state.upload.dragging.value = false
  state.upload.file_error.value = ''
  state.upload.hovered.value = false
  state.upload.active.value = false
  state.upload.covered.value = false
  state.upload.pending.value = false
  state.upload.has_image.value = false
  state.upload.image_path.value = undefined
  state.upload.can_upload.value = true
}

beforeEach(() => {
  resetUploadState()
  state.is_coarse = ref(false)
  emitSfxMock.mockClear()
  playButtonTapMock.mockClear()
  Object.values(state.upload).forEach((v) => {
    if (typeof v === 'function' && 'mockClear' in v) v.mockClear()
  })
})

afterEach(() => {
  state.upload.dragging.value = false
})

// ── Tests ────────────────────────────────────────────────────────────────────

describe('FaceImageLayer — loading scrim', () => {
  test('renders the loading overlay while pending', () => {
    state.upload.pending.value = true
    const wrapper = mountLayer()
    expect(wrapper.find('[data-testid="face-image-layer__loading"]').exists()).toBe(true)
  })

  test('hides the loading overlay when not pending', () => {
    const wrapper = mountLayer()
    expect(wrapper.find('[data-testid="face-image-layer__loading"]').exists()).toBe(false)
  })
})

describe('FaceImageLayer — add button gating', () => {
  test('shows the add button on an empty, persisted, non-disabled face on a fine pointer', () => {
    const wrapper = mountLayer()
    expect(wrapper.find('[data-testid="face-image-layer__add"]').exists()).toBe(true)
  })

  test('hides the add button when the face already has an image', () => {
    state.upload.has_image.value = true
    const wrapper = mountLayer()
    expect(wrapper.find('[data-testid="face-image-layer__add"]').exists()).toBe(false)
  })

  test('hides the add button on a temp card that cannot upload yet', () => {
    state.upload.can_upload.value = false
    const wrapper = mountLayer()
    expect(wrapper.find('[data-testid="face-image-layer__add"]').exists()).toBe(false)
  })

  test('hides the add button when disabled', () => {
    const wrapper = mountLayer({ disabled: true })
    expect(wrapper.find('[data-testid="face-image-layer__add"]').exists()).toBe(false)
  })

  test('hides the add button while dragging', () => {
    state.upload.dragging.value = true
    const wrapper = mountLayer()
    expect(wrapper.find('[data-testid="face-image-layer__add"]').exists()).toBe(false)
  })

  test('hides the add button on a coarse (touch) pointer [obligation]', () => {
    state.is_coarse = ref(true)
    const wrapper = mountLayer()
    expect(wrapper.find('[data-testid="face-image-layer__add"]').exists()).toBe(false)
  })

  test('clicking the add button opens the picker and plays the tap animation', async () => {
    const wrapper = mountLayer()
    await wrapper.find('[data-testid="face-image-layer__add"]').trigger('click')
    expect(state.upload.openPicker).toHaveBeenCalled()
  })
})

describe('FaceImageLayer — empty-face overlay', () => {
  test('renders the full FaceOverlay when a file error is present, even with no image', () => {
    state.upload.file_error.value = 'invalid-type'
    const wrapper = mountLayer()
    const overlay = wrapper.findComponent(FaceOverlayStub)
    expect(overlay.exists()).toBe(true)
    expect(overlay.props('variant')).toBe('full')
  })

  test('renders the full FaceOverlay while dragging over an empty, uploadable face', () => {
    state.upload.dragging.value = true
    const wrapper = mountLayer()
    expect(wrapper.findComponent(FaceOverlayStub).exists()).toBe(true)
  })

  test('does not render the overlay when the face already has an image', () => {
    state.upload.has_image.value = true
    state.upload.dragging.value = true
    const wrapper = mountLayer()
    expect(wrapper.findComponent(FaceOverlayStub).exists()).toBe(false)
  })

  test('does not render the overlay on an empty, idle, error-free face', () => {
    const wrapper = mountLayer()
    expect(wrapper.findComponent(FaceOverlayStub).exists()).toBe(false)
  })
})

describe('FaceImageLayer — image dropzone (corners mode)', () => {
  test('renders the corners dropzone for a behind-layout image', () => {
    state.upload.has_image.value = true
    const wrapper = mountLayer({ attributes: { image_layout: 'behind' } })
    const dropzone = wrapper.findComponent(ImageDropzoneStub)
    expect(dropzone.exists()).toBe(true)
    expect(dropzone.props('mode')).toBe('corners')
  })

  test('does not render the corners dropzone for an above-layout image (region mode instead)', () => {
    state.upload.has_image.value = true
    const wrapper = mountLayer({ attributes: { image_layout: 'above' } })
    expect(wrapper.findComponent(ImageDropzoneStub).exists()).toBe(false)
  })

  test('does not render the corners dropzone when disabled', () => {
    state.upload.has_image.value = true
    const wrapper = mountLayer({ attributes: { image_layout: 'behind' }, disabled: true })
    expect(wrapper.findComponent(ImageDropzoneStub).exists()).toBe(false)
  })
})

describe('FaceImageLayer — defineExpose surface', () => {
  test('exposes the upload/overlay controls the card and its host editors read', () => {
    const wrapper = mountLayer()
    for (const key of [
      'active',
      'dragging',
      'pending',
      'covered',
      'region_dropzone',
      'openPicker',
      'onRemove',
      'onDismissError',
      'onRegionPointerEnter',
      'onPointerLeave'
    ]) {
      expect(wrapper.vm[key]).toBeDefined()
    }
  })

  test('image_url resolves from image_path via cardImageUrl', () => {
    state.upload.image_path.value = 'cards/f.png'
    const wrapper = mountLayer()
    expect(wrapper.vm.image_url).toBe('https://cdn/cards/f.png')
  })

  test('image_url is undefined when there is no image_path', () => {
    const wrapper = mountLayer()
    expect(wrapper.vm.image_url).toBeUndefined()
  })

  test('region_dropzone is true for a non-behind layout with an image, not disabled', () => {
    state.upload.has_image.value = true
    const wrapper = mountLayer({ attributes: { image_layout: 'above' } })
    expect(wrapper.vm.region_dropzone).toBe(true)
  })

  test('region_dropzone is false for a behind layout even with an image', () => {
    state.upload.has_image.value = true
    const wrapper = mountLayer({ attributes: { image_layout: 'behind' } })
    expect(wrapper.vm.region_dropzone).toBe(false)
  })

  test('region_dropzone is false when disabled', () => {
    state.upload.has_image.value = true
    const wrapper = mountLayer({ attributes: { image_layout: 'above' }, disabled: true })
    expect(wrapper.vm.region_dropzone).toBe(false)
  })

  test('card_sfx plays a hover chime for a corners (behind) image', () => {
    state.upload.has_image.value = true
    const wrapper = mountLayer({ attributes: { image_layout: 'behind' } })
    expect(wrapper.vm.card_sfx).toEqual({ hover: 'tap_05' })
  })

  test('card_sfx is undefined for a region (non-behind) image, so the region dropzone owns the hover chime', () => {
    state.upload.has_image.value = true
    const wrapper = mountLayer({ attributes: { image_layout: 'above' } })
    expect(wrapper.vm.card_sfx).toBeUndefined()
  })

  test('error_message maps invalid-type to its i18n string', () => {
    state.upload.file_error.value = 'invalid-type'
    const wrapper = mountLayer()
    expect(wrapper.vm.error_message.length).toBeGreaterThan(0)
  })

  test('error_message maps too-large to its i18n string with the size limit', () => {
    state.upload.file_error.value = 'too-large'
    const wrapper = mountLayer()
    expect(wrapper.vm.error_message.length).toBeGreaterThan(0)
  })

  test('error_message is empty when there is no file_error', () => {
    const wrapper = mountLayer()
    expect(wrapper.vm.error_message).toBe('')
  })

  test('the hidden file input change event reaches onFileChange', async () => {
    const wrapper = mountLayer()
    await wrapper.find('input[type="file"]').trigger('change')
    expect(state.upload.onFileChange).toHaveBeenCalled()
  })

  test('onRegionPointerEnter plays the hover chime and calls onPointerEnter', () => {
    const wrapper = mountLayer()
    wrapper.vm.onRegionPointerEnter()
    expect(emitSfxMock).toHaveBeenCalledWith('tap_05')
    expect(state.upload.onPointerEnter).toHaveBeenCalled()
  })
})

describe('FaceImageLayer — root listener wiring [obligation]', () => {
  test('attaches drag/pointer listeners to the passed-in root element', async () => {
    const root = document.createElement('div')
    document.body.appendChild(root)

    mountLayer({ root })
    await nextTick()

    root.dispatchEvent(new Event('dragenter', { bubbles: true }))
    expect(state.upload.onDragEnter).toHaveBeenCalled()

    root.dispatchEvent(new Event('drop', { bubbles: true }))
    expect(state.upload.onDrop).toHaveBeenCalled()

    root.remove()
  })

  test('an empty (no-image) card root pointerenter reaches onPointerEnter (card-wide hover)', async () => {
    const root = document.createElement('div')
    document.body.appendChild(root)

    mountLayer({ root })
    await nextTick()

    root.dispatchEvent(new Event('pointerenter', { bubbles: true }))
    expect(state.upload.onPointerEnter).toHaveBeenCalled()

    root.remove()
  })

  test('an empty (no-image) card root pointerleave reaches onPointerLeave (card-wide hover)', async () => {
    const root = document.createElement('div')
    document.body.appendChild(root)

    mountLayer({ root })
    await nextTick()

    root.dispatchEvent(new Event('pointerleave', { bubbles: true }))
    expect(state.upload.onPointerLeave).toHaveBeenCalled()

    root.remove()
  })

  test('a region-dropzone card root pointerleave is skipped (hover scoped to the image region instead)', async () => {
    state.upload.has_image.value = true
    const root = document.createElement('div')
    document.body.appendChild(root)

    mountLayer({ root, attributes: { image_layout: 'above' } })
    await nextTick()

    root.dispatchEvent(new Event('pointerleave', { bubbles: true }))
    expect(state.upload.onPointerLeave).not.toHaveBeenCalled()

    root.remove()
  })

  test('a region-dropzone card root pointerenter is skipped (hover scoped to the image region instead)', async () => {
    state.upload.has_image.value = true
    const root = document.createElement('div')
    document.body.appendChild(root)

    mountLayer({ root, attributes: { image_layout: 'above' } })
    await nextTick()

    root.dispatchEvent(new Event('pointerenter', { bubbles: true }))
    expect(state.upload.onPointerEnter).not.toHaveBeenCalled()

    root.remove()
  })

  test('detaches listeners from the old root when root changes', async () => {
    const first_root = document.createElement('div')
    const second_root = document.createElement('div')
    document.body.append(first_root, second_root)

    const wrapper = mountLayer({ root: first_root })
    await nextTick()
    await wrapper.setProps({ root: second_root })
    await nextTick()

    first_root.dispatchEvent(new Event('dragenter', { bubbles: true }))
    expect(state.upload.onDragEnter).not.toHaveBeenCalled()

    second_root.dispatchEvent(new Event('dragenter', { bubbles: true }))
    expect(state.upload.onDragEnter).toHaveBeenCalled()

    first_root.remove()
    second_root.remove()
  })
})
