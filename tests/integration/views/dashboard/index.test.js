import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { noticeErrorMock } = vi.hoisted(() => ({
  noticeErrorMock: vi.fn()
}))

// Reactive state shared between mock factories and tests. Created at module
// level (not inside vi.hoisted) so Vue's ref() is available.
const decksDataRef = ref([])
const decksErrorRef = ref(null)
const useAudioReaderRef = ref(false)

vi.mock('@/api/decks', () => ({
  useMemberDecksQuery: () => ({ data: decksDataRef, error: decksErrorRef })
}))

vi.mock('@/composables/can', () => ({
  useCan: () => ({ useAudioReader: useAudioReaderRef })
}))

vi.mock('@/stores/notice-store', () => ({
  useNoticeStore: () => ({ error: noticeErrorMock, success: vi.fn(), warn: vi.fn() })
}))

// The real DeckGrid and DashboardActionsPanel modules are still imported (only
// their render output is stubbed below), so their own composable dependencies
// must resolve. None of this behavior is under test here — it's covered
// directly in deck-grid/index.test.js and actions-panel/index.test.js.

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() })
}))

vi.mock('@/composables/deck/actions', () => ({
  useDeckActions: () => ({ createDeck: vi.fn() })
}))

vi.mock('@/composables/deck/settings-modal', () => ({
  useDeckSettingsModal: () => ({ open: vi.fn() })
}))

vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: () => ref(true)
}))

vi.mock('@/composables/storage/local-ref', () => ({
  useLocalRef: () => ref(false)
}))

vi.mock('@/stores/member', () => ({
  useMemberStore: () => ({ display_name: 'Test User', description: '', cover: {} })
}))

vi.mock('@/views/study-session/composables/study-modal', () => ({
  useStudyModal: () => ({ start: vi.fn() })
}))

// ── Stubs ─────────────────────────────────────────────────────────────────────

const DashboardActionsPanelStub = defineComponent({
  name: 'DashboardActionsPanel',
  props: ['due_decks'],
  setup(props) {
    return () =>
      h('div', {
        'data-testid': 'dashboard-actions-panel',
        'data-due-count': props.due_decks.length
      })
  }
})

const DashboardSectionStub = defineComponent({
  name: 'DashboardSection',
  props: ['label'],
  setup(props, { slots }) {
    return () =>
      h('section', { 'data-testid': 'dashboard-section', 'data-label': props.label }, [
        slots.subheader?.(),
        slots.default?.()
      ])
  }
})

const ReviewInboxStub = defineComponent({
  name: 'ReviewInbox',
  props: ['due_decks'],
  setup(props) {
    return () =>
      h('div', { 'data-testid': 'review-inbox', 'data-deck-count': props.due_decks.length })
  }
})

const DeckGridStub = defineComponent({
  name: 'DeckGrid',
  props: ['decks'],
  setup(props) {
    return () => h('div', { 'data-testid': 'deck-grid', 'data-deck-count': props.decks.length })
  }
})

const DeckGridSortOptionsStub = defineComponent({
  name: 'DeckGridSortOptions',
  setup() {
    return () => h('div', { 'data-testid': 'deck-grid-sort-options' })
  }
})

const AudioReaderSectionStub = defineComponent({
  name: 'AudioReaderSection',
  setup() {
    return () => h('div', { 'data-testid': 'audio-reader-section' })
  }
})

// ── Component import (after mocks) ────────────────────────────────────────────

import DashboardIndex from '@/views/dashboard/index.vue'

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeDeck(id, { due_count = 0, created_at = `2026-01-0${id}` } = {}) {
  return { id, title: `Deck ${id}`, due_count, created_at }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mountDashboard() {
  return shallowMount(DashboardIndex, {
    global: {
      stubs: {
        DashboardActionsPanel: DashboardActionsPanelStub,
        DashboardSection: DashboardSectionStub,
        ReviewInbox: ReviewInboxStub,
        DeckGrid: DeckGridStub,
        DeckGridSortOptions: DeckGridSortOptionsStub,
        AudioReaderSection: AudioReaderSectionStub
      }
    }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  decksDataRef.value = []
  decksErrorRef.value = null
  useAudioReaderRef.value = false
  vi.clearAllMocks()
})

describe('DashboardIndex — deck ordering', () => {
  test('sorts decks by created_at ascending before passing to DeckGrid', () => {
    decksDataRef.value = [
      makeDeck(3, { created_at: '2026-03-01' }),
      makeDeck(1, { created_at: '2026-01-01' }),
      makeDeck(2, { created_at: '2026-02-01' })
    ]
    const wrapper = mountDashboard()
    expect(
      wrapper
        .findComponent(DeckGridStub)
        .props('decks')
        .map((d) => d.id)
    ).toEqual([1, 2, 3])
  })
})

describe('DashboardIndex — due decks derivation', () => {
  test('passes only decks with due_count > 0 to actions-panel and review-inbox', () => {
    decksDataRef.value = [
      makeDeck(1, { due_count: 3 }),
      makeDeck(2, { due_count: 0 }),
      makeDeck(3, { due_count: 1 })
    ]
    const wrapper = mountDashboard()
    expect(wrapper.findComponent(DashboardActionsPanelStub).props('due_decks')).toHaveLength(2)
    expect(wrapper.findComponent(ReviewInboxStub).props('due_decks')).toHaveLength(2)
  })
})

describe('DashboardIndex — review-inbox visibility', () => {
  test('review-inbox section is rendered when there are due decks', () => {
    decksDataRef.value = [makeDeck(1, { due_count: 3 })]
    const wrapper = mountDashboard()
    expect(wrapper.find('[data-testid="review-inbox"]').exists()).toBe(true)
  })

  test('review-inbox section is not rendered when there are no due decks', () => {
    decksDataRef.value = [makeDeck(1, { due_count: 0 })]
    const wrapper = mountDashboard()
    expect(wrapper.find('[data-testid="review-inbox"]').exists()).toBe(false)
  })
})

describe('DashboardIndex — deck-grid sort options in the all-decks subheader', () => {
  test('renders the sort-options component inside the all-decks dashboard-section subheader', () => {
    const wrapper = mountDashboard()
    const sections = wrapper.findAllComponents(DashboardSectionStub)
    const allSection = sections.find((s) => s.props('label') === 'All Decks')
    expect(allSection.find('[data-testid="deck-grid-sort-options"]').exists()).toBe(true)
  })
})

describe('DashboardIndex — audio-reader-section gated on useAudioReader', () => {
  test('renders audio-reader-section when useAudioReader is true', () => {
    useAudioReaderRef.value = true
    const wrapper = mountDashboard()
    expect(wrapper.find('[data-testid="audio-reader-section"]').exists()).toBe(true)
  })

  test('does not render audio-reader-section when useAudioReader is false', () => {
    useAudioReaderRef.value = false
    const wrapper = mountDashboard()
    expect(wrapper.find('[data-testid="audio-reader-section"]').exists()).toBe(false)
  })
})

describe('DashboardIndex — decks error watch', () => {
  test('calls notice.error when decks query returns an error', async () => {
    mountDashboard()
    decksErrorRef.value = { message: 'Network error' }
    await Promise.resolve()
    expect(noticeErrorMock).toHaveBeenCalledWith('Network error')
  })
})
