import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
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

vi.mock('@/sfx/bus', () => ({ emitSfx: vi.fn(), emitHoverSfx: vi.fn() }))

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

// Render both the primary button area and the menu options inline so we can
// click each without driving real Floating UI positioning.
const UiDropdownButtonStub = defineComponent({
  name: 'UiDropdownButton',
  inheritAttrs: false,
  props: ['options', 'disabled', 'iconLeft', 'size'],
  emits: ['click', 'select'],
  setup(props, { slots, emit, attrs }) {
    return () =>
      h('div', { ...attrs, 'data-testid': attrs['data-testid'] ?? 'ui-dropdown-button' }, [
        h(
          'button',
          {
            'data-testid': 'add-card-control__primary',
            'aria-disabled': attrs['aria-disabled'],
            onClick: () => emit('click')
          },
          slots.default?.()
        ),
        h(
          'div',
          { 'data-testid': 'add-card-control__options' },
          (props.options ?? []).map((opt) =>
            h(
              'button',
              {
                key: opt.value,
                'data-testid': 'add-card-control__deck-option',
                'data-value': opt.value,
                onClick: () => emit('select', opt)
              },
              opt.label
            )
          )
        )
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

function mountControl(props = {}) {
  return shallowMount(AddCardControl, {
    props,
    global: {
      stubs: { UiDropdownButton: UiDropdownButtonStub },
      mocks: { $t: (key) => key }
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
  describe('default deck label [obligation]', () => {
    test('labels the primary button with the remembered last deck [obligation]', () => {
      lastDeckState.id = 2
      const wrapper = mountControl()
      expect(wrapper.find('[data-testid="add-card-control__primary"]').text()).toContain(
        'Deck Beta'
      )
    })

    test('falls back to the first deck when nothing is remembered [obligation]', () => {
      const wrapper = mountControl()
      expect(wrapper.find('[data-testid="add-card-control__primary"]').text()).toContain(
        'Deck Alpha'
      )
    })

    test('falls back to the generic label when there are no decks [obligation]', () => {
      decksDataRef.value = []
      const wrapper = mountControl()
      // In browser mode i18n is real — the fallback key resolves to 'Add flashcard'
      expect(wrapper.find('[data-testid="add-card-control__primary"]').text()).toContain(
        'Add flashcard'
      )
    })

    test('a deck with no title falls back to the add-card label [obligation]', () => {
      decksDataRef.value = [{ id: 1, title: null }]
      lastDeckState.id = 1
      const wrapper = mountControl()
      // No title → primary_label computed falls back to t('audio-reader.popover.add-card-button')
      expect(wrapper.find('[data-testid="add-card-control__primary"]').text()).toContain(
        'Add flashcard'
      )
    })
  })

  describe('emitting add via primary click [obligation]', () => {
    test('primary click emits add with the default (last-used) deck id [obligation]', async () => {
      lastDeckState.id = 2
      const wrapper = mountControl()
      await wrapper.find('[data-testid="add-card-control__primary"]').trigger('click')

      expect(wrapper.emitted('add')).toEqual([[2]])
    })

    test('primary click emits add with the first deck when no last deck [obligation]', async () => {
      const wrapper = mountControl()
      await wrapper.find('[data-testid="add-card-control__primary"]').trigger('click')

      expect(wrapper.emitted('add')).toEqual([[1]])
    })

    test('primary click emits add with null when there are no decks [obligation]', async () => {
      decksDataRef.value = []
      const wrapper = mountControl()
      await wrapper.find('[data-testid="add-card-control__primary"]').trigger('click')

      expect(wrapper.emitted('add')).toEqual([[null]])
    })
  })

  describe('emitting add via deck option selection [obligation]', () => {
    test('renders one option per deck in the dropdown menu [obligation]', () => {
      const wrapper = mountControl()
      expect(optionButtons(wrapper)).toHaveLength(TEST_DECKS.length)
    })

    test('selecting a deck option emits add with that deck id [obligation]', async () => {
      const wrapper = mountControl()
      const options = optionButtons(wrapper)

      await options[1].trigger('click')

      expect(wrapper.emitted('add')).toEqual([[2]])
    })

    test('selecting the first deck option emits add with that deck id [obligation]', async () => {
      const wrapper = mountControl()
      await optionButtons(wrapper)[0].trigger('click')

      expect(wrapper.emitted('add')).toEqual([[1]])
    })
  })

  describe('disabled prop [obligation]', () => {
    test('forwards disabled as aria-disabled to the root button [obligation]', () => {
      const wrapper = mountControl({ disabled: true })
      // The component passes :aria-disabled="disabled || undefined"
      expect(
        wrapper.find('[data-testid="add-card-control__primary"]').attributes('aria-disabled')
      ).toBeDefined()
    })

    test('no aria-disabled when disabled=false [obligation]', () => {
      const wrapper = mountControl({ disabled: false })
      expect(
        wrapper.find('[data-testid="add-card-control__primary"]').attributes('aria-disabled')
      ).toBeUndefined()
    })
  })
})
