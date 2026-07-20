import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'

const { mockCreateNewDeck, mockStudyStart } = vi.hoisted(() => ({
  mockCreateNewDeck: vi.fn(),
  mockStudyStart: vi.fn()
}))

// Module-level (not inside vi.hoisted) so Vue's ref() is available — the
// component destructures `creating_deck` directly, relying on <script setup>'s
// auto ref-unwrap, which only kicks in for a real ref.
const creating_deck = ref(false)

vi.mock('@/views/dashboard/composables/new-deck-action', () => ({
  useNewDeckAction: () => ({ creating_deck, createNewDeck: mockCreateNewDeck })
}))

vi.mock('@/views/study-session/composables/study-modal', () => ({
  useStudyModal: () => ({ start: mockStudyStart })
}))

import FooterActions from '@/views/dashboard/mobile-footer/footer-actions.vue'

// Renders slot content + attrs (including @press wiring via emit) so template
// wiring inside <ui-button> is directly exercised.
const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  emits: ['press'],
  setup(_p, { slots, attrs, emit }) {
    return () => h('button', { ...attrs, onClick: () => emit('press') }, slots.default?.())
  }
})

function mountFooterActions(props = {}) {
  return shallowMount(FooterActions, {
    props: { due_decks: [], ...props },
    global: { stubs: { UiButton: UiButtonStub } }
  })
}

describe('DashboardFooterActions', () => {
  beforeEach(() => {
    mockCreateNewDeck.mockClear()
    mockStudyStart.mockClear()
    creating_deck.value = false
  })

  describe('new-deck button', () => {
    test('is disabled when creating_deck is true', () => {
      creating_deck.value = true
      const wrapper = mountFooterActions()

      expect(
        wrapper.find('[data-testid="dashboard-footer-actions__new-deck"]').attributes('disabled')
      ).not.toBeUndefined()
    })

    test('is disabled when editing_decks is true', () => {
      const wrapper = mountFooterActions({ editing_decks: true })

      expect(
        wrapper.find('[data-testid="dashboard-footer-actions__new-deck"]').attributes('disabled')
      ).not.toBeUndefined()
    })

    test('is enabled when neither creating_deck nor editing_decks are true', () => {
      const wrapper = mountFooterActions()

      expect(
        wrapper.find('[data-testid="dashboard-footer-actions__new-deck"]').attributes('disabled')
      ).toBeUndefined()
    })

    test('calls createNewDeck on press', async () => {
      const wrapper = mountFooterActions()

      await wrapper.find('[data-testid="dashboard-footer-actions__new-deck"]').trigger('click')

      expect(mockCreateNewDeck).toHaveBeenCalled()
    })
  })

  describe('edit-decks button', () => {
    test('shows pencil icon, Edit Decks label, and neutral chrome when not editing', () => {
      const wrapper = mountFooterActions({ editing_decks: false })
      const button = wrapper.find('[data-testid="dashboard-footer-actions__edit-decks"]')

      expect(button.attributes('icon-left')).toBe('pencil')
      expect(button.attributes('neutral')).toBe('')
      expect(button.text()).toBe('Edit Decks')
    })

    test('shows stop icon, Stop Editing label, and yellow data-palette when editing', () => {
      const wrapper = mountFooterActions({ editing_decks: true })
      const button = wrapper.find('[data-testid="dashboard-footer-actions__edit-decks"]')

      expect(button.attributes('icon-left')).toBe('stop')
      expect(button.attributes('data-palette')).toBe('yellow')
      expect(button.text()).toBe('Stop Editing')
    })

    test('emits toggle-edit-decks on press', async () => {
      const wrapper = mountFooterActions()

      await wrapper.find('[data-testid="dashboard-footer-actions__edit-decks"]').trigger('click')

      expect(wrapper.emitted('toggle-edit-decks')).toHaveLength(1)
    })
  })

  describe('study button', () => {
    test('is disabled when editing_decks is true', () => {
      const wrapper = mountFooterActions({ editing_decks: true })

      expect(
        wrapper
          .find('[data-testid="dashboard-footer-actions__study-button"]')
          .attributes('disabled')
      ).not.toBeUndefined()
    })

    test('is enabled when editing_decks is false', () => {
      const wrapper = mountFooterActions({ editing_decks: false })

      expect(
        wrapper
          .find('[data-testid="dashboard-footer-actions__study-button"]')
          .attributes('disabled')
      ).toBeUndefined()
    })

    test('calls study_session.start with due_decks on press', async () => {
      const due_decks = [{ id: 1 }, { id: 2 }]
      const wrapper = mountFooterActions({ due_decks })

      await wrapper.find('[data-testid="dashboard-footer-actions__study-button"]').trigger('click')

      expect(mockStudyStart).toHaveBeenCalledWith(due_decks.map((deck) => deck.id))
    })

    test('labels via the pluralized dashboard.mobile-footer.study-button key', () => {
      const wrapper = mountFooterActions({ due_decks: [{ id: 1 }, { id: 2 }] })

      expect(wrapper.find('[data-testid="dashboard-footer-actions__study-button"]').text()).toBe(
        'Study 2 Decks'
      )
    })
  })
})
