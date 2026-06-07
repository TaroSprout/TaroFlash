import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────
// vi.hoisted runs before any module imports, so Vue's ref() is unavailable here.
// Plain objects with a .value property work identically for mock factories.

const {
  mutateAsyncMock,
  decksDataRef,
  successMock,
  errorMock,
  setLastDeckMock,
  mediaState,
  guardAddCardsMock,
  handleLimitErrorMock
} = vi.hoisted(() => ({
  mutateAsyncMock: vi.fn().mockResolvedValue({ id: 99 }),
  decksDataRef: { value: [] },
  successMock: vi.fn(),
  errorMock: vi.fn(),
  setLastDeckMock: vi.fn(),
  mediaState: { mobile: false },
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

// Drive the mobile breakpoint directly so the test doesn't depend on the real
// viewport size (these run in a headless browser, not jsdom). Keep the module's
// other exports — they're imported elsewhere in the graph.
vi.mock('@/composables/use-media-query', async (importOriginal) => {
  const actual = await importOriginal()
  const { ref } = await import('vue')
  return { ...actual, useMatchMedia: () => ref(mediaState.mobile) }
})

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

// Mirror the layout-kit sheet's contract: render the body slot and expose a close
// affordance that fires the @close handler the modal wires to close(false).
const MobileSheetStub = defineComponent({
  name: 'MobileSheet',
  inheritAttrs: false,
  emits: ['close'],
  setup(_props, { slots, emit, attrs }) {
    return () =>
      h('div', { ...attrs }, [
        h('button', { 'data-testid': 'mobile-sheet__close', onClick: () => emit('close') }),
        slots.default?.()
      ])
  }
})

// Stand in for the real <Card>-backed face: surface the seeded text and an update
// emitter so tests can drive edits without GSAP / contenteditable.
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

import AddCardModal from '@/views/audio-reader/term-popover/add-card-modal.vue'

// ── Helpers ────────────────────────────────────────────────────────────────────

const TEST_DECKS = [
  { id: 1, title: 'Deck Alpha', card_attributes: { front: { text_size: 6 }, back: {} } },
  { id: 2, title: 'Deck Beta' }
]

function mountModal(props = {}) {
  const close = vi.fn()
  const wrapper = mount(AddCardModal, {
    props: { front: 'Hello', back: 'こんにちは', close, ...props },
    global: {
      stubs: {
        MobileSheet: MobileSheetStub,
        UiButton: UiButtonStub,
        CardFaceField: CardFaceFieldStub
      },
      mocks: { $t: (key) => key }
    }
  })
  return { wrapper, close }
}

function faceField(wrapper, side) {
  return wrapper.findAllComponents(CardFaceFieldStub).find((field) => field.props('side') === side)
}

function saveButton(wrapper) {
  const buttons = wrapper.findAll('[data-testid="add-card-modal__actions"] button')
  return buttons[buttons.length - 1]
}

function selectDeck(wrapper, id) {
  return wrapper.find('[data-testid="add-card-modal__deck"]').setValue(String(id))
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  decksDataRef.value = []
  mediaState.mobile = false
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

describe('AddCardModal', () => {
  describe('rendering (desktop: both faces shown)', () => {
    test('renders the modal body with a front and back card face', () => {
      const { wrapper } = mountModal()
      expect(wrapper.find('[data-testid="add-card-modal__body"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="add-card-modal__front"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="add-card-modal__back"]').exists()).toBe(true)
    })

    test('does not render the mobile single-card flip layout above md', () => {
      const { wrapper } = mountModal()
      expect(wrapper.find('[data-testid="add-card-modal__flip"]').exists()).toBe(false)
    })

    test('seeds the front and back faces from the props', () => {
      const { wrapper } = mountModal({ front: 'Dog', back: '犬' })
      expect(faceField(wrapper, 'front').props('text')).toBe('Dog')
      expect(faceField(wrapper, 'back').props('text')).toBe('犬')
    })
  })

  describe('card attributes from the selected deck', () => {
    test('passes the chosen deck attributes through to the faces', async () => {
      decksDataRef.value = TEST_DECKS
      const { wrapper } = mountModal()
      await flushPromises()
      await selectDeck(wrapper, 1)

      expect(faceField(wrapper, 'front').props('attributes')).toEqual({ text_size: 6 })
    })
  })

  describe('deck select population', () => {
    test('populates the select with options from useMemberDecksQuery', async () => {
      decksDataRef.value = TEST_DECKS
      const { wrapper } = mountModal()
      await flushPromises()

      const options = wrapper.findAll('[data-testid="add-card-modal__deck"] option').slice(1)
      expect(options.length).toBe(TEST_DECKS.length)
      expect(options[0].text()).toContain('Deck Alpha')
      expect(options[1].text()).toContain('Deck Beta')
    })

    test('shows only the placeholder when no decks are loaded', () => {
      const { wrapper } = mountModal()
      expect(wrapper.findAll('[data-testid="add-card-modal__deck"] option').length).toBe(1)
    })

    test('pre-selects the deck passed in so saving needs no extra click', async () => {
      decksDataRef.value = TEST_DECKS
      const { wrapper } = mountModal({ deck_id: 2 })
      await flushPromises()

      expect(saveButton(wrapper).attributes('disabled')).toBeUndefined()

      await saveButton(wrapper).trigger('click')
      await flushPromises()

      expect(mutateAsyncMock).toHaveBeenCalledWith(expect.objectContaining({ deck_id: 2 }))
    })
  })

  describe('Save button disabled state', () => {
    test('is disabled when no deck is selected', () => {
      const { wrapper } = mountModal()
      expect(saveButton(wrapper).attributes('disabled')).toBeDefined()
    })

    test('is enabled once a deck is selected and both faces have text', async () => {
      decksDataRef.value = TEST_DECKS
      const { wrapper } = mountModal()
      await flushPromises()
      await selectDeck(wrapper, TEST_DECKS[0].id)

      expect(saveButton(wrapper).attributes('disabled')).toBeUndefined()
    })

    test('is disabled when a face is cleared, even with a deck selected', async () => {
      decksDataRef.value = TEST_DECKS
      const { wrapper } = mountModal()
      await flushPromises()
      await selectDeck(wrapper, TEST_DECKS[0].id)

      faceField(wrapper, 'front').vm.$emit('update:text', '   ')
      await flushPromises()

      expect(saveButton(wrapper).attributes('disabled')).toBeDefined()
    })
  })

  describe('Save action', () => {
    test('calls mutateAsync with deck_id, null anchor/side, and both face texts', async () => {
      decksDataRef.value = TEST_DECKS
      const { wrapper } = mountModal({ front: 'Dog', back: '犬' })
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

    test('persists edits made in the faces', async () => {
      decksDataRef.value = TEST_DECKS
      const { wrapper } = mountModal({ front: 'Dog', back: '犬' })
      await flushPromises()
      await selectDeck(wrapper, TEST_DECKS[0].id)

      faceField(wrapper, 'back').vm.$emit('update:text', '犬 (inu)')
      await flushPromises()

      await saveButton(wrapper).trigger('click')
      await flushPromises()

      expect(mutateAsyncMock).toHaveBeenCalledWith(
        expect.objectContaining({ front_text: 'Dog', back_text: '犬 (inu)' })
      )
    })

    test('remembers the saved deck as the last-used deck', async () => {
      decksDataRef.value = TEST_DECKS
      const { wrapper } = mountModal({ deck_id: 1 })
      await flushPromises()

      await saveButton(wrapper).trigger('click')
      await flushPromises()

      expect(setLastDeckMock).toHaveBeenCalledWith(1)
    })

    test('calls close(true) after a successful mutateAsync', async () => {
      decksDataRef.value = TEST_DECKS
      const { wrapper, close } = mountModal()
      await flushPromises()
      await selectDeck(wrapper, TEST_DECKS[0].id)

      await saveButton(wrapper).trigger('click')
      await flushPromises()

      expect(close).toHaveBeenCalledWith(true)
    })

    test('does not call mutateAsync when no deck is selected', async () => {
      const { wrapper } = mountModal()
      await saveButton(wrapper).trigger('click')
      await flushPromises()

      expect(mutateAsyncMock).not.toHaveBeenCalled()
    })

    test('does not close or remember the deck when mutateAsync rejects', async () => {
      mutateAsyncMock.mockRejectedValueOnce(new Error('fail'))
      decksDataRef.value = TEST_DECKS
      const { wrapper, close } = mountModal({ deck_id: 1 })
      await flushPromises()

      await saveButton(wrapper).trigger('click')
      await flushPromises()

      expect(close).not.toHaveBeenCalled()
      expect(setLastDeckMock).not.toHaveBeenCalled()
      expect(errorMock).toHaveBeenCalled()
    })
  })

  describe('Cancel / dismiss', () => {
    test('calls close(false) when the Cancel button is clicked', async () => {
      const { wrapper, close } = mountModal()
      const cancel = wrapper.findAll('[data-testid="add-card-modal__actions"] button')[0]
      await cancel.trigger('click')

      expect(close).toHaveBeenCalledWith(false)
    })

    test('calls close(false) when the sheet requests close', async () => {
      const { wrapper, close } = mountModal()
      await wrapper.find('[data-testid="mobile-sheet__close"]').trigger('click')

      expect(close).toHaveBeenCalledWith(false)
    })
  })

  describe('mobile (single card with flip)', () => {
    beforeEach(() => {
      mediaState.mobile = true
    })
    afterEach(() => {
      mediaState.mobile = false
    })

    test('renders the single-card flip layout, not the two-up faces', () => {
      const { wrapper } = mountModal()
      expect(wrapper.find('[data-testid="add-card-modal__flip"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="add-card-modal__faces"]').exists()).toBe(false)
    })

    test('shows the front side first, then flips to the back', async () => {
      const { wrapper } = mountModal()
      expect(wrapper.findComponent(CardFaceFieldStub).props('side')).toBe('front')
      expect(wrapper.find('[data-testid="add-card-modal__side-label"]').text()).toBe('Front')

      await wrapper.find('[data-testid="add-card-modal__flip-button"]').trigger('click')

      expect(wrapper.findComponent(CardFaceFieldStub).props('side')).toBe('back')
    })

    test('binds the active side text and routes edits to that side on save', async () => {
      decksDataRef.value = TEST_DECKS
      const { wrapper } = mountModal({ front: 'Dog', back: '犬' })
      await flushPromises()

      expect(wrapper.findComponent(CardFaceFieldStub).props('text')).toBe('Dog')
      wrapper.findComponent(CardFaceFieldStub).vm.$emit('update:text', 'Doggo')
      await flushPromises()

      await wrapper.find('[data-testid="add-card-modal__flip-button"]').trigger('click')
      expect(wrapper.findComponent(CardFaceFieldStub).props('text')).toBe('犬')

      await selectDeck(wrapper, TEST_DECKS[0].id)
      await saveButton(wrapper).trigger('click')
      await flushPromises()

      expect(mutateAsyncMock).toHaveBeenCalledWith(
        expect.objectContaining({ front_text: 'Doggo', back_text: '犬' })
      )
    })
  })

  describe('card-limit gate (obligation tests)', () => {
    test('does not call mutateAsync when guardAddCards resolves false', async () => {
      guardAddCardsMock.mockResolvedValue(false)
      decksDataRef.value = TEST_DECKS
      const { wrapper } = mountModal({ deck_id: 1 })
      await flushPromises()

      await saveButton(wrapper).trigger('click')
      await flushPromises()

      expect(mutateAsyncMock).not.toHaveBeenCalled()
    })

    test('calls handleLimitError on a failed save and skips the generic toast when it returns true', async () => {
      const pt001 = { code: 'PT001', message: 'limit exceeded' }
      mutateAsyncMock.mockRejectedValueOnce(pt001)
      handleLimitErrorMock.mockReturnValue(true)
      decksDataRef.value = TEST_DECKS
      const { wrapper } = mountModal({ deck_id: 1 })
      await flushPromises()

      await saveButton(wrapper).trigger('click')
      await flushPromises()

      expect(handleLimitErrorMock).toHaveBeenCalledWith(pt001)
      expect(errorMock).not.toHaveBeenCalled()
    })

    test('shows the generic toast when handleLimitError returns false (non-PT001 error)', async () => {
      const generic = new Error('server error')
      mutateAsyncMock.mockRejectedValueOnce(generic)
      handleLimitErrorMock.mockReturnValue(false)
      decksDataRef.value = TEST_DECKS
      const { wrapper } = mountModal({ deck_id: 1 })
      await flushPromises()

      await saveButton(wrapper).trigger('click')
      await flushPromises()

      expect(handleLimitErrorMock).toHaveBeenCalledWith(generic)
      expect(errorMock).toHaveBeenCalled()
    })
  })
})
