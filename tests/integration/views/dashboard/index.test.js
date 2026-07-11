import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────
// Only functions/fn refs go in vi.hoisted — Vue ref() is not available there.

const {
  routerPushMock,
  createDeckMock,
  deckSettingsOpenMock,
  studyStartMock,
  noticeErrorMock,
  randomCoverConfigMock
} = vi.hoisted(() => ({
  routerPushMock: vi.fn(),
  createDeckMock: vi.fn(() => Promise.resolve({ id: 99 })),
  deckSettingsOpenMock: vi.fn(),
  studyStartMock: vi.fn(),
  noticeErrorMock: vi.fn(),
  randomCoverConfigMock: vi.fn(() => ({ theme: 'pink-400', pattern: 'wave', icon: 'book' }))
}))

// Reactive state shared between mock factories and tests. Created at module
// level (not inside vi.hoisted) so Vue's ref() is available.
const decksDataRef = ref([])
const decksErrorRef = ref(null)
const showDashboardActionsRef = ref(false)
const isMatchMediaRef = ref(true)

vi.mock('@/api/decks', () => ({
  useMemberDecksQuery: () => ({ data: decksDataRef, error: decksErrorRef })
}))

vi.mock('@/stores/member', () => ({
  useMemberStore: () => ({
    display_name: 'Test User',
    description: 'Learner',
    cover: { theme: 'green-500', theme_dark: 'green-800', pattern: 'bank-note' }
  })
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: routerPushMock })
}))

vi.mock('@/composables/deck/actions', () => ({
  useDeckActions: () => ({ createDeck: createDeckMock })
}))

vi.mock('@/composables/deck/settings-modal', () => ({
  useDeckSettingsModal: () => ({ open: deckSettingsOpenMock })
}))

vi.mock('@/views/study-session/composables/study-modal', () => ({
  useStudyModal: () => ({ start: studyStartMock })
}))

vi.mock('@/composables/can', () => ({
  useCan: () => ({ useAudioReader: ref(false) })
}))

vi.mock('@/composables/storage/local-ref', () => ({
  useLocalRef: () => showDashboardActionsRef
}))

vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: () => isMatchMediaRef
}))

vi.mock('@/stores/notice-store', () => ({
  useNoticeStore: () => ({ error: noticeErrorMock, success: vi.fn(), warn: vi.fn() })
}))

vi.mock('@/utils/cover', async (importOriginal) => ({
  ...(await importOriginal()),
  randomCoverConfig: randomCoverConfigMock
}))

vi.mock('@/utils/animations/dashboard-actions', () => ({
  actionsSwingBeforeEnter: vi.fn(),
  actionsSwingEnter: vi.fn((_el, done) => done?.()),
  actionsSwingLeave: vi.fn((_el, done) => done?.())
}))

vi.mock('@/utils/animations/deck-grid', () => ({
  popDeckIn: vi.fn((_el, done) => done?.()),
  popDeckOut: vi.fn((_el, done) => done?.())
}))

// ── Stubs ─────────────────────────────────────────────────────────────────────

const MemberBadgeStub = defineComponent({
  name: 'MemberBadge',
  props: ['displayName', 'description', 'sfx', 'cover'],
  emits: ['click'],
  setup(props, { emit, slots }) {
    return () =>
      h(
        'div',
        {
          'data-testid': 'member-badge',
          'data-cover-theme': props.cover?.theme,
          onClick: () => emit('click')
        },
        [slots.description?.(), slots.actions?.()]
      )
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

const DeckThumbnailStub = defineComponent({
  name: 'DeckThumbnail',
  props: ['deck', 'size'],
  emits: ['press'],
  setup(props, { emit, slots }) {
    return () =>
      h(
        'div',
        {
          'data-testid': 'deck-thumbnail',
          'data-deck-id': props.deck.id,
          onClick: () => emit('press')
        },
        [slots['corner-action']?.()]
      )
  }
})

const NewDeckCardStub = defineComponent({
  name: 'NewDeckCard',
  props: ['size', 'loading'],
  emits: ['press'],
  setup(props, { emit }) {
    return () =>
      h('div', {
        'data-testid': 'new-deck-card',
        'data-loading': String(!!props.loading),
        onClick: () => emit('press')
      })
  }
})

const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  props: ['iconLeft', 'size', 'iconOnly'],
  emits: ['press'],
  setup(_p, { slots, attrs, emit }) {
    return () =>
      h(
        'button',
        {
          'data-testid': attrs['data-testid'] ?? 'ui-button',
          // Forward onClick from attrs so Vue's .stop modifier applied by the
          // parent resolves against the native MouseEvent.
          onClick: (e) => {
            attrs.onClick?.(e)
            emit('press')
          }
        },
        [slots.default?.()]
      )
  }
})

const UiIconStub = defineComponent({
  name: 'UiIcon',
  props: ['src'],
  setup() {
    return () => h('span', { 'data-testid': 'ui-icon' })
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
        MemberBadge: MemberBadgeStub,
        ReviewInbox: ReviewInboxStub,
        DeckThumbnail: DeckThumbnailStub,
        NewDeckCard: NewDeckCardStub,
        UiButton: UiButtonStub,
        UiIcon: UiIconStub,
        AudioReaderSection: AudioReaderSectionStub
      }
    }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  decksDataRef.value = []
  decksErrorRef.value = null
  showDashboardActionsRef.value = false
  vi.clearAllMocks()
  createDeckMock.mockResolvedValue({ id: 99 })
  randomCoverConfigMock.mockReturnValue({ theme: 'pink-400', pattern: 'wave', icon: 'book' })
})

