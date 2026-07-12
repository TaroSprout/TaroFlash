import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { noticeErrorMock, mockEmitSfx } = vi.hoisted(() => ({
  noticeErrorMock: vi.fn(),
  mockEmitSfx: vi.fn()
}))

// Reactive state shared between mock factories and tests. Created at module
// level (not inside vi.hoisted) so Vue's ref() is available.
const decksDataRef = ref([])
const decksErrorRef = ref(null)
const useAudioReaderRef = ref(false)

vi.mock('@/api/decks', () => ({
  useMemberDecksQuery: () => ({ data: decksDataRef, error: decksErrorRef }),
  // Not exercised here (DeckGrid is stubbed by name below) — only needs to
  // exist so the real deck-grid module graph (statically imported for the
  // stub-by-name resolution) can resolve this named import. That graph now
  // reaches deck-grid/delete-button.vue -> composables/deck/editor.ts, which
  // imports useDeleteDeckMutation.
  useMoveDeckMutation: () => ({ mutateAsync: () => Promise.resolve() }),
  useDeleteDeckMutation: () => ({ mutateAsync: () => Promise.resolve() })
}))

vi.mock('@/sfx/bus', () => ({
  emitSfx: mockEmitSfx,
  emitHoverSfx: vi.fn()
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
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ name: 'dashboard', params: {} })
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
  props: ['due_decks', 'editing_decks'],
  emits: ['toggle-edit-decks'],
  setup(props, { emit }) {
    return () =>
      h('div', {
        'data-testid': 'dashboard-actions-panel',
        'data-due-count': props.due_decks.length,
        'data-editing-decks': String(!!props.editing_decks),
        onClick: () => emit('toggle-edit-decks')
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
  props: ['decks', 'editing'],
  setup(props) {
    return () =>
      h('div', {
        'data-testid': 'deck-grid',
        'data-deck-count': props.decks.length,
        'data-editing': String(!!props.editing)
      })
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

function makeDeck(id, { due_count = 0, rank = id } = {}) {
  return { id, title: `Deck ${id}`, due_count, rank }
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
  test('sorts decks by rank ascending before passing to DeckGrid [obligation]', () => {
    decksDataRef.value = [
      makeDeck(3, { rank: 30 }),
      makeDeck(1, { rank: 10 }),
      makeDeck(2, { rank: 20 })
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

describe('DashboardIndex — edit-decks toggle', () => {
  test('editing_decks starts false and is forwarded to deck-grid as editing', () => {
    const wrapper = mountDashboard()
    expect(wrapper.findComponent(DeckGridStub).props('editing')).toBe(false)
  })

  test('toggle-edit-decks from the actions panel flips editing on, and again flips it off [obligation]', async () => {
    const wrapper = mountDashboard()
    await wrapper.find('[data-testid="dashboard-actions-panel"]').trigger('click')
    expect(wrapper.findComponent(DeckGridStub).props('editing')).toBe(true)

    await wrapper.find('[data-testid="dashboard-actions-panel"]').trigger('click')
    expect(wrapper.findComponent(DeckGridStub).props('editing')).toBe(false)
  })

  test('emits pop_up_pop sfx when editing_decks flips true, and digi_powerdown when it flips false [obligation]', async () => {
    const wrapper = mountDashboard()
    await wrapper.find('[data-testid="dashboard-actions-panel"]').trigger('click')
    expect(mockEmitSfx).toHaveBeenCalledWith('pop_up_pop')

    mockEmitSfx.mockClear()
    await wrapper.find('[data-testid="dashboard-actions-panel"]').trigger('click')
    expect(mockEmitSfx).toHaveBeenCalledWith('digi_powerdown')
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
