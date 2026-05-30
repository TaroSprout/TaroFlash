import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount, flushPromises } from '@vue/test-utils'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { emitSfxMock } = vi.hoisted(() => ({ emitSfxMock: vi.fn() }))

vi.mock('@/sfx/bus', () => ({
  emitSfx: emitSfxMock,
  emitHoverSfx: vi.fn()
}))

// MobileSheet stub: renders the default slot (the modal body) and exposes a
// close button so the header's @close path can be exercised.
vi.mock('@/components/layout-kit/modal/mobile-sheet.vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    default: defineComponent({
      name: 'MobileSheet',
      emits: ['close'],
      setup(_p, { slots, emit }) {
        return () =>
          h('div', { 'data-testid': 'mobile-sheet-stub' }, [
            h('button', {
              'data-testid': 'mobile-sheet-stub__close',
              onClick: () => emit('close')
            }),
            slots.default?.()
          ])
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

import ImageUpload from '@/components/modals/image-upload.vue'
import UiTooltip from '@/components/ui-kit/tooltip.vue'

// ── Helpers ─────────────────────────────────────────────────────────────────────

function mountModal({ close = vi.fn(), max_bytes } = {}) {
  const wrapper = mount(ImageUpload, { props: { close, max_bytes } })
  return { wrapper, close }
}

function makeImageFile(name = 'photo.png') {
  return new File(['content'], name, { type: 'image/png' })
}

function makeTextFile(name = 'doc.txt') {
  return new File(['content'], name, { type: 'text/plain' })
}

function makeFile(type, name = 'file') {
  return new File(['content'], name, { type })
}

function makeSizedImageFile(bytes) {
  return new File([new Uint8Array(bytes)], 'photo.png', { type: 'image/png' })
}

async function selectFile(wrapper, file) {
  const input = wrapper.find('input[type="file"]')
  Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
  await input.trigger('change')
  await flushPromises()
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ImageUpload modal', () => {
  beforeEach(() => {
    emitSfxMock.mockReset()
  })

  describe('layout', () => {
    test('renders the dropzone, cancel, and confirm buttons', () => {
      const { wrapper } = mountModal()

      expect(wrapper.find('[data-testid="image-upload__dropzone"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="image-upload__cancel"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="image-upload__confirm"]').exists()).toBe(true)
    })

    test('shows the prompt and disables confirm before a file is chosen', () => {
      const { wrapper } = mountModal()

      expect(wrapper.find('[data-testid="image-upload__prompt"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="image-upload__preview"]').exists()).toBe(false)
      expect(
        wrapper.find('[data-testid="image-upload__confirm"]').attributes('disabled')
      ).toBeDefined()
    })

    test('shows the configured size limit and folds the formats into a tooltip', () => {
      const { wrapper } = mountModal({ max_bytes: 2 * 1024 * 1024 })

      const restrictions = wrapper.find('[data-testid="image-upload__restrictions"]')
      expect(restrictions.text()).toContain('2 MB')
      expect(restrictions.text()).not.toContain('PNG')

      const formats_tooltip = wrapper
        .findAllComponents(UiTooltip)
        .find((c) => c.props('text')?.includes('PNG'))
      expect(formats_tooltip).toBeTruthy()
      expect(formats_tooltip.props('text')).toContain('GIF')
    })

    test('clicking the dropzone opens the file picker', async () => {
      const { wrapper } = mountModal()
      const input = wrapper.find('input[type="file"]').element
      const clickSpy = vi.spyOn(input, 'click')

      await wrapper.find('[data-testid="image-upload__dropzone"]').trigger('click')

      expect(clickSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('file selection', () => {
    test('shows a preview and enables confirm after an image is chosen', async () => {
      const { wrapper } = mountModal()

      await selectFile(wrapper, makeImageFile())

      const preview = wrapper.find('[data-testid="image-upload__preview"]')
      expect(preview.exists()).toBe(true)
      expect(preview.attributes('src')).toBe(FAKE_PREVIEW)
      expect(wrapper.find('[data-testid="image-upload__prompt"]').exists()).toBe(false)
      expect(
        wrapper.find('[data-testid="image-upload__confirm"]').attributes('disabled')
      ).toBeUndefined()
    })

    test('marks the dropzone as having a preview once an image is chosen', async () => {
      const { wrapper } = mountModal()

      await selectFile(wrapper, makeImageFile())

      expect(
        wrapper.find('[data-testid="image-upload__dropzone"]').attributes('data-has-preview')
      ).toBe('true')
    })

    test('ignores non-image files', async () => {
      const { wrapper } = mountModal()

      await selectFile(wrapper, makeTextFile())

      expect(wrapper.find('[data-testid="image-upload__preview"]').exists()).toBe(false)
      expect(
        wrapper.find('[data-testid="image-upload__confirm"]').attributes('disabled')
      ).toBeDefined()
    })
  })

  describe('accepted types', () => {
    test('the file input only accepts png, jpeg, webp, and gif', () => {
      const { wrapper } = mountModal()

      expect(wrapper.find('input[type="file"]').attributes('accept')).toBe(
        'image/png,image/jpeg,image/webp,image/gif'
      )
    })

    test.each(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])(
      'accepts %s',
      async (type) => {
        const { wrapper } = mountModal()

        await selectFile(wrapper, makeFile(type))

        expect(wrapper.find('[data-testid="image-upload__preview"]').exists()).toBe(true)
        expect(wrapper.find('[data-testid="image-upload__error"]').exists()).toBe(false)
      }
    )

    test.each(['image/svg+xml', 'image/bmp', 'image/tiff'])(
      'rejects %s and shows an error',
      async (type) => {
        const { wrapper } = mountModal()

        await selectFile(wrapper, makeFile(type))

        expect(wrapper.find('[data-testid="image-upload__preview"]').exists()).toBe(false)
        expect(wrapper.find('[data-testid="image-upload__error"]').exists()).toBe(true)
        expect(
          wrapper.find('[data-testid="image-upload__confirm"]').attributes('disabled')
        ).toBeDefined()
      }
    )

    test('clears the error once a valid image is chosen', async () => {
      const { wrapper } = mountModal()

      await selectFile(wrapper, makeFile('image/svg+xml'))
      expect(wrapper.find('[data-testid="image-upload__error"]').exists()).toBe(true)

      await selectFile(wrapper, makeImageFile())
      expect(wrapper.find('[data-testid="image-upload__error"]').exists()).toBe(false)
    })

    test('an invalid file flags the dropzone and replaces the prompt with the error', async () => {
      const { wrapper } = mountModal()

      await selectFile(wrapper, makeFile('image/svg+xml'))

      const dropzone = wrapper.find('[data-testid="image-upload__dropzone"]')
      expect(dropzone.attributes('data-error')).toBe('true')
      expect(wrapper.find('[data-testid="image-upload__prompt"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="image-upload__error"]').exists()).toBe(true)
    })
  })

  describe('size limit', () => {
    test('accepts a file at or under max_bytes', async () => {
      const { wrapper } = mountModal({ max_bytes: 1000 })

      await selectFile(wrapper, makeSizedImageFile(1000))

      expect(wrapper.find('[data-testid="image-upload__preview"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="image-upload__error"]').exists()).toBe(false)
    })

    test('rejects a file larger than max_bytes and disables confirm', async () => {
      const { wrapper } = mountModal({ max_bytes: 1000 })

      await selectFile(wrapper, makeSizedImageFile(1001))

      expect(wrapper.find('[data-testid="image-upload__preview"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="image-upload__error"]').exists()).toBe(true)
      expect(
        wrapper.find('[data-testid="image-upload__confirm"]').attributes('disabled')
      ).toBeDefined()
    })

    test('the too-large error names the configured limit', async () => {
      const { wrapper } = mountModal({ max_bytes: 2 * 1024 * 1024 })

      await selectFile(wrapper, makeSizedImageFile(2 * 1024 * 1024 + 1))

      expect(wrapper.find('[data-testid="image-upload__error"]').text()).toContain('2 MB')
    })
  })

  describe('confirm and dismiss', () => {
    test('confirm closes with the chosen File', async () => {
      const { wrapper, close } = mountModal()
      const file = makeImageFile()

      await selectFile(wrapper, file)
      await wrapper.find('[data-testid="image-upload__confirm"]').trigger('click')

      expect(close).toHaveBeenCalledTimes(1)
      expect(close).toHaveBeenCalledWith(file)
    })

    test('confirm is a no-op when no file is chosen', async () => {
      const { wrapper, close } = mountModal()

      await wrapper.find('[data-testid="image-upload__confirm"]').trigger('click')

      expect(close).not.toHaveBeenCalled()
    })

    test('cancel closes without a file', async () => {
      const { wrapper, close } = mountModal()

      await wrapper.find('[data-testid="image-upload__cancel"]').trigger('click')

      expect(close).toHaveBeenCalledTimes(1)
      expect(close).toHaveBeenCalledWith()
    })

    test('the mobile-sheet close button closes without a file', async () => {
      const { wrapper, close } = mountModal()

      await wrapper.find('[data-testid="mobile-sheet-stub__close"]').trigger('click')

      expect(close).toHaveBeenCalledWith()
    })
  })

  describe('drag state', () => {
    test('data-dragging tracks dragenter / dragleave and resets on drop', async () => {
      const { wrapper } = mountModal()
      const dropzone = wrapper.find('[data-testid="image-upload__dropzone"]')

      expect(dropzone.attributes('data-dragging')).toBe('false')

      await dropzone.trigger('dragenter')
      expect(dropzone.attributes('data-dragging')).toBe('true')

      await dropzone.trigger('dragleave')
      expect(dropzone.attributes('data-dragging')).toBe('false')

      await dropzone.trigger('dragenter')
      await dropzone.trigger('drop')
      expect(dropzone.attributes('data-dragging')).toBe('false')
    })
  })
})
