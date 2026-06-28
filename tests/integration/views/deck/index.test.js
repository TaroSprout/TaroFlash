import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, ref, computed, isRef } from 'vue'

const {
  useDeckQueryMock,
  useCardListControllerMock,
  useDeckViewShellMock,
  useCardSearchMock,
  useCardSortMock
} = vi.hoisted(() => ({
  useDeckQueryMock: vi.fn(),
  useCardListControllerMock: vi.fn(),
  useDeckViewShellMock: vi.fn(),
  useCardSearchMock: vi.fn(),
  useCardSortMock: vi.fn()
}))

// card-face-uploader (reached statically via mode-stack → list-item-card) now
// imports useCan, which pulls useMemberDeckCountQuery from this barrel — so the
// mock must expose it too, or ESM linking of the graph fails.
vi.mock('@/api/decks', () => ({
  useDeckQuery: useDeckQueryMock,
  useMemberDeckCountQuery: () => ({ data: { value: 0 }, refresh: vi.fn() }),
  useMemberDecksQuery: () => ({ data: { value: [] }, refresh: vi.fn() })
}))
vi.mock('@/views/deck/composables/list-controller', () => ({
  cardEditorKey: Symbol('cardEditor'),
  useCardListController: useCardListControllerMock
}))
vi.mock('@/views/deck/composables/view-shell', () => ({
  deckViewShellKey: Symbol('deckViewShell'),
  useDeckViewShell: useDeckViewShellMock
}))
vi.mock('@/views/deck/composables/card-search', () => ({
  cardSearchKey: Symbol('cardSearch'),
  useCardSearch: useCardSearchMock
}))
vi.mock('@/views/deck/composables/card-sort', () => ({
  useCardSort: useCardSortMock
}))

import DeckView from '@/views/deck/index.vue'

const DeckHeroStub = defineComponent({
  name: 'DeckHero',
  setup: () => () => h('div', { 'data-testid': 'deck-hero-stub' })
})
const ModeToolbarStub = defineComponent({
  name: 'ModeToolbar',
  setup: () => () => h('div', { 'data-testid': 'mode-toolbar-stub' })
})
const ModeStackStub = defineComponent({
  name: 'ModeStack',
  setup: () => () => h('div', { 'data-testid': 'mode-stack-stub' })
})
const ScrollBarStub = defineComponent({
  name: 'ScrollBar',
  props: ['target'],
  setup: (props) => () =>
    h('div', { 'data-testid': 'scroll-bar-stub', 'data-target': props.target })
})

const CardGridSkeletonStub = defineComponent({
  name: 'CardGridSkeleton',
  setup: () => () => h('div', { 'data-testid': 'card-grid-skeleton-stub' })
})

const CardGridEmptyStub = defineComponent({
  name: 'CardGridEmpty',
  setup: () => () => h('div', { 'data-testid': 'card-grid-empty-stub' })
})

const ModeToolbarSkeletonStub = defineComponent({
  name: 'ModeToolbarSkeleton',
  setup: () => () => h('div', { 'data-testid': 'mode-toolbar-skeleton-stub' })
})

const DeckSkeletonStub = defineComponent({
  name: 'DeckSkeleton',
  setup: () => () => h('div', { 'data-testid': 'deck-skeleton-stub' })
})

const DeckHeroStubWithProps = defineComponent({
  name: 'DeckHero',
  props: ['deck', 'imageUrl', 'hideActions'],
  setup: (props) => () =>
    h('div', { 'data-testid': 'deck-hero-stub', 'data-hide-actions': String(props.hideActions) })
})

function makeShell(mode = 'view') {
  return { mode: ref(mode), is_view: ref(mode === 'view') }
}

function makeEditor({ cards = [], isLoading = false } = {}) {
  return {
    list: { all_cards: computed(() => cards) },
    isLoading: ref(isLoading)
  }
}

function makeDeckQuery(deck) {
  return { data: ref(deck) }
}

function makeSearch() {
  return {
    is_searching: ref(false),
    query: ref(''),
    is_active: ref(false),
    is_loading: ref(false),
    displayed_cards: ref([]),
    no_results: ref(false),
    open: vi.fn(),
    close: vi.fn(),
    toggle: vi.fn()
  }
}

function mount({
  deck = { id: 1, name: 'Test' },
  mode = 'view',
  editorOpts = {},
  withHideActionsCheck = false
} = {}) {
  useDeckQueryMock.mockReturnValue(makeDeckQuery(deck))
  useDeckViewShellMock.mockReturnValue(makeShell(mode))
  useCardListControllerMock.mockReturnValue(makeEditor(editorOpts))
  useCardSortMock.mockReturnValue({
    is_active: ref(false),
    displayed_cards: ref([]),
    is_loading: ref(false)
  })
  useCardSearchMock.mockReturnValue(makeSearch())
  return shallowMount(DeckView, {
    props: { id: '1' },
    global: {
      stubs: {
        DeckHero: withHideActionsCheck ? DeckHeroStubWithProps : DeckHeroStub,
        DeckSkeleton: DeckSkeletonStub,
        ModeToolbar: ModeToolbarStub,
        ModeToolbarSkeleton: ModeToolbarSkeletonStub,
        ModeStack: ModeStackStub,
        ScrollBar: ScrollBarStub,
        CardGridSkeleton: CardGridSkeletonStub,
        CardGridEmpty: CardGridEmptyStub
      }
    }
  })
}

