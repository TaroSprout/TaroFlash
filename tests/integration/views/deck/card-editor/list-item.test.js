import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, ref, useAttrs } from 'vue'

// Stub UiButton to render its default slot so label text is inspectable,
// and forward attrs (including data-testid) for querying.
const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  setup(_p, { slots }) {
    const attrs = useAttrs()
    return () => h('button', attrs, slots.default?.())
  }
})

const mocks = vi.hoisted(() => ({
  prependCardMock: vi.fn(),
  appendCardMock: vi.fn(),
  onDeleteCardsMock: vi.fn(),
  onMoveCardsMock: vi.fn(),
  onSelectCardMock: vi.fn(),
  isCardSelectedMock: vi.fn(),
  setFaceImageMock: vi.fn(),
  cardImageModalOpenMock: vi.fn(),
  cardImageUrlMock: vi.fn(),
  toastErrorMock: vi.fn()
}))

vi.mock('@/composables/modals/use-card-image-upload-modal', () => ({
  useCardImageUploadModal: vi.fn(() => ({ open: mocks.cardImageModalOpenMock }))
}))

vi.mock('@/api/media', () => ({
  cardImageUrl: mocks.cardImageUrlMock
}))

vi.mock('@/composables/toast', () => ({
  useToast: vi.fn(() => ({ error: mocks.toastErrorMock }))
}))

vi.mock('@/sfx/bus', () => ({
  emitSfx: vi.fn(),
  emitHoverSfx: vi.fn()
}))

import ListItem from '@/views/deck/card-editor/list-item.vue'
import ItemOptions from '@/views/deck/card-editor/list-item-options.vue'

function makeCard(overrides = {}) {
  return {
    id: 1,
    deck_id: 10,
    front_text: 'Q',
    back_text: 'A',
    rank: 1000,
    ...overrides
  }
}

function makeProvide({ is_selecting = ref(false) } = {}) {
  return {
    'card-editor': {
      list: {
        appendCard: mocks.appendCardMock,
        prependCard: mocks.prependCardMock
      },
      selection: {
        is_selecting,
        isCardSelected: mocks.isCardSelectedMock
      },
      actions: {
        onDeleteCards: mocks.onDeleteCardsMock,
        onMoveCards: mocks.onMoveCardsMock,
        onSelectCard: mocks.onSelectCardMock
      },
      setFaceImage: mocks.setFaceImageMock
    }
  }
}

function mount({ card, index = 0, duplicate = false, is_selecting } = {}) {
  return shallowMount(ListItem, {
    props: { card: makeCard(card), index, duplicate },
    global: {
      stubs: { UiButton: UiButtonStub },
      provide: makeProvide({ is_selecting })
    }
  })
}

beforeEach(() => {
  mocks.prependCardMock.mockReset()
  mocks.appendCardMock.mockReset()
  mocks.onDeleteCardsMock.mockReset()
  mocks.onMoveCardsMock.mockReset()
  mocks.onSelectCardMock.mockReset()
  mocks.isCardSelectedMock.mockReset()
  mocks.isCardSelectedMock.mockReturnValue(false)
  mocks.setFaceImageMock.mockReset()
  mocks.setFaceImageMock.mockResolvedValue(undefined)
  mocks.cardImageModalOpenMock.mockReset()
  mocks.cardImageUrlMock.mockReset()
  mocks.cardImageUrlMock.mockImplementation((path) => `https://cdn.example.com/${path}`)
  mocks.toastErrorMock.mockReset()
})

