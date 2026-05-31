import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, useAttrs } from 'vue'

// Card stub: render the default + editor slots and forward attrs so the
// data-active flag, drag listeners, and pointer listeners reach a real element.
const CardStub = defineComponent({
  name: 'Card',
  inheritAttrs: false,
  props: ['side', 'mode', 'size', 'error'],
  setup(_props, { slots }) {
    const attrs = useAttrs()
    return () =>
      h('div', { ...attrs, 'data-testid': 'card-root' }, [slots.default?.(), slots.editor?.()])
  }
})

// UiButton/UiIcon stubs: real elements forwarding attrs so data-testid is
// queryable and native clicks fire the bound handlers.
const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  setup(_p, { slots }) {
    const attrs = useAttrs()
    return () => h('button', attrs, slots.default?.())
  }
})

const UiIconStub = defineComponent({ name: 'UiIcon', props: ['src'], setup: () => () => h('i') })

const mocks = vi.hoisted(() => ({
  setFaceImageMock: vi.fn(),
  toastErrorMock: vi.fn(),
  emitSfxMock: vi.fn()
}))

vi.mock('@/composables/toast', () => ({ useToast: () => ({ error: mocks.toastErrorMock }) }))
vi.mock('@/sfx/bus', () => ({ emitSfx: mocks.emitSfxMock, emitHoverSfx: vi.fn() }))

import CardFaceUploader from '@/views/deck/card-editor/card-face-uploader.vue'

function makeCard(overrides = {}) {
  return { id: 1, deck_id: 10, front_text: 'Q', back_text: 'A', rank: 1000, ...overrides }
}

function mount(props = {}) {
  const { card, ...rest } = props
  return shallowMount(CardFaceUploader, {
    props: { side: 'front', card: makeCard(card), ...rest },
    global: {
      stubs: { Card: CardStub, UiButton: UiButtonStub, UiIcon: UiIconStub },
      provide: { 'card-editor': { setFaceImage: mocks.setFaceImageMock } }
    }
  })
}

function pngFile() {
  return new File(['x'], 'a.png', { type: 'image/png' })
}

function dropImage(wrapper, file) {
  const dataTransfer = new DataTransfer()
  dataTransfer.items.add(file)
  return wrapper.find('[data-testid="card-root"]').trigger('drop', { dataTransfer })
}

beforeEach(() => {
  mocks.setFaceImageMock.mockReset()
  mocks.setFaceImageMock.mockResolvedValue(undefined)
  mocks.toastErrorMock.mockReset()
  mocks.emitSfxMock.mockReset()
})

describe('CardFaceUploader', () => {
  // ── Empty face ──────────────────────────────────────────────────────────────

  test('shows the add-image button on an empty, persisted face', () => {
    const wrapper = mount({ card: { id: 5 } })
    expect(wrapper.find('[data-testid="card-face-uploader__add"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="card-face-uploader__scrim"]').exists()).toBe(false)
  })

  test('hides the add-image button on a temp card (id <= 0)', () => {
    const wrapper = mount({ card: { id: 0 } })
    expect(wrapper.find('[data-testid="card-face-uploader__add"]').exists()).toBe(false)
  })

  test('hides controls when disabled (selection mode)', () => {
    const wrapper = mount({ card: { id: 5 }, disabled: true })
    expect(wrapper.find('[data-testid="card-face-uploader__add"]').exists()).toBe(false)
  })

  // ── Image face ────────────────────────────────────────────────────────────────

  test('shows the remove button and replace scrim on a face that has an image', () => {
    const wrapper = mount({ card: { front_image_path: 'cards/f.png' } })
    expect(wrapper.find('[data-testid="card-face-uploader__remove"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="card-face-uploader__scrim"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="card-face-uploader__add"]').exists()).toBe(false)
  })

  // ── Activation (hover / drag) ─────────────────────────────────────────────────

  test('marks the card active on hover and clears it on leave', async () => {
    const wrapper = mount({ card: { front_image_path: 'cards/f.png' } })
    const root = wrapper.find('[data-testid="card-root"]')
    expect(root.attributes('data-active')).toBeUndefined()

    await root.trigger('pointerenter')
    expect(root.attributes('data-active')).toBe('true')

    await root.trigger('pointerleave')
    expect(root.attributes('data-active')).toBeUndefined()
  })

  test('marks the card active while a file is dragged over it', async () => {
    const wrapper = mount({ card: { id: 5 } })
    const root = wrapper.find('[data-testid="card-root"]')
    await root.trigger('dragenter')
    expect(root.attributes('data-active')).toBe('true')
    expect(wrapper.find('[data-testid="card-face-uploader__empty-overlay"]').exists()).toBe(true)
  })

  // ── Upload / replace / remove ───────────────────────────────────────────────

  test('uploads a valid dropped file via setFaceImage', async () => {
    const wrapper = mount({ card: { id: 5 }, side: 'back' })
    const file = pngFile()
    await dropImage(wrapper, file)
    await flushPromises()

    expect(mocks.setFaceImageMock).toHaveBeenCalledWith(5, 'back', file)
    expect(mocks.emitSfxMock).toHaveBeenCalledWith('ui.snappy_button_2', { blocking: true })
  })

  test('does not upload a temp card even on drop', async () => {
    const wrapper = mount({ card: { id: 0 } })
    await dropImage(wrapper, pngFile())
    await flushPromises()

    expect(mocks.setFaceImageMock).not.toHaveBeenCalled()
  })

  test('shows an inline error and skips upload for an invalid file', async () => {
    const wrapper = mount({ card: { id: 5 } })
    await dropImage(wrapper, new File(['x'], 'a.txt', { type: 'text/plain' }))
    await flushPromises()

    expect(mocks.setFaceImageMock).not.toHaveBeenCalled()
    expect(mocks.emitSfxMock).toHaveBeenCalledWith('ui.digi_powerdown')
    const overlay = wrapper.find('[data-testid="card-face-uploader__empty-overlay"]')
    expect(overlay.exists()).toBe(true)
    expect(overlay.attributes('data-error')).toBe('true')
  })

  test('toasts when an upload fails', async () => {
    mocks.setFaceImageMock.mockRejectedValueOnce(new Error('boom'))
    const wrapper = mount({ card: { id: 5 } })
    await dropImage(wrapper, pngFile())
    await flushPromises()

    expect(mocks.toastErrorMock).toHaveBeenCalled()
  })

  test('removes the image via setFaceImage(null) when the remove button is clicked', async () => {
    const wrapper = mount({ card: { id: 5, front_image_path: 'cards/f.png' } })
    await wrapper.find('[data-testid="card-face-uploader__remove"]').trigger('click')
    await flushPromises()

    expect(mocks.setFaceImageMock).toHaveBeenCalledWith(5, 'front', null)
    expect(mocks.emitSfxMock).toHaveBeenCalledWith('ui.trash_crumple_short')
  })
})
