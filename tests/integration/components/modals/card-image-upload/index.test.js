import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount, flushPromises } from '@vue/test-utils'
import { h } from 'vue'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { emitSfxMock } = vi.hoisted(() => ({ emitSfxMock: vi.fn() }))

vi.mock('@/sfx/bus', () => ({
  emitSfx: emitSfxMock,
  emitHoverSfx: vi.fn()
}))

vi.mock('@/utils/animations/button-tap', () => ({
  playButtonTap: vi.fn(),
  BUTTON_TAP_DURATION: 0.1
}))

// MobileSheet stub: renders the default slot and exposes a close button so the
// header's @close path can be exercised.
vi.mock('@/components/layout-kit/modal/mobile-sheet.vue', async () => {
  const { defineComponent: dc, h: hh } = await import('vue')
  return {
    default: dc({
      name: 'MobileSheet',
      inheritAttrs: false,
      emits: ['close'],
      setup(_p, { slots, emit }) {
        return () =>
          hh('div', { 'data-testid': 'mobile-sheet-stub' }, [
            hh('button', {
              'data-testid': 'mobile-sheet-stub__close',
              onClick: () => emit('close')
            }),
            slots.default?.()
          ])
      }
    })
  }
})

// Dropzone stub: controllable via triggerUpdate helper. Captures props for
// assertions and exposes update:modelValue so we can simulate user picking a file.
const dropzone_instances = []

vi.mock('@/components/modals/card-image-upload/dropzone.vue', async () => {
  const { defineComponent: dc, h: hh } = await import('vue')
  return {
    default: dc({
      name: 'Dropzone',
      inheritAttrs: false,
      props: ['modelValue', 'maxBytes', 'max_bytes', 'existingImage', 'existing_image'],
      emits: ['update:modelValue'],
      setup(props, { attrs, emit }) {
        dropzone_instances.push({ props, emit, attrs })
        return () =>
          hh('div', {
            ...attrs,
            'data-testid': attrs['data-testid'] ?? 'dropzone-stub'
          })
      }
    })
  }
})

// UiTooltip: forward attrs (including disabled) onto the rendered element so
// button disabled state propagates correctly through the UiButton > UiTooltip chain.
vi.mock('@/components/ui-kit/tooltip.vue', async () => {
  const { defineComponent: dc, h: hh } = await import('vue')
  return {
    default: dc({
      name: 'UiTooltip',
      inheritAttrs: false,
      props: [
        'text',
        'element',
        'suppress',
        'gap',
        'position',
        'fallback_placements',
        'static_on_mobile'
      ],
      setup(props, { slots, attrs }) {
        const tag = props.element ?? 'div'
        return () => hh(tag, { 'data-testid': 'ui-tooltip-stub', ...attrs }, slots.default?.())
      }
    })
  }
})

import CardImageUpload from '@/components/modals/card-image-upload/index.vue'

// ── Helpers ────────────────────────────────────────────────────────────────────

function mountModal({ close = vi.fn(), target = 'faces', ...rest } = {}) {
  dropzone_instances.length = 0
  const wrapper = mount(CardImageUpload, {
    props: { close, target, ...rest },
    global: { directives: { sfx: {} } }
  })
  return { wrapper, close }
}

