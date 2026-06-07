import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { decksDataRef, lastDeckState } = vi.hoisted(() => ({
  decksDataRef: { value: [] },
  lastDeckState: { id: null }
}))

vi.mock('@/api/decks', () => ({
  useMemberDecksQuery: () => ({ data: decksDataRef })
}))

vi.mock('@/composables/use-last-deck', async () => {
  const { ref } = await import('vue')
  return { useLastDeck: () => ({ last_deck_id: ref(lastDeckState.id), setLastDeck: vi.fn() }) }
})

// ── Stubs ──────────────────────────────────────────────────────────────────────

const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  emits: ['click'],
  setup(_props, { slots, emit, attrs }) {
    return () => h('button', { ...attrs, onClick: () => emit('click') }, slots.default?.())
  }
})

// Render both the trigger and the menu items inline so options are clickable
// without driving the real floating-ui open/close animation.
const UiActionMenuStub = defineComponent({
  name: 'UiActionMenu',
  setup(_props, { slots }) {
    return () =>
      h('div', { 'data-testid': 'action-menu-stub' }, [
        slots.trigger?.({ toggle: () => {}, open: () => {}, close: () => {}, is_open: false }),
        h('div', { 'data-testid': 'action-menu-stub__items' }, slots.default?.())
      ])
  }
})

// ── Component import (must come after mocks) ──────────────────────────────────

import AddCardControl from '@/views/audio-reader/term-popover/add-card-control.vue'

// ── Helpers ────────────────────────────────────────────────────────────────────

const TEST_DECKS = [
  { id: 1, title: 'Deck Alpha' },
  { id: 2, title: 'Deck Beta' }
]

function mountControl() {
  return mount(AddCardControl, {
    global: {
      stubs: { UiButton: UiButtonStub, UiActionMenu: UiActionMenuStub },
      mocks: { $t: (key, params) => (params ? `${key}:${params.deck}` : key) }
    }
  })
}

function optionButtons(wrapper) {
  return wrapper.findAll('[data-testid="add-card-control__deck-option"]')
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  decksDataRef.value = TEST_DECKS
  lastDeckState.id = null
})

describe('AddCardControl', () => {
  describe('default deck label', () => {
    test('labels the primary button with the remembered last deck', () => {
      lastDeckState.id = 2
      const wrapper = mountControl()
      expect(wrapper.find('[data-testid="add-card-control__primary"]').text()).toContain(
        'Deck Beta'
      )
    })

    test('falls back to the first deck when nothing is remembered', () => {
      const wrapper = mountControl()
      expect(wrapper.find('[data-testid="add-card-control__primary"]').text()).toContain(
        'Deck Alpha'
      )
    })

    test('falls back to the generic label when there are no decks', () => {
      decksDataRef.value = []
      const wrapper = mountControl()
      expect(wrapper.find('[data-testid="add-card-control__primary"]').text()).toContain(
        'Add flashcard'
      )
    })
  })

  describe('emitting add', () => {
    test('primary click emits add with the default deck id', async () => {
      lastDeckState.id = 2
      const wrapper = mountControl()
      await wrapper.find('[data-testid="add-card-control__primary"]').trigger('click')

      expect(wrapper.emitted('add')).toEqual([[2]])
    })

    test('primary click emits add with null when there are no decks', async () => {
      decksDataRef.value = []
      const wrapper = mountControl()
      await wrapper.find('[data-testid="add-card-control__primary"]').trigger('click')

      expect(wrapper.emitted('add')).toEqual([[null]])
    })

    test('renders one option per deck and emits add with the picked deck id', async () => {
      const wrapper = mountControl()
      const options = optionButtons(wrapper)
      expect(options.length).toBe(TEST_DECKS.length)

      await options[1].trigger('click')

      expect(wrapper.emitted('add')).toEqual([[2]])
    })
  })
})
