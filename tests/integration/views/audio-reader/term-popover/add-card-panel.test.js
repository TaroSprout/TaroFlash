import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const {
  mutateAsyncMock,
  decksDataRef,
  successMock,
  errorMock,
  setLastDeckMock,
  guardAddCardsMock,
  handleLimitErrorMock
} = vi.hoisted(() => ({
  mutateAsyncMock: vi.fn().mockResolvedValue({ id: 99 }),
  decksDataRef: { value: [] },
  successMock: vi.fn(),
  errorMock: vi.fn(),
  setLastDeckMock: vi.fn(),
  guardAddCardsMock: vi.fn().mockResolvedValue(true),
  handleLimitErrorMock: vi.fn().mockReturnValue(false)
}))

vi.mock('@/api/decks', () => ({
  useMemberDecksQuery: () => ({ data: decksDataRef })
}))

vi.mock('@/api/cards', () => ({
  useInsertCardAtMutation: () => ({ mutateAsync: mutateAsyncMock })
}))

vi.mock('@/composables/toast', () => ({
  useToast: () => ({ success: successMock, error: errorMock })
}))

vi.mock('@/composables/use-last-deck', () => ({
  useLastDeck: () => ({ last_deck_id: { value: null }, setLastDeck: setLastDeckMock })
}))

vi.mock('@/composables/use-card-limit-gate', () => ({
  useCardLimitGate: () => ({
    guardAddCards: guardAddCardsMock,
    handleLimitError: handleLimitErrorMock
  })
}))

// ── Stubs ──────────────────────────────────────────────────────────────────────

const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  props: ['disabled'],
  emits: ['click'],
  setup(props, { slots, emit, attrs }) {
    return () =>
      h(
        'button',
        { ...attrs, disabled: props.disabled, onClick: () => !props.disabled && emit('click') },
        slots.default?.()
      )
  }
})

const CardFaceFieldStub = defineComponent({
  name: 'CardFaceField',
  props: ['side', 'text', 'attributes', 'placeholder', 'size', 'error'],
  emits: ['update:text'],
  setup(props) {
    return () =>
      h('div', { 'data-testid': 'card-face-field-stub', 'data-side': props.side }, props.text)
  }
})

// ── Component import (must come after mocks) ──────────────────────────────────

import AddCardPanel from '@/views/audio-reader/term-popover/add-card-panel.vue'

// ── Helpers ────────────────────────────────────────────────────────────────────

const TEST_DECKS = [
  { id: 1, title: 'Deck Alpha', card_attributes: { front: { text_size: 6 }, back: {} } },
  { id: 2, title: 'Deck Beta' }
]

function mountPanel(props = {}) {
  return mount(AddCardPanel, {
    props: { front: 'Hello', back: 'こんにちは', ...props },
    global: {
      stubs: { UiButton: UiButtonStub, CardFaceField: CardFaceFieldStub },
      mocks: { $t: (key) => key }
    }
  })
}

function faceField(wrapper, side) {
  return wrapper.findAllComponents(CardFaceFieldStub).find((f) => f.props('side') === side)
}

function saveButton(wrapper) {
  const buttons = wrapper.findAll('[data-testid="add-card-panel__actions"] button')
  return buttons[buttons.length - 1]
}

function selectDeck(wrapper, id) {
  return wrapper.find('[data-testid="add-card-panel__deck"]').setValue(String(id))
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  decksDataRef.value = []
  mutateAsyncMock.mockClear()
  mutateAsyncMock.mockResolvedValue({ id: 99 })
  successMock.mockClear()
  errorMock.mockClear()
  setLastDeckMock.mockClear()
  guardAddCardsMock.mockClear()
  guardAddCardsMock.mockResolvedValue(true)
  handleLimitErrorMock.mockClear()
  handleLimitErrorMock.mockReturnValue(false)
})

