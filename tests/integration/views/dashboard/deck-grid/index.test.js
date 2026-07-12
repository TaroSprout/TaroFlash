import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { routerPushMock, createDeckMock, deckSettingsOpenMock, randomCoverConfigMock } = vi.hoisted(
  () => ({
    routerPushMock: vi.fn(),
    createDeckMock: vi.fn(() => Promise.resolve({ id: 99 })),
    deckSettingsOpenMock: vi.fn(),
    randomCoverConfigMock: vi.fn(() => ({ theme: 'pink-400', pattern: 'wave', icon: 'flame' }))
  })
)

const isMatchMediaRef = ref(true)

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: routerPushMock })
}))

vi.mock('@/composables/deck/actions', () => ({
  useDeckActions: () => ({ createDeck: createDeckMock })
}))

vi.mock('@/composables/deck/settings-modal', () => ({
  useDeckSettingsModal: () => ({ open: deckSettingsOpenMock })
}))

vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: () => isMatchMediaRef
}))

vi.mock('@/utils/cover', async (importOriginal) => ({
  ...(await importOriginal()),
  randomCoverConfig: randomCoverConfigMock
}))

vi.mock('@/utils/animations/deck-grid', () => ({
  popDeckIn: vi.fn((_el, done) => done?.()),
  popDeckOut: vi.fn((_el, done) => done?.())
}))

// ── Stubs ─────────────────────────────────────────────────────────────────────

const DeckGridItemStub = defineComponent({
  name: 'DeckGridItem',
  props: ['deck', 'size'],
  emits: ['press', 'settings'],
  setup(props, { emit }) {
    return () =>
      h('div', {
        'data-testid': 'deck-grid-item',
        'data-deck-id': props.deck.id,
        onClick: () => emit('press'),
        onContextmenu: () => emit('settings')
      })
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

// ── Component import (after mocks) ────────────────────────────────────────────

import DeckGrid from '@/views/dashboard/deck-grid/index.vue'

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeDeck(id) {
  return { id, title: `Deck ${id}`, due_count: 0 }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mount(decks) {
  return shallowMount(DeckGrid, {
    props: { decks },
    global: { stubs: { DeckGridItem: DeckGridItemStub, NewDeckCard: NewDeckCardStub } }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  createDeckMock.mockResolvedValue({ id: 99 })
  randomCoverConfigMock.mockReturnValue({ theme: 'pink-400', pattern: 'wave', icon: 'flame' })
})

describe('DeckGrid — renders one item per deck plus the new-deck-card last', () => {
  test('renders a deck-grid-item for every deck', () => {
    const wrapper = mount([makeDeck(1), makeDeck(2), makeDeck(3)])
    expect(wrapper.findAll('[data-testid="deck-grid-item"]')).toHaveLength(3)
  })

  test('renders the new-deck-card as the last child of the grid', () => {
    const wrapper = mount([makeDeck(1), makeDeck(2)])
    const grid = wrapper.find('[data-testid="dashboard__decks"]')
    const children = [...grid.element.children]
    expect(children[children.length - 1].getAttribute('data-testid')).toBe('new-deck-card')
  })
})

describe('DeckGrid — deck press navigates to the deck route', () => {
  test('clicking a deck-grid-item navigates to the deck route with its id', async () => {
    const wrapper = mount([makeDeck(42)])
    await wrapper.find('[data-testid="deck-grid-item"]').trigger('click')
    expect(routerPushMock).toHaveBeenCalledWith({ name: 'deck', params: { id: 42 } })
  })
})

describe('DeckGrid — deck settings opens the deck settings modal', () => {
  test('the settings event opens the deck settings modal for that deck', async () => {
    const deck = makeDeck(7)
    const wrapper = mount([deck])
    await wrapper.find('[data-testid="deck-grid-item"]').trigger('contextmenu')
    expect(deckSettingsOpenMock).toHaveBeenCalledWith(deck)
  })
})

describe('DeckGrid — create deck', () => {
  test('clicking new-deck-card calls deck_actions.createDeck with default title, cover, and study config', async () => {
    const wrapper = mount([])
    await wrapper.find('[data-testid="new-deck-card"]').trigger('click')

    expect(createDeckMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'New Deck',
        is_public: true,
        study_config: { study_all_cards: false },
        cover_config: { theme: 'pink-400', pattern: 'wave', icon: 'flame' }
      })
    )
  })

  test('sets creating_deck as the loading prop on new-deck-card while the create is in flight', async () => {
    let resolve_create
    createDeckMock.mockImplementation(() => new Promise((r) => (resolve_create = r)))
    const wrapper = mount([])

    await wrapper.find('[data-testid="new-deck-card"]').trigger('click')
    expect(wrapper.find('[data-testid="new-deck-card"]').attributes('data-loading')).toBe('true')

    resolve_create({ id: 1 })
    await Promise.resolve()
    await Promise.resolve()
  })

  test('ignores a second press while creating_deck is already true', async () => {
    let resolve_create
    createDeckMock.mockImplementation(() => new Promise((r) => (resolve_create = r)))
    const wrapper = mount([])

    await wrapper.find('[data-testid="new-deck-card"]').trigger('click')
    await wrapper.find('[data-testid="new-deck-card"]').trigger('click')

    expect(createDeckMock).toHaveBeenCalledTimes(1)

    resolve_create({ id: 1 })
    await Promise.resolve()
    await Promise.resolve()
  })
})

describe('DeckGrid — size responds to breakpoint', () => {
  test('uses base size at >=md', () => {
    isMatchMediaRef.value = true
    const wrapper = mount([makeDeck(1)])
    expect(wrapper.findComponent(NewDeckCardStub).props('size')).toBe('base')
  })

  test('uses sm size below md', () => {
    isMatchMediaRef.value = false
    const wrapper = mount([makeDeck(1)])
    expect(wrapper.findComponent(NewDeckCardStub).props('size')).toBe('sm')
  })
})
