import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockAlertWarn, mockNoticeError, mockRouterPush, mockDeleteDeck } = vi.hoisted(() => ({
  mockAlertWarn: vi.fn(),
  mockNoticeError: vi.fn(),
  mockRouterPush: vi.fn(),
  mockDeleteDeck: vi.fn()
}))

// Created at module level (not inside vi.hoisted) so Vue's ref() is available.
const mockDeletingRef = ref(false)

vi.mock('@/composables/alert', () => ({
  useAlert: () => ({ warn: mockAlertWarn })
}))

vi.mock('@/stores/notice-store', () => ({
  useNoticeStore: () => ({ error: mockNoticeError, success: vi.fn() })
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockRouterPush }),
  useRoute: () => ({ name: 'dashboard', params: {} })
}))

vi.mock('@/composables/deck/editor', () => ({
  useDeckEditor: () => ({
    deleting: mockDeletingRef,
    resetting_reviews: ref(false),
    deleteDeck: mockDeleteDeck
  })
}))

vi.mock('@/composables/ui/media-query', () => ({
  // fine pointer — staged-tap fires the press action immediately, no
  // animation timing to advance in the test
  useMatchMedia: () => ref(false)
}))

vi.mock('gsap', () => ({
  gsap: { to: vi.fn((_el, opts) => opts?.onComplete?.()) }
}))

vi.mock('@/sfx/bus', () => ({
  emitSfx: vi.fn(),
  emitHoverSfx: vi.fn()
}))

// ── Component import (after mocks) ────────────────────────────────────────────

import DeckGridDeleteButton from '@/views/dashboard/deck-grid/delete-button.vue'

// ── Helpers ───────────────────────────────────────────────────────────────────

const DECK = { id: 7, title: 'Deck 7' }

function mountButton() {
  return mount(DeckGridDeleteButton, {
    props: { deck: DECK },
    global: { directives: { sfx: {} } }
  })
}

function confirmResponse(value) {
  mockAlertWarn.mockReturnValueOnce({ response: Promise.resolve(value) })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockAlertWarn.mockReset()
  mockNoticeError.mockReset()
  mockRouterPush.mockReset()
  mockDeleteDeck.mockReset()
  mockDeleteDeck.mockResolvedValue(true)
  mockDeletingRef.value = false
})

describe('DeckGridDeleteButton — press calls danger_actions.onDelete', () => {
  test('confirming the alert deletes the deck', async () => {
    confirmResponse(true)
    const wrapper = mountButton()

    await wrapper.find('[data-testid="dashboard__deck-delete-button"]').trigger('click')
    await flushPromises()

    expect(mockDeleteDeck).toHaveBeenCalledTimes(1)
  })

  test('cancelling the alert does not delete the deck', async () => {
    confirmResponse(false)
    const wrapper = mountButton()

    await wrapper.find('[data-testid="dashboard__deck-delete-button"]').trigger('click')
    await flushPromises()

    expect(mockDeleteDeck).not.toHaveBeenCalled()
  })

  test('a failed delete shows an error notice', async () => {
    confirmResponse(true)
    mockDeleteDeck.mockResolvedValue(false)
    const wrapper = mountButton()

    await wrapper.find('[data-testid="dashboard__deck-delete-button"]').trigger('click')
    await flushPromises()

    expect(mockNoticeError).toHaveBeenCalledTimes(1)
  })
})

describe('DeckGridDeleteButton — loading state', () => {
  test('reflects danger_actions.deleting as the loading prop', () => {
    mockDeletingRef.value = true
    const wrapper = mountButton()
    // UiButton renders the loading-dots icon only while loading is true.
    expect(wrapper.find('[data-testid="ui-kit-icon"][alt="loading-dots"]').exists()).toBe(true)
  })

  test('does not render the loading-dots icon when not deleting', () => {
    mockDeletingRef.value = false
    const wrapper = mountButton()
    expect(wrapper.find('[data-testid="ui-kit-icon"][alt="loading-dots"]').exists()).toBe(false)
  })
})
