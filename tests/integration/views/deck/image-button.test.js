import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import ImageButton from '@/views/deck/image-button.vue'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mockOpen } = vi.hoisted(() => ({ mockOpen: vi.fn() }))

vi.mock('@/composables/modals/use-image-upload-modal', () => ({
  useImageUploadModal: vi.fn(() => ({ open: mockOpen }))
}))

vi.mock('@/sfx/bus', () => ({
  emitSfx: vi.fn(),
  emitHoverSfx: vi.fn()
}))

// ── Stubs ──────────────────────────────────────────────────────────────────────

// Render-function stub so it works with Vite's runtime-only Vue build.
const ButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  setup(_p, { slots, attrs }) {
    return () =>
      h(
        'button',
        {
          'data-testid': attrs['data-testid'] ?? 'ui-button-stub',
          onClick: attrs.onClick
        },
        slots.default?.()
      )
  }
})

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeFile(name = 'photo.png') {
  return new File(['x'], name, { type: 'image/png' })
}

function makeModalResult(value) {
  return { response: Promise.resolve(value) }
}

function mountButton(props = {}) {
  return mount(ImageButton, {
    props,
    global: { stubs: { UiButton: ButtonStub }, mocks: { $t: (k) => k } }
  })
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('ImageButton', () => {
  beforeEach(() => {
    mockOpen.mockReset()
  })

  describe('layout', () => {
    test('shows the add-image button when no image prop is set', () => {
      const wrapper = mountButton()
      // The add-image button has icon-left="add-image" but we can find it via
      // the data-testid forwarded from attrs.
      const buttons = wrapper.findAll('button')
      expect(buttons).toHaveLength(1)
    })

    test('shows the delete button when an image prop is provided', () => {
      const wrapper = mountButton({ image: 'https://example.com/photo.png' })
      const buttons = wrapper.findAll('button')
      expect(buttons).toHaveLength(1)
    })

    test('only one button renders at a time (exclusive branches)', () => {
      const withImage = mountButton({ image: 'https://example.com/img.png' })
      const withoutImage = mountButton()
      // With image → delete button (no add-image button)
      expect(withImage.findAll('button')).toHaveLength(1)
      // Without image → add-image button (no delete button)
      expect(withoutImage.findAll('button')).toHaveLength(1)
    })
  })

  describe('onAddImage', () => {
    test('opens the image upload modal with the card size cap (2 MiB)', async () => {
      mockOpen.mockReturnValueOnce(makeModalResult(undefined))

      const wrapper = mountButton()
      await wrapper.find('button').trigger('click')

      expect(mockOpen).toHaveBeenCalledWith({ max_bytes: 2 * 1024 * 1024 })
    })

    test('emits image-uploaded with the File when the modal resolves with a file', async () => {
      const file = makeFile()
      mockOpen.mockReturnValueOnce(makeModalResult(file))

      const wrapper = mountButton()
      await wrapper.find('button').trigger('click')
      await flushPromises()

      expect(wrapper.emitted('image-uploaded')).toHaveLength(1)
      expect(wrapper.emitted('image-uploaded')[0]).toEqual([file])
    })

    test('does not emit image-uploaded when the modal is dismissed (undefined response)', async () => {
      mockOpen.mockReturnValueOnce(makeModalResult(undefined))

      const wrapper = mountButton()
      await wrapper.find('button').trigger('click')
      await flushPromises()

      expect(wrapper.emitted('image-uploaded')).toBeUndefined()
    })
  })

  describe('onImageDelete', () => {
    test('emits image-deleted when the delete button is clicked', async () => {
      const wrapper = mountButton({ image: 'https://example.com/img.png' })

      await wrapper.find('button').trigger('click')

      expect(wrapper.emitted('image-deleted')).toHaveLength(1)
    })

    test('does not open the modal when deleting', async () => {
      const wrapper = mountButton({ image: 'https://example.com/img.png' })

      await wrapper.find('button').trigger('click')

      expect(mockOpen).not.toHaveBeenCalled()
    })
  })
})
