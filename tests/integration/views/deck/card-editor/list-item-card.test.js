import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, ref, useAttrs } from 'vue'

// Stub Card so its default + editor slots render — otherwise ImageButton
// (which lives inside the card's default slot) is unreachable under shallowMount.
// Forward attrs so `data-testid="front-input"` / `back-input` make it through.
const CardStub = defineComponent({
  name: 'Card',
  inheritAttrs: false,
  props: { error: { type: Boolean, default: false } },
  setup(_props, { slots }) {
    const attrs = useAttrs()
    return () => h('div', attrs, [slots.default?.(), slots.editor?.()])
  }
})

const mocks = vi.hoisted(() => ({
  setCardImageMock: vi.fn(),
  deleteCardImageMock: vi.fn(),
  updateCardMock: vi.fn(),
  emitSfxMock: vi.fn()
}))

vi.mock('@/sfx/bus', () => ({ emitSfx: mocks.emitSfxMock }))

vi.mock('@/composables/toast', () => ({
  useToast: () => ({ error: vi.fn(), success: vi.fn(), warn: vi.fn() })
}))

import ListItemCard from '@/views/deck/card-editor/list-item-card.vue'
import ImageButton from '@/views/deck/image-button.vue'
import textEditor from '@/components/text-editor/text-editor.vue'

function mount(props = {}) {
  return shallowMount(ListItemCard, {
    props: {
      duplicate: false,
      ...props,
      card: {
        id: 1,
        deck_id: 10,
        front_text: 'Q',
        back_text: 'A',
        rank: 1000,
        ...props.card
      }
    },
    global: {
      stubs: { Card: CardStub },
      provide: {
        'card-editor': {
          selection: { is_selecting: ref(false) },
          updateCard: mocks.updateCardMock,
          setCardImage: mocks.setCardImageMock,
          deleteCardImage: mocks.deleteCardImageMock,
          card_attributes: { front: {}, back: {} }
        }
      }
    }
  })
}

beforeEach(() => {
  mocks.setCardImageMock.mockReset()
  mocks.setCardImageMock.mockResolvedValue(undefined)
  mocks.deleteCardImageMock.mockReset()
  mocks.deleteCardImageMock.mockResolvedValue(undefined)
  mocks.updateCardMock.mockReset()
  mocks.updateCardMock.mockResolvedValue(undefined)
  mocks.emitSfxMock.mockReset()
})

describe('ListItemCard', () => {
  // ── Image buttons visibility (the temp-id fix) ─────────────────────────────

  test('renders image buttons on both sides when the card has a real id', () => {
    const wrapper = mount({ card: { id: 42 } })
    const buttons = wrapper.findAllComponents(ImageButton)
    expect(buttons).toHaveLength(2)
  })

  test('hides image buttons on both sides when the card has a temp id (id < 0)', () => {
    const wrapper = mount({ card: { id: -1 } })
    const buttons = wrapper.findAllComponents(ImageButton)
    expect(buttons).toHaveLength(0)
  })

  test('hides image buttons when id is 0 (not yet assigned)', () => {
    const wrapper = mount({ card: { id: 0 } })
    const buttons = wrapper.findAllComponents(ImageButton)
    expect(buttons).toHaveLength(0)
  })

  // ── Rendering ──────────────────────────────────────────────────────────────

  test('renders a front and a back card', () => {
    const wrapper = mount()
    expect(wrapper.find('[data-testid="front-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="back-input"]').exists()).toBe(true)
  })

  // ── Image upload / delete wiring ──────────────────────────────────────────

  test('passes the uploaded file to setCardImage when the front image button emits', async () => {
    const wrapper = mount({ card: { id: 42 } })
    const file = new File(['x'], 'a.png', { type: 'image/png' })
    const frontButton = wrapper.findAllComponents(ImageButton)[0]
    await frontButton.vm.$emit('image-uploaded', file)
    expect(mocks.setCardImageMock).toHaveBeenCalledWith(42, 'front', file)
  })

  test('passes the side to setCardImage when the back image button emits', async () => {
    const wrapper = mount({ card: { id: 42 } })
    const file = new File(['x'], 'b.png', { type: 'image/png' })
    const backButton = wrapper.findAllComponents(ImageButton)[1]
    await backButton.vm.$emit('image-uploaded', file)
    expect(mocks.setCardImageMock).toHaveBeenCalledWith(42, 'back', file)
  })

  test('deletes the front image when the front image button emits image-deleted', async () => {
    const wrapper = mount({ card: { id: 42 } })
    const frontButton = wrapper.findAllComponents(ImageButton)[0]
    await frontButton.vm.$emit('image-deleted')
    expect(mocks.deleteCardImageMock).toHaveBeenCalledWith(42, 'front')
  })

  // ── Auto-save wiring ──────────────────────────────────────────────────────

  test('forwards text-editor updates to updateCard with the matching side key', async () => {
    const wrapper = mount({ card: { id: 42 } })
    const editors = wrapper.findAllComponents(textEditor)
    await editors[0].vm.$emit('update', 'new front')
    expect(mocks.updateCardMock).toHaveBeenCalledWith(42, { front_text: 'new front' })

    await editors[1].vm.$emit('update', 'new back')
    expect(mocks.updateCardMock).toHaveBeenLastCalledWith(42, { back_text: 'new back' })
  })

  // ── Error state — red outline from local save failure ─────────────────────

  test('starts with error=false on both faces', () => {
    const wrapper = mount({ card: { id: 42 } })
    const cards = wrapper.findAllComponents(CardStub)
    expect(cards[0].props('error')).toBe(false)
    expect(cards[1].props('error')).toBe(false)
  })

  test('sets error=true on both faces when updateCard rejects', async () => {
    mocks.updateCardMock.mockRejectedValueOnce(new Error('boom'))
    const wrapper = mount({ card: { id: 42 } })
    await wrapper.findAllComponents(textEditor)[0].vm.$emit('update', 'X')
    await flushPromises()
    const cards = wrapper.findAllComponents(CardStub)
    expect(cards[0].props('error')).toBe(true)
    expect(cards[1].props('error')).toBe(true)
  })

  test('clears error on the next update', async () => {
    mocks.updateCardMock.mockRejectedValueOnce(new Error('boom'))
    const wrapper = mount({ card: { id: 42 } })
    await wrapper.findAllComponents(textEditor)[0].vm.$emit('update', 'X')
    await flushPromises()
    expect(wrapper.findAllComponents(CardStub)[0].props('error')).toBe(true)

    await wrapper.findAllComponents(textEditor)[0].vm.$emit('update', 'XY')
    await flushPromises()
    expect(wrapper.findAllComponents(CardStub)[0].props('error')).toBe(false)
  })
})