// Simulate a dropzone reporting a change by emitting update:modelValue.
async function triggerDropzoneUpdate(index, value) {
  dropzone_instances[index]?.emit('update:modelValue', value)
  await flushPromises()
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('CardImageUpload modal', () => {
  beforeEach(() => {
    emitSfxMock.mockReset()
    dropzone_instances.length = 0
  })

  // ── Layout: faces target ──────────────────────────────────────────────────

  test('target=faces renders __faces, __front, __back but not __cover', () => {
    const { wrapper } = mountModal({ target: 'faces' })

    expect(wrapper.find('[data-testid="card-image-upload__faces"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="card-image-upload__front"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="card-image-upload__back"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="card-image-upload__cover"]').exists()).toBe(false)
  })

  test('target=faces renders two dropzone stubs', () => {
    const { wrapper } = mountModal({ target: 'faces' })

    const dropzones = wrapper.findAll('[data-testid="dropzone-stub"]')
    expect(dropzones).toHaveLength(2)
  })

  // ── Layout: cover target ──────────────────────────────────────────────────

  test('target=cover renders __cover but not __faces', () => {
    const { wrapper } = mountModal({ target: 'cover' })

    expect(wrapper.find('[data-testid="card-image-upload__cover"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="card-image-upload__faces"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="card-image-upload__front"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="card-image-upload__back"]').exists()).toBe(false)
  })

  test('target=cover mounts exactly one dropzone instance', () => {
    mountModal({ target: 'cover' })

    // The cover dropzone receives data-testid="card-image-upload__cover" via
    // attrs, so we count instances rather than query by the fallback testid.
    expect(dropzone_instances).toHaveLength(1)
  })

  // ── Layout: common elements ────────────────────────────────────────────────

  test('renders __body, __picker, __restrictions, __actions, __cancel, __confirm', () => {
    const { wrapper } = mountModal()

    expect(wrapper.find('[data-testid="card-image-upload__body"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="card-image-upload__picker"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="card-image-upload__restrictions"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="card-image-upload__actions"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="card-image-upload__cancel"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="card-image-upload__confirm"]').exists()).toBe(true)
  })

  // ── Confirm disabled state ────────────────────────────────────────────────

  test('confirm is disabled when no dropzone has reported a change', () => {
    const { wrapper } = mountModal()

    expect(wrapper.find('[data-testid="card-image-upload__confirm"]').element.disabled).toBe(true)
  })

  test('confirm is enabled after front dropzone reports a File (faces)', async () => {
    const { wrapper } = mountModal({ target: 'faces' })
    const file = new File(['x'], 'photo.png', { type: 'image/png' })

    await triggerDropzoneUpdate(0, file)

    expect(wrapper.find('[data-testid="card-image-upload__confirm"]').element.disabled).toBe(false)
  })

  test('confirm is enabled after back dropzone reports a change (faces)', async () => {
    const { wrapper } = mountModal({ target: 'faces' })

    await triggerDropzoneUpdate(1, null)

    expect(wrapper.find('[data-testid="card-image-upload__confirm"]').element.disabled).toBe(false)
  })

  test('confirm is enabled after cover dropzone reports a File', async () => {
    const { wrapper } = mountModal({ target: 'cover' })
    const file = new File(['x'], 'photo.png', { type: 'image/png' })

    await triggerDropzoneUpdate(0, file)

    expect(wrapper.find('[data-testid="card-image-upload__confirm"]').element.disabled).toBe(false)
  })

  // ── Confirm calls close with response ────────────────────────────────────

  test('confirming in faces mode calls close({ target, front, back })', async () => {
    const { wrapper, close } = mountModal({ target: 'faces' })
    const front_file = new File(['x'], 'front.png', { type: 'image/png' })

    await triggerDropzoneUpdate(0, front_file)
    await triggerDropzoneUpdate(1, null)
    await wrapper.find('[data-testid="card-image-upload__confirm"]').trigger('click')

    expect(close).toHaveBeenCalledWith({
      target: 'faces',
      front: front_file,
      back: null
    })
  })

  test('confirming in cover mode calls close({ target: cover, image })', async () => {
    const { wrapper, close } = mountModal({ target: 'cover' })
    const file = new File(['x'], 'cover.png', { type: 'image/png' })

    await triggerDropzoneUpdate(0, file)
    await wrapper.find('[data-testid="card-image-upload__confirm"]').trigger('click')

    expect(close).toHaveBeenCalledWith({ target: 'cover', image: file })
  })

  // ── Cancel / sheet close ──────────────────────────────────────────────────

  test('clicking cancel calls close() with no args', async () => {
    const { wrapper, close } = mountModal()

    await wrapper.find('[data-testid="card-image-upload__cancel"]').trigger('click')

    expect(close).toHaveBeenCalledWith()
    expect(close).toHaveBeenCalledTimes(1)
  })

  test('mobile-sheet @close event calls close() with no args', async () => {
    const { wrapper, close } = mountModal()

    await wrapper.find('[data-testid="mobile-sheet-stub__close"]').trigger('click')

    expect(close).toHaveBeenCalledWith()
    expect(close).toHaveBeenCalledTimes(1)
  })

  // ── Existing image props forwarded ────────────────────────────────────────

  test('front_image prop is forwarded to the first dropzone (faces)', () => {
    const url = 'https://example.com/front.png'
    mountModal({ target: 'faces', front_image: url })

    expect(dropzone_instances[0]?.props.existing_image).toBe(url)
  })

  test('back_image prop is forwarded to the second dropzone (faces)', () => {
    const url = 'https://example.com/back.png'
    mountModal({ target: 'faces', back_image: url })

    expect(dropzone_instances[1]?.props.existing_image).toBe(url)
  })

  test('cover_image prop is forwarded to the cover dropzone', () => {
    const url = 'https://example.com/cover.png'
    mountModal({ target: 'cover', cover_image: url })

    expect(dropzone_instances[0]?.props.existing_image).toBe(url)
  })
})
