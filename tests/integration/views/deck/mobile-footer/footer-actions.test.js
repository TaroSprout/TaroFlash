import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mockFadeEnter, mockFadeLeave } = vi.hoisted(() => ({
  mockFadeEnter: vi.fn((_el, done) => done?.()),
  mockFadeLeave: vi.fn((_el, done) => done?.())
}))

vi.mock('@/utils/animations/fade', () => ({
  fadeEnter: mockFadeEnter,
  fadeLeave: mockFadeLeave
}))

// ── Imports ───────────────────────────────────────────────────────────────────

import FooterActions from '@/views/deck/mobile-footer/footer-actions.vue'
import SearchBar from '@/views/deck/search-bar.vue'
import { cardSearchKey } from '@/views/deck/composables/card-search'

// ── Helpers ───────────────────────────────────────────────────────────────────

// Vue Transition JS hooks fire after 2 rAF callbacks even with :css="false"
async function flushTransition() {
  await nextTick()
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  await flushPromises()
}

// ── Stubs ─────────────────────────────────────────────────────────────────────

// Renders slot content so template lines inside <ui-button> are covered
const UiButtonStub = defineComponent({
  name: 'UiButton',
  setup(_p, { slots, attrs }) {
    return () => h('div', { ...attrs }, slots.default?.())
  }
})

// ── Factory ───────────────────────────────────────────────────────────────────

function makeSearch({ is_searching = false } = {}) {
  return { is_searching: ref(is_searching) }
}

function mountFooterActions(search = makeSearch()) {
  return shallowMount(FooterActions, {
    global: {
      // Use the real <Transition> so @enter/@leave JS hooks fire
      stubs: { Transition: false, UiButton: UiButtonStub },
      provide: { [cardSearchKey]: search }
    }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('mobile-footer/footer-actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders the footer actions container', () => {
    const wrapper = mountFooterActions()
    expect(wrapper.find('[data-testid="deck-footer-actions"]').exists()).toBe(true)
  })

  // SearchBar is always present regardless of search state
  test('always renders SearchBar [obligation]', () => {
    const wrapper = mountFooterActions(makeSearch({ is_searching: false }))
    expect(wrapper.findComponent(SearchBar).exists()).toBe(true)
  })

  test('SearchBar is still rendered while searching', () => {
    const wrapper = mountFooterActions(makeSearch({ is_searching: true }))
    expect(wrapper.findComponent(SearchBar).exists()).toBe(true)
  })

  // Action buttons are hidden while search is open
  test('shows rest-actions (new-card, view-options) when not searching [obligation]', () => {
    const wrapper = mountFooterActions(makeSearch({ is_searching: false }))
    expect(wrapper.find('[data-testid="deck-footer-actions__rest"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="deck-footer-actions__new-card"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="deck-footer-actions__view-options"]').exists()).toBe(true)
  })

  test('hides rest-actions when searching is active [obligation]', () => {
    const wrapper = mountFooterActions(makeSearch({ is_searching: true }))
    expect(wrapper.find('[data-testid="deck-footer-actions__rest"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="deck-footer-actions__new-card"]').exists()).toBe(false)
  })

  // Reactive toggle
  test('rest-actions appear when is_searching flips from true to false', async () => {
    const search = makeSearch({ is_searching: true })
    const wrapper = mountFooterActions(search)
    expect(wrapper.find('[data-testid="deck-footer-actions__rest"]').exists()).toBe(false)

    search.is_searching.value = false
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="deck-footer-actions__rest"]').exists()).toBe(true)
  })

  test('rest-actions hide when is_searching flips from false to true', async () => {
    const search = makeSearch({ is_searching: false })
    const wrapper = mountFooterActions(search)
    expect(wrapper.find('[data-testid="deck-footer-actions__rest"]').exists()).toBe(true)

    search.is_searching.value = true
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="deck-footer-actions__rest"]').exists()).toBe(false)
  })

  // ── Transition JS hooks (onActionsEnter / onActionsLeave) ──────────────────

  test('rest-actions enter transition calls fadeEnter [obligation]', async () => {
    const search = makeSearch({ is_searching: true })
    mountFooterActions(search)
    // Flip to false → rest-actions div enters the DOM → onActionsEnter fires
    search.is_searching.value = false
    await flushTransition()
    expect(mockFadeEnter).toHaveBeenCalled()
  })

  test('rest-actions leave transition calls fadeLeave [obligation]', async () => {
    const search = makeSearch({ is_searching: false })
    mountFooterActions(search)
    // Flip to true → rest-actions div leaves the DOM → onActionsLeave fires
    search.is_searching.value = true
    await flushTransition()
    expect(mockFadeLeave).toHaveBeenCalled()
  })
})