describe('ListItem', () => {
  // ── Add-card buttons — label text ────────────────────────────────────────

  test('add-above button carries the localized "Add Card" label text', () => {
    const wrapper = mount()
    const btn = wrapper.find('[data-testid="card-list-item__add-above"]')
    expect(btn.exists()).toBe(true)
    expect(btn.text()).toContain('Add Card')
  })

  test('add-below button carries the localized "Add Card" label text', () => {
    const wrapper = mount()
    const btn = wrapper.find('[data-testid="card-list-item__add-below"]')
    expect(btn.exists()).toBe(true)
    expect(btn.text()).toContain('Add Card')
  })

  // ── Add-card buttons — click wiring ──────────────────────────────────────

  test('clicking add-above calls prependCard with the card id', async () => {
    const wrapper = mount({ card: { id: 7 } })
    await wrapper.find('[data-testid="card-list-item__add-above"]').trigger('click')
    expect(mocks.prependCardMock).toHaveBeenCalledWith(7)
  })

  test('clicking add-below calls appendCard with the card id', async () => {
    const wrapper = mount({ card: { id: 7 } })
    await wrapper.find('[data-testid="card-list-item__add-below"]').trigger('click')
    expect(mocks.appendCardMock).toHaveBeenCalledWith(7)
  })

  // ── Add-card buttons — hidden in selection mode ───────────────────────────

  test('add-above and add-below buttons are hidden when is_selecting is true', () => {
    const wrapper = mount({ is_selecting: ref(true) })
    expect(wrapper.find('[data-testid="card-list-item__add-above"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="card-list-item__add-below"]').exists()).toBe(false)
  })

  // ── Rendering ─────────────────────────────────────────────────────────────

  test('renders the card-list-item root with the correct data-id', () => {
    const wrapper = mount({ card: { id: 42 } })
    expect(wrapper.find('[data-testid="card-list-item"]').attributes('data-id')).toBe('42')
  })

  test('renders the index number in the reorder pill', () => {
    const wrapper = mount({ index: 3 })
    expect(wrapper.find('[data-testid="card-list-item__reorder"]').text()).toContain('4')
  })

  // ── upload_disabled forwarding ────────────────────────────────────────────

  test('ItemOptions receives upload-disabled=true when card.id <= 0 (temp card)', () => {
    const wrapper = mount({ card: { id: 0 } })
    // shallowMount auto-stubs ItemOptions; read the :upload-disabled binding
    // via the stub's rendered attribute.
    const options = wrapper.findComponent(ItemOptions)
    expect(options.attributes('upload-disabled')).toBe('true')
  })

  test('ItemOptions receives upload-disabled=false when card.id > 0', () => {
    const wrapper = mount({ card: { id: 5 } })
    const options = wrapper.findComponent(ItemOptions)
    expect(options.attributes('upload-disabled')).not.toBe('true')
  })

  // ── onUploadImage — faces modal ───────────────────────────────────────────

  test('opens the faces modal preloaded with both image URLs from the card', async () => {
    const card = {
      id: 1,
      front_image_path: 'cards/front.png',
      back_image_path: 'cards/back.png'
    }
    mocks.cardImageModalOpenMock.mockReturnValueOnce({
      response: Promise.resolve(undefined)
    })

    const wrapper = mount({ card })
    wrapper.findComponent(ItemOptions).vm.$emit('upload-image')
    await flushPromises()

    expect(mocks.cardImageModalOpenMock).toHaveBeenCalledWith(
      expect.objectContaining({
        target: 'faces',
        max_bytes: 2 * 1024 * 1024,
        front_image: expect.stringContaining('front.png'),
        back_image: expect.stringContaining('back.png')
      })
    )
  })

  test('applies a front File result via setFaceImage', async () => {
    const file = new File(['x'], 'front.png', { type: 'image/png' })
    mocks.cardImageModalOpenMock.mockReturnValueOnce({
      response: Promise.resolve({ target: 'faces', front: file, back: undefined })
    })

    const wrapper = mount({ card: { id: 3 } })
    wrapper.findComponent(ItemOptions).vm.$emit('upload-image')
    await flushPromises()

    expect(mocks.setFaceImageMock).toHaveBeenCalledWith(3, 'front', file)
    expect(mocks.setFaceImageMock).toHaveBeenCalledTimes(1)
  })

  test('applies a back File result via setFaceImage', async () => {
    const file = new File(['x'], 'back.png', { type: 'image/png' })
    mocks.cardImageModalOpenMock.mockReturnValueOnce({
      response: Promise.resolve({ target: 'faces', front: undefined, back: file })
    })

    const wrapper = mount({ card: { id: 3 } })
    wrapper.findComponent(ItemOptions).vm.$emit('upload-image')
    await flushPromises()

    expect(mocks.setFaceImageMock).toHaveBeenCalledWith(3, 'back', file)
    expect(mocks.setFaceImageMock).toHaveBeenCalledTimes(1)
  })

  test('passes a null result (removal) through to setFaceImage', async () => {
    mocks.cardImageModalOpenMock.mockReturnValueOnce({
      response: Promise.resolve({ target: 'faces', front: null, back: undefined })
    })

    const wrapper = mount({ card: { id: 3 } })
    wrapper.findComponent(ItemOptions).vm.$emit('upload-image')
    await flushPromises()

    expect(mocks.setFaceImageMock).toHaveBeenCalledWith(3, 'front', null)
    expect(mocks.setFaceImageMock).toHaveBeenCalledTimes(1)
  })

  test('applies both faces when both results are present', async () => {
    const file = new File(['x'], 'front.png', { type: 'image/png' })
    mocks.cardImageModalOpenMock.mockReturnValueOnce({
      response: Promise.resolve({ target: 'faces', front: file, back: null })
    })

    const wrapper = mount({ card: { id: 3 } })
    wrapper.findComponent(ItemOptions).vm.$emit('upload-image')
    await flushPromises()

    expect(mocks.setFaceImageMock).toHaveBeenCalledWith(3, 'front', file)
    expect(mocks.setFaceImageMock).toHaveBeenCalledWith(3, 'back', null)
    expect(mocks.setFaceImageMock).toHaveBeenCalledTimes(2)
  })

  test('skips setFaceImage for an undefined (untouched) face', async () => {
    mocks.cardImageModalOpenMock.mockReturnValueOnce({
      response: Promise.resolve({ target: 'faces', front: undefined, back: undefined })
    })

    const wrapper = mount({ card: { id: 3 } })
    wrapper.findComponent(ItemOptions).vm.$emit('upload-image')
    await flushPromises()

    expect(mocks.setFaceImageMock).not.toHaveBeenCalled()
  })

  test('does nothing when modal is dismissed (response undefined)', async () => {
    mocks.cardImageModalOpenMock.mockReturnValueOnce({
      response: Promise.resolve(undefined)
    })

    const wrapper = mount({ card: { id: 3 } })
    wrapper.findComponent(ItemOptions).vm.$emit('upload-image')
    await flushPromises()

    expect(mocks.setFaceImageMock).not.toHaveBeenCalled()
  })
})