describe('DeckView (views/deck/index.vue)', () => {
  beforeEach(() => {
    useDeckQueryMock.mockReset()
    useCardListControllerMock.mockReset()
    useDeckViewShellMock.mockReset()
    useCardSortMock.mockReset()
    useCardSearchMock.mockReset()
  })

  test('renders the deck-hero when the deck query has data', () => {
    const wrapper = mount({ deck: { id: 1, name: 'Test' } })
    expect(wrapper.find('[data-testid="deck-hero-stub"]').exists()).toBe(true)
  })

  test('omits the deck-hero when the deck query has no data yet', () => {
    const wrapper = mount({ deck: null })
    expect(wrapper.find('[data-testid="deck-hero-stub"]').exists()).toBe(false)
  })

  // ── DeckSkeleton (top-level v-if) ─────────────────────────────────────────

  test('renders DeckSkeleton when deck query data is null (initial loading) [obligation]', () => {
    const wrapper = mount({ deck: null })
    expect(wrapper.find('[data-testid="deck-skeleton-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="deck-view"]').exists()).toBe(false)
  })

  test('renders real layout (not DeckSkeleton) when deck data is present [obligation]', () => {
    const wrapper = mount({ deck: { id: 1, name: 'Test' } })
    expect(wrapper.find('[data-testid="deck-skeleton-stub"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="deck-view"]').exists()).toBe(true)
  })

  test('renders the empty placeholder when not loading and no cards', () => {
    const wrapper = mount({ editorOpts: { cards: [], isLoading: false } })
    expect(wrapper.find('[data-testid="deck-view__empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="mode-stack-stub"]').exists()).toBe(false)
  })

  test('shows card-grid-skeleton when loading with no cards yet [obligation]', () => {
    const wrapper = mount({ editorOpts: { cards: [], isLoading: true } })
    expect(wrapper.find('[data-testid="deck-view__empty"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="card-grid-skeleton-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="mode-stack-stub"]').exists()).toBe(false)
  })

  test('hides card-grid-skeleton once cards arrive (loading still true) [obligation]', () => {
    const wrapper = mount({ editorOpts: { cards: [{ id: 1 }], isLoading: true } })
    expect(wrapper.find('[data-testid="card-grid-skeleton-stub"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="mode-stack-stub"]').exists()).toBe(true)
  })

  test('hides card-grid-skeleton when loading is false even with no cards', () => {
    const wrapper = mount({ editorOpts: { cards: [], isLoading: false } })
    expect(wrapper.find('[data-testid="card-grid-skeleton-stub"]').exists()).toBe(false)
  })

  test('renders the mode-stack when cards are loaded', () => {
    const wrapper = mount({ editorOpts: { cards: [{ id: 1 }] } })
    expect(wrapper.find('[data-testid="mode-stack-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="deck-view__empty"]').exists()).toBe(false)
  })

  test('reflects shell.mode in data-mode on the main grid', () => {
    const view = mount({ mode: 'view' })
    expect(view.find('[data-testid="deck-view__main"]').attributes('data-mode')).toBe('view')

    const edit = mount({ mode: 'edit' })
    expect(edit.find('[data-testid="deck-view__main"]').attributes('data-mode')).toBe('edit')

    const importExport = mount({ mode: 'import-export' })
    expect(importExport.find('[data-testid="deck-view__main"]').attributes('data-mode')).toBe(
      'import-export'
    )
  })

  test('passes the parsed numeric deck id to useDeckQuery', () => {
    mount()
    const idArg = useDeckQueryMock.mock.calls[0][0]
    expect(idArg.value).toBe(1)
  })

  test('passes the parsed numeric deck id and shell to useCardListController', () => {
    mount()
    expect(useCardListControllerMock).toHaveBeenCalledWith(expect.objectContaining({ deck_id: 1 }))
  })

  test('keeps the main layout stable across modes (no mode-dependent classes)', () => {
    const view = mount({ mode: 'view' })
    const edit = mount({ mode: 'edit' })
    const viewClasses = view.find('[data-testid="deck-view__main"]').classes()
    const editClasses = edit.find('[data-testid="deck-view__main"]').classes()
    expect(viewClasses).toEqual(editClasses)
  })

  test('pins the toolbar below the nav via a sticky wrapper', () => {
    const wrapper = mount()
    const toolbar = wrapper.find('[data-testid="deck-view__toolbar"]')
    expect(toolbar.exists()).toBe(true)
    expect(toolbar.classes()).toContain('sticky')
  })

  test('backs the sticky toolbar with a filler that covers the gap up to the nav', () => {
    const wrapper = mount()
    const backing = wrapper.find('[data-testid="deck-view__toolbar-backing"]')
    expect(backing.exists()).toBe(true)
    expect(backing.attributes('aria-hidden')).toBe('true')
  })

  test('renders the page scroll-bar tracking the document in every mode', () => {
    for (const mode of ['view', 'edit', 'import-export']) {
      const wrapper = mount({ mode, editorOpts: { cards: [{ id: 1 }] } })
      const bar = wrapper.find('[data-testid="scroll-bar-stub"]')
      expect(bar.exists()).toBe(true)
      expect(bar.attributes('data-target')).toBe('html')
    }
  })

  // ── toolbar-skeleton swap [obligation] ────────────────────────────────────

  test('shows mode-toolbar-skeleton when view_state is "empty" [obligation]', () => {
    const wrapper = mount({ editorOpts: { cards: [], isLoading: false } })
    expect(wrapper.find('[data-testid="mode-toolbar-skeleton-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="mode-toolbar-stub"]').exists()).toBe(false)
  })

  test('shows mode-toolbar (not skeleton) when view_state is "loading" [obligation]', () => {
    const wrapper = mount({ editorOpts: { cards: [], isLoading: true } })
    expect(wrapper.find('[data-testid="mode-toolbar-skeleton-stub"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="mode-toolbar-stub"]').exists()).toBe(true)
  })

  test('shows mode-toolbar (not skeleton) when view_state is "ready" [obligation]', () => {
    const wrapper = mount({ editorOpts: { cards: [{ id: 1 }], isLoading: false } })
    expect(wrapper.find('[data-testid="mode-toolbar-skeleton-stub"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="mode-toolbar-stub"]').exists()).toBe(true)
  })

  // ── scroll-bar only in ready state [obligation] ────────────────────────────

  test('hides scroll-bar when view_state is "empty" [obligation]', () => {
    const wrapper = mount({ editorOpts: { cards: [], isLoading: false } })
    expect(wrapper.find('[data-testid="scroll-bar-stub"]').exists()).toBe(false)
  })

  test('hides scroll-bar when view_state is "loading" [obligation]', () => {
    const wrapper = mount({ editorOpts: { cards: [], isLoading: true } })
    expect(wrapper.find('[data-testid="scroll-bar-stub"]').exists()).toBe(false)
  })

  // ── deck-hero hide-actions driven by view_state [obligation] ──────────────

  test('passes hideActions=true to deck-hero when view_state is "empty" [obligation]', () => {
    const wrapper = mount({
      editorOpts: { cards: [], isLoading: false },
      withHideActionsCheck: true
    })
    const hero = wrapper.find('[data-testid="deck-hero-stub"]')
    expect(hero.attributes('data-hide-actions')).toBe('true')
  })

  test('passes hideActions=false to deck-hero when view_state is "ready" [obligation]', () => {
    const wrapper = mount({
      editorOpts: { cards: [{ id: 1 }], isLoading: false },
      withHideActionsCheck: true
    })
    const hero = wrapper.find('[data-testid="deck-hero-stub"]')
    expect(hero.attributes('data-hide-actions')).toBe('false')
  })

  test('passes hideActions=false to deck-hero when view_state is "loading" [obligation]', () => {
    const wrapper = mount({
      editorOpts: { cards: [], isLoading: true },
      withHideActionsCheck: true
    })
    const hero = wrapper.find('[data-testid="deck-hero-stub"]')
    expect(hero.attributes('data-hide-actions')).toBe('false')
  })

  // ── card-grid-empty renders when view_state is "empty" [obligation] ─────────
  // The source adds data-testid="deck-view__empty" directly on the <card-grid-empty>
  // element; shallowMount passes it through as an attribute on the auto-stub.

  test('renders deck-view__empty (card-grid-empty) when view_state is "empty" [obligation]', () => {
    const wrapper = mount({ editorOpts: { cards: [], isLoading: false } })
    expect(wrapper.find('[data-testid="deck-view__empty"]').exists()).toBe(true)
  })

  test('omits deck-view__empty when view_state is not "empty" [obligation]', () => {
    const ready = mount({ editorOpts: { cards: [{ id: 1 }] } })
    expect(ready.find('[data-testid="deck-view__empty"]').exists()).toBe(false)

    const loading = mount({ editorOpts: { cards: [], isLoading: true } })
    expect(loading.find('[data-testid="deck-view__empty"]').exists()).toBe(false)
  })

  // ── useCardSearch wiring [obligation] ─────────────────────────────────────
  // The search composable receives a shared query ref, the editor's all_cards,
  // and the editor's isLoading — no deck_id (filtering is now server-side).

  test('calls useCardSearch with a ref, all_cards, and isLoading [obligation]', () => {
    mount()
    const [query_ref, all_cards, is_querying] = useCardSearchMock.mock.calls[0]
    expect(isRef(query_ref)).toBe(true)
    expect(isRef(all_cards)).toBe(true)
    expect(isRef(is_querying)).toBe(true)
  })
})
