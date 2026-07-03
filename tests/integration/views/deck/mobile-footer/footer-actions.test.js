import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'

// useCardEditMenu → useDeckQuery needs @pinia/colada; override just useDeckQuery
// and preserve all other named exports so the mock doesn't drop barrel siblings.
const { mockUseDeckQuery } = vi.hoisted(() => ({
  mockUseDeckQuery: vi.fn(() => ({ data: ref(null) }))
}))
vi.mock('@/api/decks', async (importOriginal) => ({
  ...(await importOriginal()),
  useDeckQuery: mockUseDeckQuery
}))

// useCardEditMenu → useMatchMedia
const { mockUseMatchMedia } = vi.hoisted(() => ({ mockUseMatchMedia: vi.fn() }))
vi.mock('@/composables/ui/media-query', () => ({ useMatchMedia: mockUseMatchMedia }))

// useCardEditMenu → useDeckSettingsModal
vi.mock('@/composables/deck/settings-modal', () => ({
  useDeckSettingsModal: () => ({ open: vi.fn() })
}))

// ── Imports ───────────────────────────────────────────────────────────────────

import FooterActions from '@/views/deck/mobile-footer/footer-actions.vue'
import { deckViewShellKey } from '@/views/deck/composables/view-shell'

// ── Stubs ─────────────────────────────────────────────────────────────────────

// Renders slot content + attrs (including @press wiring via emit) so template
// lines inside <ui-button> are covered.
const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  emits: ['press'],
  setup(_p, { slots, attrs, emit }) {
    return () => h('button', { ...attrs, onClick: () => emit('press') }, slots.default?.())
  }
})

// ── Factory ───────────────────────────────────────────────────────────────────

function makeShell({ is_rearranging = false } = {}) {
  return {
    is_rearranging: ref(is_rearranging),
    toggleRearrange: vi.fn(),
    openPageSettings: vi.fn()
  }
}

function mountFooterActions(shell = makeShell()) {
  mockUseMatchMedia.mockReturnValue(ref(false))
  return shallowMount(FooterActions, {
    global: {
      stubs: { UiButton: UiButtonStub },
      provide: { [deckViewShellKey]: shell }
    }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('mobile-footer/footer-actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseDeckQuery.mockReturnValue({ data: ref(null) })
  })

  test('renders the footer actions container', () => {
    const wrapper = mountFooterActions()
    expect(wrapper.find('[data-testid="deck-footer-actions"]').exists()).toBe(true)
  })

  // ── page-settings trigger ──────────────────────────────────────────────────

  test('always renders the page-settings trigger button', () => {
    const wrapper = mountFooterActions()
    expect(wrapper.find('[data-testid="deck-footer-actions__page-settings"]').exists()).toBe(true)
  })

  test('pressing the page-settings trigger calls shell.openPageSettings [obligation]', async () => {
    const shell = makeShell()
    const wrapper = mountFooterActions(shell)
    await wrapper.find('[data-testid="deck-footer-actions__page-settings"]').trigger('click')
    expect(shell.openPageSettings).toHaveBeenCalledOnce()
  })

  // ── is_rearranging toggle ─────────────────────────────────────────────────

  test('shows stop-rearranging button when shell.is_rearranging is true [obligation]', () => {
    const shell = makeShell({ is_rearranging: true })
    const wrapper = mountFooterActions(shell)
    expect(wrapper.find('[data-testid="deck-footer-actions__stop-rearranging"]').exists()).toBe(
      true
    )
    expect(wrapper.find('[data-testid="deck-footer-actions__new-card"]').exists()).toBe(false)
  })

  test('shows new-card button when shell.is_rearranging is false [obligation]', () => {
    const shell = makeShell({ is_rearranging: false })
    const wrapper = mountFooterActions(shell)
    expect(wrapper.find('[data-testid="deck-footer-actions__new-card"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="deck-footer-actions__stop-rearranging"]').exists()).toBe(
      false
    )
  })

  test('pressing stop-rearranging calls shell.toggleRearrange', async () => {
    const shell = makeShell({ is_rearranging: true })
    const wrapper = mountFooterActions(shell)
    await wrapper.find('[data-testid="deck-footer-actions__stop-rearranging"]').trigger('click')
    expect(shell.toggleRearrange).toHaveBeenCalledOnce()
  })

  // ── edit menu ───────────────────────────────────────────────────────────────

  test('renders the edit-menu dropdown', () => {
    const wrapper = mountFooterActions()
    expect(wrapper.find('[data-testid="deck-footer-actions__edit-menu"]').exists()).toBe(true)
  })
})