describe('DashboardIndex — member-badge cover wiring', () => {
  test('forwards member_store.cover to the member-badge cover prop', () => {
    const wrapper = mountDashboard()
    expect(wrapper.find('[data-testid="member-badge"]').attributes('data-cover-theme')).toBe(
      'green-500'
    )
  })
})

describe('DashboardIndex — member-badge description [obligation]', () => {
  test('does not fill the description slot — badge falls back to its default', () => {
    const wrapper = mountDashboard()
    expect(wrapper.find('[data-testid="member-badge"]').text()).toBe('')
  })
})

describe('DashboardIndex — deck grid ordering [obligation]', () => {
  test('sorts decks by created_at ascending', () => {
    decksDataRef.value = [
      makeDeck(3, { created_at: '2026-03-01' }),
      makeDeck(1, { created_at: '2026-01-01' }),
      makeDeck(2, { created_at: '2026-02-01' })
    ]
    const wrapper = mountDashboard()
    const ids = wrapper
      .findAll('[data-testid="deck-thumbnail"]')
      .map((w) => w.attributes('data-deck-id'))
    expect(ids).toEqual(['1', '2', '3'])
  })

  test('renders the new-deck-card as the last child of the deck grid [obligation]', () => {
    decksDataRef.value = [makeDeck(1), makeDeck(2)]
    const wrapper = mountDashboard()
    const grid = wrapper.find('[data-testid="dashboard__decks"]')
    const children = [...grid.element.children]
    const last = children[children.length - 1]
    expect(last.getAttribute('data-testid')).toBe('new-deck-card')
  })
})

describe('DashboardIndex — create deck [obligation]', () => {
  test('clicking new-deck-card calls deck_actions.createDeck with default title, cover, and study config', async () => {
    const wrapper = mountDashboard()
    await wrapper.find('[data-testid="new-deck-card"]').trigger('click')

    expect(createDeckMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'New Deck',
        is_public: true,
        study_config: { study_all_cards: false },
        cover_config: { theme: 'pink-400', pattern: 'wave', icon: 'book' }
      })
    )
  })

  test('passes creating_deck as the loading prop on new-deck-card while the create is in flight', async () => {
    let resolve_create
    createDeckMock.mockImplementation(() => new Promise((r) => (resolve_create = r)))
    const wrapper = mountDashboard()

    await wrapper.find('[data-testid="new-deck-card"]').trigger('click')
    expect(wrapper.find('[data-testid="new-deck-card"]').attributes('data-loading')).toBe('true')

    resolve_create({ id: 1 })
    await Promise.resolve()
    await Promise.resolve()
  })

  test('ignores a second press while creating_deck is already true [obligation]', async () => {
    let resolve_create
    createDeckMock.mockImplementation(() => new Promise((r) => (resolve_create = r)))
    const wrapper = mountDashboard()

    await wrapper.find('[data-testid="new-deck-card"]').trigger('click')
    await wrapper.find('[data-testid="new-deck-card"]').trigger('click')

    expect(createDeckMock).toHaveBeenCalledTimes(1)

    resolve_create({ id: 1 })
    await Promise.resolve()
    await Promise.resolve()
  })
})

describe('DashboardIndex — onBadgeClick / show_dashboard_actions', () => {
  test('clicking member-badge with due decks toggles show_dashboard_actions to true', async () => {
    decksDataRef.value = [makeDeck(1, { due_count: 5 })]
    const wrapper = mountDashboard()
    await wrapper.find('[data-testid="member-badge"]').trigger('click')
    expect(showDashboardActionsRef.value).toBe(true)
  })

  test('onBadgeClick does not flip show_dashboard_actions when due_decks is empty', async () => {
    decksDataRef.value = [makeDeck(1, { due_count: 0 })]
    const wrapper = mountDashboard()
    await wrapper.find('[data-testid="member-badge"]').trigger('click')
    expect(showDashboardActionsRef.value).toBe(false)
  })

  test('clicking member-badge twice with due decks toggles show_dashboard_actions back to false', async () => {
    decksDataRef.value = [makeDeck(1, { due_count: 3 })]
    const wrapper = mountDashboard()
    await wrapper.find('[data-testid="member-badge"]').trigger('click')
    expect(showDashboardActionsRef.value).toBe(true)
    await wrapper.find('[data-testid="member-badge"]').trigger('click')
    expect(showDashboardActionsRef.value).toBe(false)
  })
})

