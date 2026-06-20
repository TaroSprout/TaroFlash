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
  handleLimitErrorMock,
  emitSfxMock
} = vi.hoisted(() => ({
  mutateAsyncMock: vi.fn().mockResolvedValue({ id: 99 }),
  decksDataRef: { value: [] },
  successMock: vi.fn(),
  errorMock: vi.fn(),
  setLastDeckMock: vi.fn(),
  guardAddCardsMock: vi.fn().mockResolvedValue(true),
  handleLimitErrorMock: vi.fn().mockReturnValue(false),
  emitSfxMock: vi.fn()
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

vi.mock('@/composables/last-deck', () => ({
  useLastDeck: () => ({ last_deck_id: { value: null }, setLastDeck: setLastDeckMock })
}))

vi.mock('@/composables/card/limit-gate', () => ({
  useCardLimitGate: () => ({
    guardAddCards: guardAddCardsMock,
    handleLimitError: handleLimitErrorMock
  })
}))

vi.mock('@/sfx/bus', () => ({
  emitSfx: emitSfxMock,
  emitHoverSfx: vi.fn()
}))

vi.mock('gsap', () => ({
  gsap: {
    fromTo: vi.fn((_el, _from, to) => to?.onComplete?.()),
    to: vi.fn((_el, opts) => opts?.onComplete?.())
  }
}))

vi.mock('@floating-ui/vue', () => ({
  useFloating: vi.fn(() => ({
    placement: { value: 'bottom-start' },
    middlewareData: { value: {} },
    floatingStyles: { value: {} }
  })),
  shift: vi.fn(() => ({})),
  flip: vi.fn(() => ({})),
  autoUpdate: vi.fn(),
  arrow: vi.fn(() => ({})),
  offset: vi.fn(() => ({})),
  hide: vi.fn(() => ({})),
  size: vi.fn(() => ({}))
}))

// ── Stubs ──────────────────────────────────────────────────────────────────────

const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  props: ['disabled', 'tapAnimate'],
  emits: ['press'],
  setup(props, { slots, emit, attrs }) {
    return () =>
      h(
        'button',
        { ...attrs, disabled: props.disabled, onClick: () => !props.disabled && emit('press') },
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

// Stub the dropdown-button: renders the trigger + exposes a `select` event
// so tests can drive deck selection without floating-ui machinery.
const UiDropdownButtonStub = defineComponent({
  name: 'UiDropdownButton',
  inheritAttrs: false,
  props: ['options'],
  emits: ['select'],
  setup(props, { slots, emit, attrs }) {
    return () =>
      h('div', { ...attrs, 'data-testid': attrs['data-testid'] ?? 'ui-dropdown-button-stub' }, [
        slots.default?.(),
        // Render one button per option so tests can trigger select by option index
        ...(props.options ?? []).map((opt) =>
          h('button', {
            'data-testid': `deck-option-${opt.value}`,
            onClick: () => emit('select', opt)
          })
        )
      ])
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
      stubs: {
        UiButton: UiButtonStub,
        UiDropdownButton: UiDropdownButtonStub,
        CardFaceField: CardFaceFieldStub
      },
      mocks: { $t: (key) => key }
    }
  })
}

function faceField(wrapper, side) {
  return wrapper.findAllComponents(CardFaceFieldStub).find((f) => f.props('side') === side)
}

function saveButton(wrapper) {
  // The save button is the last button in the actions row
  const buttons = wrapper.findAll('[data-testid="add-card-panel__actions"] button')
  return buttons[buttons.length - 1]
}

// Simulate selecting a deck via the dropdown stub's emitted select event.
function selectDeck(wrapper, id) {
  wrapper.findComponent(UiDropdownButtonStub).vm.$emit('select', { value: id, label: `Deck ${id}` })
  return wrapper.vm.$nextTick()
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
  emitSfxMock.mockClear()
})

describe('AddCardPanel', () => {
  describe('rendering', () => {
    test('renders the actions-row, preview, and actions sections', () => {
      const wrapper = mountPanel()
      expect(wrapper.find('[data-testid="add-card-panel__actions-row"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="add-card-panel__preview"]').exists()).toBe(true)
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

    test('flipping to back emits ui.transition_up [obligation]', async () => {
      const wrapper = mountPanel()
      emitSfxMock.mockClear()

      // Start on front; flip to back
      await wrapper.find('[data-testid="add-card-panel__flip-button"]').trigger('click')

      expect(emitSfxMock).toHaveBeenCalledWith('transition_up')
    })

    test('flipping to front emits ui.transition_down [obligation]', async () => {
      const wrapper = mountPanel()

      // Flip to back first, then back to front
      await wrapper.find('[data-testid="add-card-panel__flip-button"]').trigger('click')
      emitSfxMock.mockClear()
      await wrapper.find('[data-testid="add-card-panel__flip-button"]').trigger('click')

      expect(emitSfxMock).toHaveBeenCalledWith('transition_down')
    })
  })

  describe('focus cue [obligation]', () => {
    test('focusin on a contenteditable target emits ui.slide_up [obligation]', async () => {
      const wrapper = mountPanel()
      emitSfxMock.mockClear()

      const preview = wrapper.find('[data-testid="add-card-panel__preview"]').element
      const editable = document.createElement('div')
      editable.contentEditable = 'true'
      preview.appendChild(editable)

      // Dispatch on the editable itself so event.target === editable; it bubbles to preview.
      editable.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
      await wrapper.vm.$nextTick()

      expect(emitSfxMock).toHaveBeenCalledWith('slide_up')
      editable.remove()
    })

    test('focusin on a non-editable element does NOT emit ui.slide_up [obligation]', async () => {
      const wrapper = mountPanel()
      emitSfxMock.mockClear()

      const preview = wrapper.find('[data-testid="add-card-panel__preview"]').element
      const button = document.createElement('button')
      preview.appendChild(button)

      // Dispatch on the button itself so event.target === button; it bubbles to preview.
      button.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
      await wrapper.vm.$nextTick()

      expect(emitSfxMock).not.toHaveBeenCalledWith('slide_up')
      button.remove()
    })
  })

  describe('deck dropdown [obligation]', () => {
    test('deck_options excludes the currently-selected deck [obligation]', async () => {
      decksDataRef.value = TEST_DECKS
      const wrapper = mountPanel({ deck_id: 1 })
      await flushPromises()

      const dropdown = wrapper.findComponent(UiDropdownButtonStub)
      const options = dropdown.props('options')
      // deck 1 is selected → only deck 2 should appear
      expect(options).toHaveLength(1)
      expect(options[0].value).toBe(2)
    })

    test('selecting a deck option sets deck_id via onSelectDeck [obligation]', async () => {
      decksDataRef.value = TEST_DECKS
      const wrapper = mountPanel()
      await flushPromises()

      await selectDeck(wrapper, TEST_DECKS[0].id)

      // After selection, deck 1 is selected → options list excludes deck 1
      const dropdown = wrapper.findComponent(UiDropdownButtonStub)
      const options = dropdown.props('options')
      expect(options.every((o) => o.value !== 1)).toBe(true)
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
    test('calls mutateAsync with deck_id, null anchor/side, and both face texts [obligation]', async () => {
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
        back_text: '犬',
        note: null
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

    test('forwards a provided note prop into mutateAsync [obligation]', async () => {
      decksDataRef.value = TEST_DECKS
      const wrapper = mountPanel({ front: 'Dog', back: '犬', note: 'some context' })
      await flushPromises()
      await selectDeck(wrapper, TEST_DECKS[0].id)

      await saveButton(wrapper).trigger('click')
      await flushPromises()

      expect(mutateAsyncMock).toHaveBeenCalledWith(
        expect.objectContaining({ note: 'some context' })
      )
    })

    test('persists edits made on the back face before saving', async () => {
      decksDataRef.value = TEST_DECKS
      const wrapper = mountPanel({ front: 'Dog', back: '犬' })
      await flushPromises()
      await selectDeck(wrapper, TEST_DECKS[0].id)

      // Flip to back side and edit
      await wrapper.find('[data-testid="add-card-panel__flip-button"]').trigger('click')
      wrapper.findComponent(CardFaceFieldStub).vm.$emit('update:text', '犬 (inu)')
      await flushPromises()

      await saveButton(wrapper).trigger('click')
      await flushPromises()

      expect(mutateAsyncMock).toHaveBeenCalledWith(
        expect.objectContaining({ back_text: '犬 (inu)' })
      )
    })

    test('pre-selects the deck passed via deck_id prop [obligation]', async () => {
      decksDataRef.value = TEST_DECKS
      const wrapper = mountPanel({ deck_id: 2 })
      await flushPromises()

      // Save button should be enabled (deck already selected, both faces have text)
      expect(saveButton(wrapper).attributes('disabled')).toBeUndefined()

      await saveButton(wrapper).trigger('click')
      await flushPromises()

      expect(mutateAsyncMock).toHaveBeenCalledWith(expect.objectContaining({ deck_id: 2 }))
    })
  })

  describe('cancel [obligation]', () => {
    test('back button emits cancel [obligation]', async () => {
      const wrapper = mountPanel()
      await wrapper.find('[data-testid="add-card-panel__back"]').trigger('click')

      expect(wrapper.emitted('cancel')).toBeTruthy()
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