describe('AddCardPanel', () => {
  describe('rendering', () => {
    test('renders the flip toggle and action buttons', () => {
      const wrapper = mountPanel()
      expect(wrapper.find('[data-testid="add-card-panel__flip"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="add-card-panel__actions"]').exists()).toBe(true)
    })

    test('shows the front side first', () => {
      const wrapper = mountPanel()
      expect(wrapper.findComponent(CardFaceFieldStub).props('side')).toBe('front')
    })

    test('seeds front face with the front prop', () => {
      const wrapper = mountPanel({ front: 'Dog', back: '犬' })
      expect(faceField(wrapper, 'front').props('text')).toBe('Dog')
    })
  })

  describe('flip [obligation]', () => {
    test('clicking flip-button switches to the back side', async () => {
      const wrapper = mountPanel()
      expect(wrapper.findComponent(CardFaceFieldStub).props('side')).toBe('front')

      await wrapper.find('[data-testid="add-card-panel__flip-button"]').trigger('click')

      expect(wrapper.findComponent(CardFaceFieldStub).props('side')).toBe('back')
    })

    test('clicking flip-button again returns to front', async () => {
      const wrapper = mountPanel()
      await wrapper.find('[data-testid="add-card-panel__flip-button"]').trigger('click')
      await wrapper.find('[data-testid="add-card-panel__flip-button"]').trigger('click')

      expect(wrapper.findComponent(CardFaceFieldStub).props('side')).toBe('front')
    })
  })

  describe('can_save guard [obligation]', () => {
    test('save button is disabled when no deck is selected', () => {
      const wrapper = mountPanel()
      expect(saveButton(wrapper).attributes('disabled')).toBeDefined()
    })

    test('save button is enabled once a deck is selected and both faces have text', async () => {
      decksDataRef.value = TEST_DECKS
      const wrapper = mountPanel()
      await flushPromises()
      await selectDeck(wrapper, TEST_DECKS[0].id)

      expect(saveButton(wrapper).attributes('disabled')).toBeUndefined()
    })

    test('save button is disabled when front is empty even with a deck selected', async () => {
      decksDataRef.value = TEST_DECKS
      const wrapper = mountPanel({ front: '', back: '犬' })
      await flushPromises()
      await selectDeck(wrapper, TEST_DECKS[0].id)

      expect(saveButton(wrapper).attributes('disabled')).toBeDefined()
    })

    test('save button is disabled when back is empty even with a deck selected', async () => {
      decksDataRef.value = TEST_DECKS
      const wrapper = mountPanel({ front: 'Dog', back: '' })
      await flushPromises()
      await selectDeck(wrapper, TEST_DECKS[0].id)

      expect(saveButton(wrapper).attributes('disabled')).toBeDefined()
    })
  })

  describe('save action [obligation]', () => {
    test('calls mutateAsync with deck_id, null anchor/side, and both face texts', async () => {
      decksDataRef.value = TEST_DECKS
      const wrapper = mountPanel({ front: 'Dog', back: '犬' })
      await flushPromises()
      await selectDeck(wrapper, TEST_DECKS[0].id)

      await saveButton(wrapper).trigger('click')
      await flushPromises()

      expect(mutateAsyncMock).toHaveBeenCalledWith({
        deck_id: TEST_DECKS[0].id,
        anchor_id: null,
        side: null,
        front_text: 'Dog',
        back_text: '犬'
      })
    })

    test('remembers the saved deck as the last-used deck [obligation]', async () => {
      decksDataRef.value = TEST_DECKS
      const wrapper = mountPanel({ deck_id: 1 })
      await flushPromises()

      await saveButton(wrapper).trigger('click')
      await flushPromises()

      expect(setLastDeckMock).toHaveBeenCalledWith(1)
    })

    test('emits saved after successful mutateAsync [obligation]', async () => {
      decksDataRef.value = TEST_DECKS
      const wrapper = mountPanel()
      await flushPromises()
      await selectDeck(wrapper, TEST_DECKS[0].id)

      await saveButton(wrapper).trigger('click')
      await flushPromises()

      expect(wrapper.emitted('saved')).toBeTruthy()
    })

    test('does not call mutateAsync when no deck is selected', async () => {
      const wrapper = mountPanel()
      await saveButton(wrapper).trigger('click')
      await flushPromises()

      expect(mutateAsyncMock).not.toHaveBeenCalled()
    })

    test('does not emit saved and calls errorMock when mutateAsync rejects', async () => {
      mutateAsyncMock.mockRejectedValueOnce(new Error('fail'))
      decksDataRef.value = TEST_DECKS
      const wrapper = mountPanel({ deck_id: 1 })
      await flushPromises()

      await saveButton(wrapper).trigger('click')
      await flushPromises()

      expect(wrapper.emitted('saved')).toBeFalsy()
      expect(setLastDeckMock).not.toHaveBeenCalled()
      expect(errorMock).toHaveBeenCalled()
    })

    test('persists edits made on the back face before saving', async () => {
      decksDataRef.value = TEST_DECKS
      const wrapper = mountPanel({ front: 'Dog', back: '犬' })
      await flushPromises()
      await selectDeck(wrapper, TEST_DECKS[0].id)

      // Flip to the back side to access the back CardFaceField
      await wrapper.find('[data-testid="add-card-panel__flip-button"]').trigger('click')
      wrapper.findComponent(CardFaceFieldStub).vm.$emit('update:text', '犬 (inu)')
      await flushPromises()

      await saveButton(wrapper).trigger('click')
      await flushPromises()

      expect(mutateAsyncMock).toHaveBeenCalledWith(
        expect.objectContaining({ back_text: '犬 (inu)' })
      )
    })
  })

  describe('cancel [obligation]', () => {
    test('cancel button emits cancel [obligation]', async () => {
      const wrapper = mountPanel()
      const cancel = wrapper.findAll('[data-testid="add-card-panel__actions"] button')[0]
      await cancel.trigger('click')

      expect(wrapper.emitted('cancel')).toBeTruthy()
    })
  })

  describe('deck select population', () => {
    test('populates the select with options from useMemberDecksQuery', async () => {
      decksDataRef.value = TEST_DECKS
      const wrapper = mountPanel()
      await flushPromises()

      const options = wrapper.findAll('[data-testid="add-card-panel__deck"] option').slice(1)
      expect(options.length).toBe(TEST_DECKS.length)
      expect(options[0].text()).toContain('Deck Alpha')
    })

    test('pre-selects the deck passed via deck_id prop', async () => {
      decksDataRef.value = TEST_DECKS
      const wrapper = mountPanel({ deck_id: 2 })
      await flushPromises()

      expect(saveButton(wrapper).attributes('disabled')).toBeUndefined()

      await saveButton(wrapper).trigger('click')
      await flushPromises()

      expect(mutateAsyncMock).toHaveBeenCalledWith(expect.objectContaining({ deck_id: 2 }))
    })
  })

  describe('card-limit gate [obligation]', () => {
    test('does not call mutateAsync when guardAddCards resolves false', async () => {
      guardAddCardsMock.mockResolvedValue(false)
      decksDataRef.value = TEST_DECKS
      const wrapper = mountPanel({ deck_id: 1 })
      await flushPromises()

      await saveButton(wrapper).trigger('click')
      await flushPromises()

      expect(mutateAsyncMock).not.toHaveBeenCalled()
    })

    test('calls handleLimitError on a failed save and skips the generic toast when it returns true', async () => {
      const pt402 = { code: 'PT402', message: 'limit exceeded' }
      mutateAsyncMock.mockRejectedValueOnce(pt402)
      handleLimitErrorMock.mockReturnValue(true)
      decksDataRef.value = TEST_DECKS
      const wrapper = mountPanel({ deck_id: 1 })
      await flushPromises()

      await saveButton(wrapper).trigger('click')
      await flushPromises()

      expect(handleLimitErrorMock).toHaveBeenCalledWith(pt402)
      expect(errorMock).not.toHaveBeenCalled()
    })
  })
})
