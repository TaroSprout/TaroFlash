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

// Card stub: render only the #front slot content (the dropzone button lives there).
vi.mock('@/components/card/index.vue', async () => {
  const { defineComponent: dc, h: hh } = await import('vue')
  return {
    default: dc({
      name: 'Card',
      inheritAttrs: false,
      setup(_p, { slots }) {
        return () => hh('div', { 'data-testid': 'card-stub' }, slots.front?.())
      }
    })
  }
})

// ── FileReader stub ────────────────────────────────────────────────────────────

const FAKE_PREVIEW = 'data:image/png;base64,fakepreview'

vi.stubGlobal(
  'FileReader',
  class {
    onerror = null
    onload = null
    readAsDataURL() {
      Promise.resolve().then(() => {
        this.onload?.({ target: { result: FAKE_PREVIEW } })
      })
    }
  }
)

import Dropzone from '@/components/modals/card-image-upload/dropzone.vue'

// ── Helpers ────────────────────────────────────────────────────────────────────

function mountDropzone({ max_bytes = 2 * 1024 * 1024, existing_image, modelValue } = {}) {
  const onUpdate = vi.fn()
  const wrapper = mount(Dropzone, {
    props: {
      max_bytes,
      existing_image,
      ...(modelValue !== undefined ? { modelValue } : {}),
      'onUpdate:modelValue': onUpdate
    },
    global: {
      directives: { sfx: {} }
    }
  })
  return { wrapper, onUpdate }
}

function makeFile(type = 'image/png', name = 'photo.png', size = 100) {
  return new File([new Uint8Array(size)], name, { type })
}

