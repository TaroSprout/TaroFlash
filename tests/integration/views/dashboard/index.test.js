import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────
// Only functions/fn refs go in vi.hoisted — Vue ref() is not available there.

const {
  routerPushMock,
  guardCreateDeckMock,
  deckCreateModalOpenMock,
  phoneOpenByTitleMock,
  toastErrorMock
} = vi.hoisted(() => ({
  routerPushMock: vi.fn(),
  guardCreateDeckMock: vi.fn(() => Promise.resolve(true)),
  deckCreateModalOpenMock: vi.fn(),
  phoneOpenByTitleMock: vi.fn(),
  toastErrorMock: vi.fn()
}))

// Reactive state shared between mock factories and tests. Created at module
// level (not inside vi.hoisted) so Vue's ref() is available.
const decksDataRef = ref([])
const decksErrorRef = ref(null)
const localShowInboxRef = ref(false)
const isMatchMediaRef = ref(true)

vi.mock('@/api/decks', () => ({
  useMemberDecksQuery: () => ({ data: decksDataRef, error: decksErrorRef }),
  useMemberDeckCountQuery: () => ({ data: ref(0) })
}))

vi.mock('@/stores/member', () => ({
  useMemberStore: () => ({ display_name: 'Test User', description: 'Learner' })
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: routerPushMock })
}))

vi.mock('@/composables/deck/create-modal', () => ({
  useDeckCreateModal: () => ({ open: deckCreateModalOpenMock })
}))

vi.mock('@/composables/deck/actions', () => ({
  useDeckActions: () => ({ guardCreateDeck: guardCreateDeckMock })
}))

vi.mock('@/composables/can', () => ({
  useCan: () => ({ useAudioReader: ref(false), createDeck: ref(true) })
}))

vi.mock('@/composables/storage/local-ref', () => ({
  useLocalRef: (_key, _default) => localShowInboxRef
}))

vi.mock('@/phone/system/os', () => ({
  usePhoneOS: () => ref({ openByTitle: phoneOpenByTitleMock })
}))

vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: () => isMatchMediaRef
}))

vi.mock('@/composables/toast', () => ({
  useToast: () => ({ error: toastErrorMock, success: vi.fn() })
}))

vi.mock('@/utils/animations/inbox-toggle', () => ({
  inboxSwingBeforeEnter: vi.fn(),
  inboxSwingEnter: vi.fn((_el, done) => done?.()),
  inboxSwingLeave: vi.fn((_el, done) => done?.())
}))

// ── Stubs ─────────────────────────────────────────────────────────────────────

