import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, ref, computed } from 'vue'

const { useDeckQueryMock, useCardListControllerMock } = vi.hoisted(() => ({
  useDeckQueryMock: vi.fn(),
  useCardListControllerMock: vi.fn()
}))

// card-face-uploader (reached statically via mode-stack → list-item-card) now
// imports useCan, which pulls useMemberDeckCountQuery from this barrel — so the
// mock must expose it too, or ESM linking of the graph fails.
vi.mock('@/api/decks', () => ({
  useDeckQuery: useDeckQueryMock,
  useMemberDeckCountQuery: () => ({ data: { value: 0 }, refresh: vi.fn() })
}))
vi.mock('@/composables/card-editor/card-list-controller', () => ({
  useCardListController: useCardListControllerMock
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

function makeEditor({ mode = 'view', cards = [], isLoading = false } = {}) {
  return {
    mode: ref(mode),
    list: { all_cards: computed(() => cards) },
    isLoading: ref(isLoading)
  }
}

function makeDeckQuery(deck) {
  return { data: ref(deck) }
}

function mount({ deck = { id: 1, name: 'Test' }, editorOpts = {} } = {}) {
  useDeckQueryMock.mockReturnValue(makeDeckQuery(deck))
  useCardListControllerMock.mockReturnValue(makeEditor(editorOpts))
  return shallowMount(DeckView, {
    props: { id: '1' },
    global: {
      stubs: {
        DeckHero: DeckHeroStub,
        ModeToolbar: ModeToolbarStub,
        ModeStack: ModeStackStub,
        ScrollBar: ScrollBarStub
      }
    }
  })
}

describe('DeckView (views/deck/index.vue)', () => {
  beforeEach(() => {
    useDeckQueryMock.mockReset()
    useCardListControllerMock.mockReset()
  })

  test('renders the deck-hero when the deck query has data', () => {
    const wrapper = mount({ deck: { id: 1, name: 'Test' } })
    expect(wrapper.find('[data-testid="deck-hero-stub"]').exists()).toBe(true)
  })

  test('omits the deck-hero when the deck query has no data yet', () => {
    const wrapper = mount({ deck: null })
    expect(wrapper.find('[data-testid="deck-hero-stub"]').exists()).toBe(false)
  })

  test('renders the empty placeholder when not loading and no cards', () => {
    const wrapper = mount({ editorOpts: { cards: [], isLoading: false } })
    expect(wrapper.find('[data-testid="deck-view__empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="mode-stack-stub"]').exists()).toBe(false)
  })

  test('renders the mode-stack while loading even with no cards yet', () => {
    const wrapper = mount({ editorOpts: { cards: [], isLoading: true } })
    expect(wrapper.find('[data-testid="deck-view__empty"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="mode-stack-stub"]').exists()).toBe(true)
  })

  test('renders the mode-stack when cards are loaded', () => {
    const wrapper = mount({ editorOpts: { cards: [{ id: 1 }] } })
    expect(wrapper.find('[data-testid="mode-stack-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="deck-view__empty"]').exists()).toBe(false)
  })

  test('reflects editor.mode in data-mode on the main grid', () => {
    const view = mount({ editorOpts: { mode: 'view' } })
    expect(view.find('[data-testid="deck-view__main"]').attributes('data-mode')).toBe('view')

    const edit = mount({ editorOpts: { mode: 'edit' } })
    expect(edit.find('[data-testid="deck-view__main"]').attributes('data-mode')).toBe('edit')

    const importExport = mount({ editorOpts: { mode: 'import-export' } })
    expect(importExport.find('[data-testid="deck-view__main"]').attributes('data-mode')).toBe(
      'import-export'
    )
  })

  test('passes the parsed numeric deck id to useDeckQuery', () => {
    mount()
    const idArg = useDeckQueryMock.mock.calls[0][0]
    expect(idArg.value).toBe(1)
  })

  test('passes the parsed numeric deck id to useCardListController', () => {
    mount()
    expect(useCardListControllerMock).toHaveBeenCalledWith({ deck_id: 1 })
  })

  test('does not render the scroll-bar in view mode', () => {
    const wrapper = mount({ editorOpts: { mode: 'view' } })
    expect(wrapper.find('[data-testid="scroll-bar-stub"]').exists()).toBe(false)
  })

  test('does not render the scroll-bar in import-export mode', () => {
    const wrapper = mount({ editorOpts: { mode: 'import-export' } })
    expect(wrapper.find('[data-testid="scroll-bar-stub"]').exists()).toBe(false)
  })

  test('renders the scroll-bar when mode is edit and targets the card-list', () => {
    const wrapper = mount({ editorOpts: { mode: 'edit' } })
    const bar = wrapper.find('[data-testid="scroll-bar-stub"]')
    expect(bar.exists()).toBe(true)
    expect(bar.attributes('data-target')).toBe("[data-testid='card-list']")
  })

  test('keeps the main grid layout stable across modes (no row-height swap)', () => {
    const view = mount({ editorOpts: { mode: 'view' } })
    const edit = mount({ editorOpts: { mode: 'edit' } })
    const viewClasses = view.find('[data-testid="deck-view__main"]').classes()
    const editClasses = edit.find('[data-testid="deck-view__main"]').classes()
    expect(viewClasses).toEqual(editClasses)
  })
})
