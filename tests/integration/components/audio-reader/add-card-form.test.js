import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────
// vi.hoisted runs before any module imports, so Vue's ref() is unavailable here.
// Plain objects with a .value property work identically for mock factories.

const { mutateAsyncMock, decksDataRef } = vi.hoisted(() => {
  const mutateAsyncMock = vi.fn().mockResolvedValue({ id: 99 })
  const decksDataRef = { value: [] }
  return { mutateAsyncMock, decksDataRef }
})

vi.mock('@/api/decks', () => ({
  useMemberDecksQuery: () => ({ data: decksDataRef })
}))

vi.mock('@/api/cards', () => ({
  useInsertCardAtMutation: () => ({ mutateAsync: mutateAsyncMock })
}))

vi.mock('@/composables/toast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() })
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
        {
          ...attrs,
          disabled: props.disabled,
          onClick: () => !props.disabled && emit('click')
        },
        slots.default?.()
      )
  }
})

// ── Component import (must come after mocks) ──────────────────────────────────

import AddCardForm from '@/components/audio-reader/add-card-form.vue'

// ── Helpers ────────────────────────────────────────────────────────────────────

const TEST_DECKS = [
  { id: 1, title: 'Deck Alpha' },
  { id: 2, title: 'Deck Beta' }
]

function mountForm(props = {}) {
  return mount(AddCardForm, {
    props: {
      front: 'Hello',
      back: 'こんにちは',
      ...props
    },
    global: {
      stubs: { UiButton: UiButtonStub },
      mocks: { $t: (key) => key }
    }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  decksDataRef.value = []
  mutateAsyncMock.mockClear()
  mutateAsyncMock.mockResolvedValue({ id: 99 })
})

describe('AddCardForm', () => {
  describe('rendering', () => {
    test('renders the form root', () => {
      const wrapper = mountForm()
      expect(wrapper.find('[data-testid="add-card-form"]').exists()).toBe(true)
    })

    test('renders the deck select', () => {
      const wrapper = mountForm()
      expect(wrapper.find('[data-testid="add-card-form__deck"]').exists()).toBe(true)
    })

    test('renders the actions row', () => {
      const wrapper = mountForm()
      expect(wrapper.find('[data-testid="add-card-form__actions"]').exists()).toBe(true)
    })
  })

  describe('deck select population', () => {
    test('populates the select with options from useMemberDecksQuery', async () => {
      decksDataRef.value = TEST_DECKS
      const wrapper = mountForm()
      await flushPromises()

      const options = wrapper.findAll('[data-testid="add-card-form__deck"] option')
      // First option is the placeholder (value=null → empty string in DOM), then one per deck
      const deckOptions = options.slice(1)
      expect(deckOptions.length).toBe(TEST_DECKS.length)
      expect(deckOptions[0].text()).toContain('Deck Alpha')
      expect(deckOptions[1].text()).toContain('Deck Beta')
    })

    test('shows only the placeholder when no decks are loaded', () => {
      decksDataRef.value = []
      const wrapper = mountForm()
      const options = wrapper.findAll('[data-testid="add-card-form__deck"] option')
      expect(options.length).toBe(1)
    })
  })

  describe('Save button disabled state', () => {
    test('Save button is disabled when no deck is selected', () => {
      const wrapper = mountForm()
      const buttons = wrapper.findAll('[data-testid="add-card-form__actions"] button')
      const saveButton = buttons[buttons.length - 1]
      expect(saveButton.attributes('disabled')).toBeDefined()
    })

    test('Save button is enabled once a deck is selected', async () => {
      decksDataRef.value = TEST_DECKS
      const wrapper = mountForm()
      await flushPromises()

      const select = wrapper.find('[data-testid="add-card-form__deck"]')
      await select.setValue(String(TEST_DECKS[0].id))

      const buttons = wrapper.findAll('[data-testid="add-card-form__actions"] button')
      const saveButton = buttons[buttons.length - 1]
      expect(saveButton.attributes('disabled')).toBeUndefined()
    })
  })

  describe('Save action', () => {
    test('calls mutateAsync with deck_id, anchor_id: null, side: null, and both texts', async () => {
      decksDataRef.value = TEST_DECKS
      const wrapper = mountForm({ front: 'Dog', back: '犬' })
      await flushPromises()

      await wrapper.find('[data-testid="add-card-form__deck"]').setValue(String(TEST_DECKS[0].id))

      const buttons = wrapper.findAll('[data-testid="add-card-form__actions"] button')
      await buttons[buttons.length - 1].trigger('click')
      await flushPromises()

      expect(mutateAsyncMock).toHaveBeenCalledWith({
        deck_id: TEST_DECKS[0].id,
        anchor_id: null,
        side: null,
        front_text: 'Dog',
        back_text: '犬'
      })
    })

    test('emits "saved" after a successful mutateAsync', async () => {
      decksDataRef.value = TEST_DECKS
      const wrapper = mountForm()
      await flushPromises()

      await wrapper.find('[data-testid="add-card-form__deck"]').setValue(String(TEST_DECKS[0].id))

      const buttons = wrapper.findAll('[data-testid="add-card-form__actions"] button')
      await buttons[buttons.length - 1].trigger('click')
      await flushPromises()

      expect(wrapper.emitted('saved')).toBeTruthy()
    })

    test('does not call mutateAsync when no deck is selected', async () => {
      const wrapper = mountForm()
      const buttons = wrapper.findAll('[data-testid="add-card-form__actions"] button')
      await buttons[buttons.length - 1].trigger('click')
      await flushPromises()

      expect(mutateAsyncMock).not.toHaveBeenCalled()
    })
  })

  describe('Cancel action', () => {
    test('emits "cancel" when the Cancel button is clicked', async () => {
      const wrapper = mountForm()
      const buttons = wrapper.findAll('[data-testid="add-card-form__actions"] button')
      await buttons[0].trigger('click')
      expect(wrapper.emitted('cancel')).toBeTruthy()
    })
  })
})