const MemberBadgeStub = defineComponent({
  name: 'MemberBadge',
  props: ['displayName', 'description', 'sfx'],
  emits: ['click'],
  setup(_p, { emit, slots }) {
    return () =>
      h('div', { 'data-testid': 'member-badge', onClick: () => emit('click') }, [
        slots.description?.(),
        slots.actions?.()
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

const DeckThumbnailStub = defineComponent({
  name: 'DeckThumbnail',
  props: ['deck', 'size'],
  emits: ['click'],
  setup(props, { emit }) {
    return () =>
      h('div', {
        'data-testid': 'deck-thumbnail',
        'data-deck-id': props.deck.id,
        onClick: () => emit('click')
      })
  }
})

const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  props: ['iconLeft', 'size', 'iconOnly', 'inverted'],
  setup(_p, { slots, attrs }) {
    return () =>
      h(
        'button',
        {
          'data-testid': attrs['data-testid'] ?? 'ui-button',
          // Forward onClick from attrs so Vue's .stop / .prevent modifiers
          // applied by the parent resolve against the native MouseEvent.
          onClick: attrs.onClick
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

function makeDeck(id, due_count = 0) {
  return { id, title: `Deck ${id}`, due_count }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mountDashboard() {
  return shallowMount(DashboardIndex, {
    global: {
      stubs: {
        MemberBadge: MemberBadgeStub,
        ReviewInbox: ReviewInboxStub,
        DeckThumbnail: DeckThumbnailStub,
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
  localShowInboxRef.value = false
  vi.clearAllMocks()
  guardCreateDeckMock.mockReturnValue(Promise.resolve(true))
  toastErrorMock.mockReset()
})

describe('DashboardIndex — deck list', () => {
  test('renders a deck-thumbnail for each deck', () => {
    decksDataRef.value = [makeDeck(1), makeDeck(2), makeDeck(3)]
    const wrapper = mountDashboard()
    expect(wrapper.findAll('[data-testid="deck-thumbnail"]')).toHaveLength(3)
  })

  test('clicking a deck thumbnail navigates to the deck route', async () => {
    decksDataRef.value = [makeDeck(42)]
    const wrapper = mountDashboard()
    await wrapper.find('[data-testid="deck-thumbnail"]').trigger('click')
    expect(routerPushMock).toHaveBeenCalledWith({ name: 'deck', params: { id: 42 } })
  })

  test('shows empty deck list when no decks are present', () => {
    decksDataRef.value = []
    const wrapper = mountDashboard()
    expect(wrapper.findAll('[data-testid="deck-thumbnail"]')).toHaveLength(0)
  })
})

describe('DashboardIndex — onBadgeClick / show_inbox', () => {
  test('clicking member-badge with due decks toggles show_inbox to true', async () => {
    decksDataRef.value = [makeDeck(1, 5)]
    const wrapper = mountDashboard()
    await wrapper.find('[data-testid="member-badge"]').trigger('click')
    expect(localShowInboxRef.value).toBe(true)
  })

  test('onBadgeClick does not flip show_inbox when due_decks is empty [obligation]', async () => {
    decksDataRef.value = [makeDeck(1, 0)]
    const wrapper = mountDashboard()
    expect(localShowInboxRef.value).toBe(false)
    await wrapper.find('[data-testid="member-badge"]').trigger('click')
    expect(localShowInboxRef.value).toBe(false)
  })

  test('onBadgeClick does not flip show_inbox when there are no decks at all [obligation]', async () => {
    decksDataRef.value = []
    const wrapper = mountDashboard()
    await wrapper.find('[data-testid="member-badge"]').trigger('click')
    expect(localShowInboxRef.value).toBe(false)
  })

  test('clicking member-badge twice with due decks toggles show_inbox back to false', async () => {
    decksDataRef.value = [makeDeck(1, 3)]
    const wrapper = mountDashboard()
    await wrapper.find('[data-testid="member-badge"]').trigger('click')
    expect(localShowInboxRef.value).toBe(true)
    await wrapper.find('[data-testid="member-badge"]').trigger('click')
    expect(localShowInboxRef.value).toBe(false)
  })
})

describe('DashboardIndex — review inbox visibility', () => {
  test('review-inbox is not shown when show_inbox is false', () => {
    decksDataRef.value = [makeDeck(1, 3)]
    localShowInboxRef.value = false
    const wrapper = mountDashboard()
    expect(wrapper.find('[data-testid="review-inbox"]').exists()).toBe(false)
  })

  test('review-inbox is shown when show_inbox is true and there are due decks', () => {
    decksDataRef.value = [makeDeck(1, 3)]
    localShowInboxRef.value = true
    const wrapper = mountDashboard()
    expect(wrapper.find('[data-testid="review-inbox"]').exists()).toBe(true)
  })

  test('review-inbox is not shown even if show_inbox is true when due_decks is empty', () => {
    decksDataRef.value = [makeDeck(1, 0)]
    localShowInboxRef.value = true
    const wrapper = mountDashboard()
    expect(wrapper.find('[data-testid="review-inbox"]').exists()).toBe(false)
  })
})

describe('DashboardIndex — edit button opens settings', () => {
  test('clicking edit button calls phone.openByTitle("Settings")', async () => {
    const wrapper = mountDashboard()
    await wrapper.find('[data-testid="member-badge__edit-button"]').trigger('click')
    expect(phoneOpenByTitleMock).toHaveBeenCalledWith('Settings')
  })
})

describe('DashboardIndex — create deck', () => {
  test('clicking create deck button calls guardCreateDeck', async () => {
    guardCreateDeckMock.mockResolvedValue(true)
    const wrapper = mountDashboard()
    // Find the create-deck button — it has no data-testid in the template,
    // but is the first ui-button without a data-testid in the left column.
    const buttons = wrapper.findAll('[data-testid="ui-button"]')
    await buttons[0].trigger('click')
    expect(guardCreateDeckMock).toHaveBeenCalled()
  })
})

describe('DashboardIndex — decks error watch', () => {
  test('calls toast.error when decks query returns an error', async () => {
    mountDashboard()
    decksErrorRef.value = { message: 'Network error' }
    await Promise.resolve()
    expect(toastErrorMock).toHaveBeenCalledWith('Network error')
  })
})
