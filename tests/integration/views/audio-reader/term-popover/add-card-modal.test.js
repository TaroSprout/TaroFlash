import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────
// vi.hoisted runs before any module imports, so Vue's ref() is unavailable here.
// Plain objects with a .value property work identically for mock factories.

const { mutateAsyncMock, decksDataRef, successMock, errorMock } = vi.hoisted(() => {
  const mutateAsyncMock = vi.fn().mockResolvedValue({ id: 99 })
  const decksDataRef = { value: [] }
  return { mutateAsyncMock, decksDataRef, successMock: vi.fn(), errorMock: vi.fn() }
})

vi.mock('@/api/decks', () => ({
  useMemberDecksQuery: () => ({ data: decksDataRef })
}))

vi.mock('@/api/cards', () => ({
  useInsertCardAtMutation: () => ({ mutateAsync: mutateAsyncMock })
}))

vi.mock('@/composables/toast', () => ({
  useToast: () => ({ success: successMock, error: errorMock })
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

// Uncontrolled in real life; here we just surface content + an update emitter so
// tests can simulate the user editing a face.
const TextEditorStub = defineComponent({
  name: 'TextEditor',
  props: ['content', 'placeholder'],
  emits: ['update'],
  setup(props) {
    return () => h('div', { 'data-testid': 'text-editor-stub' }, props.content)
  }
})

// ── Component import (must come after mocks) ──────────────────────────────────

import AddCardModal from '@/views/audio-reader/term-popover/add-card-modal.vue'

// ── Helpers ────────────────────────────────────────────────────────────────────

const TEST_DECKS = [
  { id: 1, title: 'Deck Alpha' },
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
        TextEditor: TextEditorStub
      },
      mocks: { $t: (key) => key }
    }
  })
  return { wrapper, close }
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
  mutateAsyncMock.mockClear()
  mutateAsyncMock.mockResolvedValue({ id: 99 })
  successMock.mockClear()
  errorMock.mockClear()
})

describe('AddCardModal', () => {
  describe('rendering', () => {
    test('renders the modal body with both editable faces', () => {
      const { wrapper } = mountModal()
      expect(wrapper.find('[data-testid="add-card-modal__body"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="add-card-modal__front"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="add-card-modal__back"]').exists()).toBe(true)
    })

    test('seeds the front and back editors from the props', () => {
      const { wrapper } = mountModal({ front: 'Dog', back: '犬' })
      const front = wrapper
        .find('[data-testid="add-card-modal__front"]')
        .findComponent(TextEditorStub)
      const back = wrapper
        .find('[data-testid="add-card-modal__back"]')
        .findComponent(TextEditorStub)
      expect(front.props('content')).toBe('Dog')
      expect(back.props('content')).toBe('犬')
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

      const front = wrapper
        .find('[data-testid="add-card-modal__front"]')
        .findComponent(TextEditorStub)
      front.vm.$emit('update', '   ')
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

    test('persists edits made in the editors', async () => {
      decksDataRef.value = TEST_DECKS
      const { wrapper } = mountModal({ front: 'Dog', back: '犬' })
      await flushPromises()
      await selectDeck(wrapper, TEST_DECKS[0].id)

      wrapper
        .find('[data-testid="add-card-modal__back"]')
        .findComponent(TextEditorStub)
        .vm.$emit('update', '犬 (inu)')
      await flushPromises()

      await saveButton(wrapper).trigger('click')
      await flushPromises()

      expect(mutateAsyncMock).toHaveBeenCalledWith(
        expect.objectContaining({ front_text: 'Dog', back_text: '犬 (inu)' })
      )
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

    test('does not close when mutateAsync rejects', async () => {
      mutateAsyncMock.mockRejectedValueOnce(new Error('fail'))
      decksDataRef.value = TEST_DECKS
      const { wrapper, close } = mountModal()
      await flushPromises()
      await selectDeck(wrapper, TEST_DECKS[0].id)

      await saveButton(wrapper).trigger('click')
      await flushPromises()

      expect(close).not.toHaveBeenCalled()
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
})