describe('DashboardIndex — actions panel is a placeholder with only Study All [obligation]', () => {
  test('does not render the actions panel when show_dashboard_actions is false', () => {
    decksDataRef.value = [makeDeck(1, { due_count: 3 })]
    showDashboardActionsRef.value = false
    const wrapper = mountDashboard()
    expect(wrapper.find('[data-testid="dashboard__actions-panel"]').exists()).toBe(false)
  })

  test('renders the actions panel with only the Study All button when shown', () => {
    decksDataRef.value = [makeDeck(1, { due_count: 3 })]
    showDashboardActionsRef.value = true
    const wrapper = mountDashboard()
    const panel = wrapper.find('[data-testid="dashboard__actions-panel"]')
    expect(panel.exists()).toBe(true)
    expect(panel.findAllComponents(UiButtonStub)).toHaveLength(1)
  })

  test('does not render the actions panel even if shown when there are no due decks', () => {
    decksDataRef.value = [makeDeck(1, { due_count: 0 })]
    showDashboardActionsRef.value = true
    const wrapper = mountDashboard()
    expect(wrapper.find('[data-testid="dashboard__actions-panel"]').exists()).toBe(false)
  })

  test('shows the study-all label when there are 3 or more due decks [obligation]', () => {
    decksDataRef.value = [
      makeDeck(1, { due_count: 1 }),
      makeDeck(2, { due_count: 1 }),
      makeDeck(3, { due_count: 1 })
    ]
    showDashboardActionsRef.value = true
    const wrapper = mountDashboard()
    expect(wrapper.find('[data-testid="dashboard__actions-panel"] button').text()).toContain(
      'Study all'
    )
  })

  test('clicking the Study All button starts a study session for every due deck', async () => {
    const decks = [makeDeck(1, { due_count: 3 }), makeDeck(2, { due_count: 1 })]
    decksDataRef.value = decks
    showDashboardActionsRef.value = true
    const wrapper = mountDashboard()

    await wrapper.find('[data-testid="dashboard__actions-panel"] button').trigger('click')

    expect(studyStartMock).toHaveBeenCalledWith(decks)
  })
})

describe('DashboardIndex — review-inbox visibility [obligation]', () => {
  test('review-inbox is rendered in the right column when there are due decks', () => {
    decksDataRef.value = [makeDeck(1, { due_count: 3 })]
    const wrapper = mountDashboard()
    expect(wrapper.find('[data-testid="review-inbox"]').exists()).toBe(true)
  })

  test('review-inbox is not rendered when there are no due decks', () => {
    decksDataRef.value = [makeDeck(1, { due_count: 0 })]
    const wrapper = mountDashboard()
    expect(wrapper.find('[data-testid="review-inbox"]').exists()).toBe(false)
  })

  test('review-inbox rendering does not depend on show_dashboard_actions', () => {
    decksDataRef.value = [makeDeck(1, { due_count: 3 })]
    showDashboardActionsRef.value = false
    const wrapper = mountDashboard()
    expect(wrapper.find('[data-testid="review-inbox"]').exists()).toBe(true)
  })
})

describe('DashboardIndex — deck settings via corner-action [obligation]', () => {
  test('clicking the settings button opens the deck settings modal for that deck', async () => {
    const deck = makeDeck(7, { due_count: 0 })
    decksDataRef.value = [deck]
    const wrapper = mountDashboard()

    await wrapper.find('[data-testid="dashboard__deck-settings-button"]').trigger('click')

    expect(deckSettingsOpenMock).toHaveBeenCalledWith(deck)
  })

  test('clicking the settings button does not also navigate the parent deck card', async () => {
    decksDataRef.value = [makeDeck(7, { due_count: 0 })]
    const wrapper = mountDashboard()

    await wrapper.find('[data-testid="dashboard__deck-settings-button"]').trigger('click')

    expect(routerPushMock).not.toHaveBeenCalled()
  })

  test('clicking the deck-thumbnail itself (not the settings button) navigates to the deck route', async () => {
    decksDataRef.value = [makeDeck(42, { due_count: 0 })]
    const wrapper = mountDashboard()
    await wrapper.find('[data-testid="deck-thumbnail"]').trigger('click')
    expect(routerPushMock).toHaveBeenCalledWith({ name: 'deck', params: { id: 42 } })
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