async function selectFile(wrapper, file) {
  const input = wrapper.find('input[type="file"]')
  Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
  await input.trigger('change')
  await flushPromises()
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('Dropzone', () => {
  beforeEach(() => {
    emitSfxMock.mockReset()
  })

  // ── Initial state ─────────────────────────────────────────────────────────

  test('renders the zone, prompt, and no preview or error initially', () => {
    const { wrapper } = mountDropzone()

    expect(wrapper.find('[data-testid="card-image-dropzone"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="card-image-dropzone__zone"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="card-image-dropzone__prompt"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="card-image-dropzone__preview"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="card-image-dropzone__error"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="card-image-dropzone__remove"]').exists()).toBe(false)
  })

  test('zone data-has-preview is false and data-error is false initially', () => {
    const { wrapper } = mountDropzone()
    const zone = wrapper.find('[data-testid="card-image-dropzone__zone"]')
    expect(zone.attributes('data-has-preview')).toBe('false')
    expect(zone.attributes('data-error')).toBe('false')
  })

  // ── existing_image prop ───────────────────────────────────────────────────

  test('preloads the preview img src when existing_image is provided', () => {
    const url = 'https://example.com/img.png'
    const { wrapper } = mountDropzone({ existing_image: url })

    const preview = wrapper.find('[data-testid="card-image-dropzone__preview"]')
    expect(preview.exists()).toBe(true)
    expect(preview.attributes('src')).toBe(url)
  })

  test('existing_image shows the remove button without emitting a result change', () => {
    const { wrapper, onUpdate } = mountDropzone({ existing_image: 'https://example.com/img.png' })

    expect(wrapper.find('[data-testid="card-image-dropzone__remove"]').exists()).toBe(true)
    expect(onUpdate).not.toHaveBeenCalled()
  })

  test('zone data-has-preview is true when existing_image is set', () => {
    const { wrapper } = mountDropzone({ existing_image: 'https://example.com/img.png' })
    expect(
      wrapper.find('[data-testid="card-image-dropzone__zone"]').attributes('data-has-preview')
    ).toBe('true')
  })

  // ── Picking a valid file ──────────────────────────────────────────────────

  test('picking a valid png shows preview and emits update:result with the File', async () => {
    const { wrapper, onUpdate } = mountDropzone()
    const file = makeFile('image/png')

    await selectFile(wrapper, file)

    const preview = wrapper.find('[data-testid="card-image-dropzone__preview"]')
    expect(preview.exists()).toBe(true)
    expect(preview.attributes('src')).toBe(FAKE_PREVIEW)
    expect(onUpdate).toHaveBeenCalledWith(file)
  })

  test('picking a valid file sets data-has-preview to true', async () => {
    const { wrapper } = mountDropzone()
    await selectFile(wrapper, makeFile('image/jpeg', 'photo.jpg'))

    expect(
      wrapper.find('[data-testid="card-image-dropzone__zone"]').attributes('data-has-preview')
    ).toBe('true')
  })

  test('picking a valid file plays the snappy_button_2 sfx', async () => {
    const { wrapper } = mountDropzone()
    await selectFile(wrapper, makeFile())

    expect(emitSfxMock).toHaveBeenCalledWith('ui.snappy_button_2')
  })

  test('accepts jpeg, webp, and gif file types', async () => {
    for (const type of ['image/jpeg', 'image/webp', 'image/gif']) {
      const { wrapper, onUpdate } = mountDropzone()
      await selectFile(wrapper, makeFile(type, `img.${type.split('/')[1]}`))
      expect(onUpdate).toHaveBeenCalled()
      wrapper.unmount()
    }
  })

  // ── Invalid file type ─────────────────────────────────────────────────────

  test('rejects a non-image file: shows error, does not emit a File result', async () => {
    const { wrapper, onUpdate } = mountDropzone()
    await selectFile(wrapper, makeFile('text/plain', 'doc.txt'))

    expect(wrapper.find('[data-testid="card-image-dropzone__error"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="card-image-dropzone__preview"]').exists()).toBe(false)
    // Should NOT have been called with a File — could be called with undefined from remove
    const fileCalls = (onUpdate.mock.calls ?? []).filter(([v]) => v instanceof File)
    expect(fileCalls).toHaveLength(0)
  })

  test('invalid type sets data-error to true on the zone', async () => {
    const { wrapper } = mountDropzone()
    await selectFile(wrapper, makeFile('application/pdf', 'doc.pdf'))

    expect(wrapper.find('[data-testid="card-image-dropzone__zone"]').attributes('data-error')).toBe(
      'true'
    )
  })

  // ── File too large ────────────────────────────────────────────────────────

  test('rejects a file that exceeds max_bytes: shows error overlay', async () => {
    const { wrapper, onUpdate } = mountDropzone({ max_bytes: 50 })
    await selectFile(wrapper, makeFile('image/png', 'big.png', 100))

    expect(wrapper.find('[data-testid="card-image-dropzone__error"]').exists()).toBe(true)
    const fileCalls = (onUpdate.mock.calls ?? []).filter(([v]) => v instanceof File)
    expect(fileCalls).toHaveLength(0)
  })

  // ── Remove button ─────────────────────────────────────────────────────────

  test('remove on a picked-but-no-existing face emits result = undefined', async () => {
    const { wrapper, onUpdate } = mountDropzone()
    await selectFile(wrapper, makeFile())
    onUpdate.mockClear()

    await wrapper.find('[data-testid="card-image-dropzone__remove"]').trigger('click')

    expect(onUpdate).toHaveBeenCalledWith(undefined)
  })

  test('remove on a face with existing_image emits result = null', async () => {
    const { wrapper, onUpdate } = mountDropzone({ existing_image: 'https://example.com/img.png' })
    onUpdate.mockClear()

    await wrapper.find('[data-testid="card-image-dropzone__remove"]').trigger('click')

    expect(onUpdate).toHaveBeenCalledWith(null)
  })

  test('remove plays the trash_crumple_short sfx', async () => {
    const { wrapper } = mountDropzone({ existing_image: 'https://example.com/img.png' })
    emitSfxMock.mockClear()

    await wrapper.find('[data-testid="card-image-dropzone__remove"]').trigger('click')

    expect(emitSfxMock).toHaveBeenCalledWith('ui.trash_crumple_short')
  })

  test('removing a picked file hides the preview and remove button', async () => {
    const { wrapper } = mountDropzone()
    await selectFile(wrapper, makeFile())

    await wrapper.find('[data-testid="card-image-dropzone__remove"]').trigger('click')

    expect(wrapper.find('[data-testid="card-image-dropzone__preview"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="card-image-dropzone__remove"]').exists()).toBe(false)
  })

  // ── Drag enter / leave ────────────────────────────────────────────────────

  test('dragenter sets data-dragging to true', async () => {
    const { wrapper } = mountDropzone()
    const zone = wrapper.find('[data-testid="card-image-dropzone__zone"]')

    await zone.trigger('dragenter')

    expect(zone.attributes('data-dragging')).toBe('true')
  })

  test('dragleave (after single dragenter) sets data-dragging back to false', async () => {
    const { wrapper } = mountDropzone()
    const zone = wrapper.find('[data-testid="card-image-dropzone__zone"]')

    await zone.trigger('dragenter')
    await zone.trigger('dragleave')

    expect(zone.attributes('data-dragging')).toBe('false')
  })
})
