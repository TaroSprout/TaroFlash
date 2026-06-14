import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, ref, computed } from 'vue'

const { useDeckQueryMock, useCardListControllerMock, useDeckViewShellMock } = vi.hoisted(() => ({
  useDeckQueryMock: vi.fn(),
  useCardListControllerMock: vi.fn(),
  useDeckViewShellMock: vi.fn()
}))

// card-face-uploader (reached statically via mode-stack → list-item-card) now
// imports useCan, which pulls useMemberDeckCountQuery from this barrel — so the
// mock must expose it too, or ESM linking of the graph fails.
vi.mock('@/api/decks', () => ({
  useDeckQuery: useDeckQueryMock,
  useMemberDeckCountQuery: () => ({ data: { value: 0 }, refresh: vi.fn() })
}))
vi.mock('@/composables/card/list-controller', () => ({
  cardEditorKey: Symbol('cardEditor'),
  useCardListController: useCardListControllerMock
}))
vi.mock('@/composables/deck/view-shell', () => ({
  deckViewShellKey: Symbol('deckViewShell'),
  useDeckViewShell: useDeckViewShellMock
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

const DeckSkeletonStub = defineComponent({
  name: 'DeckSkeleton',
  setup: () => () => h('div', { 'data-testid': 'deck-skeleton-stub' })
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

function mount({ deck = { id: 1, name: 'Test' }, mode = 'view', editorOpts = {} } = {}) {
  useDeckQueryMock.mockReturnValue(makeDeckQuery(deck))
  useDeckViewShellMock.mockReturnValue(makeShell(mode))
  useCardListControllerMock.mockReturnValue(makeEditor(editorOpts))
  return shallowMount(DeckView, {
    props: { id: '1' },
    global: {
      stubs: {
        DeckHero: DeckHeroStub,
        DeckSkeleton: DeckSkeletonStub,
        ModeToolbar: ModeToolbarStub,
        ModeStack: ModeStackStub,
        ScrollBar: ScrollBarStub,
        CardGridSkeleton: CardGridSkeletonStub
      }
    }
  })
}

describe('DeckView (views/deck/index.vue)', () => {
  beforeEach(() => {
    useDeckQueryMock.mockReset()
    useCardListControllerMock.mockReset()
    useDeckViewShellMock.mockReset()
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
      const wrapper = mount({ mode })
      const bar = wrapper.find('[data-testid="scroll-bar-stub"]')
      expect(bar.exists()).toBe(true)
      expect(bar.attributes('data-target')).toBe('html')
    }
  })
})
