import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const {
  routerPushMock,
  createDeckMock,
  deckSettingsOpenMock,
  randomCoverConfigMock,
  onItemPointerdownMock
} = vi.hoisted(() => ({
  routerPushMock: vi.fn(),
  createDeckMock: vi.fn(() => Promise.resolve({ id: 99 })),
  deckSettingsOpenMock: vi.fn(),
  randomCoverConfigMock: vi.fn(() => ({ theme: 'pink-400', pattern: 'wave', icon: 'flame' })),
  onItemPointerdownMock: vi.fn()
}))

const isMatchMediaRef = ref(true)

// Reactive knobs the reorder-drag stub reports back through, so tests can
// assert the template wires the real reorder engine's return values through
// without exercising the engine itself (that's use-deck-grid-reorder.test.js).
// Created at module level (not inside vi.hoisted) so Vue's ref() is available.
const reorderState = {
  measured: ref(true),
  row_count: ref(2),
  row_pitch: ref(300),
  cell_width: ref(192),
  dragging_index: ref(null)
}

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: routerPushMock }),
  // DeckGridDeleteButton (rendered inside DeckGridItem, which is stubbed by
  // name below) still gets statically imported through item.vue -> its own
  // module graph reaches composables/deck/danger-actions.ts, which calls
  // useRoute() at setup — needs a resolvable named export even though the
  // stub means it's never actually invoked here.
  useRoute: () => ({ name: 'dashboard', params: {} })
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

// The drag engine itself (geometry, pointer tracking, the move_deck mutation
// call) is covered directly in use-deck-grid-reorder.test.js — this component
// test only needs to confirm the template wires its return values through.
vi.mock('@/views/dashboard/deck-grid/use-deck-grid-reorder', () => ({
  useDeckGridReorder: () => ({
    cell_width: reorderState.cell_width,
    measured: reorderState.measured,
    row_count: reorderState.row_count,
    row_pitch: reorderState.row_pitch,
    itemPosition: (index) => ({ x: index * 10, y: index * 20 }),
    dragging_index: reorderState.dragging_index,
    shouldTransition: () => false,
    dragTransform: () => 'translate(0px, 0px)',
    jiggleStyle: () => ({}),
    onItemPointerdown: onItemPointerdownMock
  })
}))

// ── Stubs ─────────────────────────────────────────────────────────────────────

const DeckGridItemStub = defineComponent({
  name: 'DeckGridItem',
  props: ['deck', 'size', 'rearranging', 'dragging'],
  emits: ['press', 'settings'],
  setup(props, { emit }) {
    return () =>
      h('div', {
        'data-testid': 'deck-grid-item',
        'data-deck-id': props.deck.id,
        'data-rearranging': String(!!props.rearranging),
        'data-dragging': String(!!props.dragging),
        onClick: () => emit('press'),
        onContextmenu: () => emit('settings')
      })
  }
})

const NewDeckCardStub = defineComponent({
  name: 'NewDeckCard',
  props: ['size', 'loading', 'disabled'],
  emits: ['press'],
  setup(props, { emit }) {
    return () =>
      h('div', {
        'data-testid': 'new-deck-card',
        'data-loading': String(!!props.loading),
        'data-disabled': String(!!props.disabled),
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

function mount(decks, editing = false) {
  return shallowMount(DeckGrid, {
    props: { decks, editing },
    global: { stubs: { DeckGridItem: DeckGridItemStub, NewDeckCard: NewDeckCardStub } }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  createDeckMock.mockResolvedValue({ id: 99 })
  randomCoverConfigMock.mockReturnValue({ theme: 'pink-400', pattern: 'wave', icon: 'flame' })
  reorderState.measured.value = true
  reorderState.row_count.value = 2
  reorderState.row_pitch.value = 300
  reorderState.cell_width.value = 192
  reorderState.dragging_index.value = null
})

describe('DeckGrid — renders one item per deck plus the new-deck-card last', () => {
  test('renders a deck-grid-item for every deck', () => {
    const wrapper = mount([makeDeck(1), makeDeck(2), makeDeck(3)])
    expect(wrapper.findAll('[data-testid="deck-grid-item"]')).toHaveLength(3)
  })

  test('renders the new-deck-card as the last child of the grid', () => {
    const wrapper = mount([makeDeck(1), makeDeck(2)])
    const grid = wrapper.find('[data-testid="dashboard__decks"]')
    const wrapped_items = [
      ...grid.element.querySelectorAll(
        '[data-testid="deck-grid__item"], [data-testid="new-deck-card"]'
      )
    ]
    expect(wrapped_items.at(-1).getAttribute('data-testid')).toBe('new-deck-card')
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
        study_config: {},
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

  test('does not call createDeck when editing is true, even bypassing the disabled UI state [obligation]', async () => {
    const wrapper = mount([], true)
    await wrapper.find('[data-testid="new-deck-card"]').trigger('click')
    expect(createDeckMock).not.toHaveBeenCalled()
  })

  test('passes disabled=true to new-deck-card when editing [obligation]', () => {
    const wrapper = mount([], true)
    expect(wrapper.find('[data-testid="new-deck-card"]').attributes('data-disabled')).toBe('true')
  })

  test('passes disabled=false to new-deck-card when not editing [obligation]', () => {
    const wrapper = mount([], false)
    expect(wrapper.find('[data-testid="new-deck-card"]').attributes('data-disabled')).toBe('false')
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

describe('DeckGrid — editing mode forwards rearranging/dragging to each item [obligation]', () => {
  test('forwards rearranging=true to every item when editing', () => {
    const wrapper = mount([makeDeck(1), makeDeck(2)], true)
    const items = wrapper.findAllComponents(DeckGridItemStub)
    expect(items.every((i) => i.props('rearranging') === true)).toBe(true)
  })

  test('forwards rearranging=false to every item when not editing', () => {
    const wrapper = mount([makeDeck(1), makeDeck(2)], false)
    const items = wrapper.findAllComponents(DeckGridItemStub)
    expect(items.every((i) => i.props('rearranging') === false)).toBe(true)
  })

  test('only the item at dragging_index gets dragging=true', () => {
    reorderState.dragging_index.value = 1
    const wrapper = mount([makeDeck(1), makeDeck(2)], true)
    const items = wrapper.findAllComponents(DeckGridItemStub)
    expect(items[0].props('dragging')).toBe(false)
    expect(items[1].props('dragging')).toBe(true)
  })
})

describe('DeckGrid — reflow transition [obligation]', () => {
  test('does not apply the transition class on the initial decks.length change from mount', async () => {
    const wrapper = mount([])
    await wrapper.setProps({ decks: [makeDeck(1)] })
    expect(wrapper.find('[data-testid="deck-grid__item"]').classes()).not.toContain(
      'transition-transform'
    )
  })

  test('applies the transition class on a genuine subsequent decks.length change (create/delete)', async () => {
    const wrapper = mount([makeDeck(1)])
    // First length change after mount is the skipped "initial load" firing.
    await wrapper.setProps({ decks: [makeDeck(1), makeDeck(2)] })
    // Second length change is a real reflow (e.g. a delete).
    await wrapper.setProps({ decks: [makeDeck(2)] })
    expect(wrapper.find('[data-testid="deck-grid__item"]').classes()).toContain(
      'transition-transform'
    )
  })

  test('does not apply the transition class for a same-length reorder (drag-drop resort)', async () => {
    const wrapper = mount([makeDeck(1), makeDeck(2)])
    // Same length, different order — the reflow watcher is keyed off
    // decks.length only, so this change must not fire it at all.
    await wrapper.setProps({ decks: [makeDeck(2), makeDeck(1)] })
    const items = wrapper.findAll('[data-testid="deck-grid__item"]')
    expect(items.every((i) => !i.classes().includes('transition-transform'))).toBe(true)
  })

  test('does not key reflow off reorder.dragging_index becoming null', async () => {
    const wrapper = mount([makeDeck(1), makeDeck(2)])
    reorderState.dragging_index.value = 1
    await wrapper.vm.$nextTick()
    reorderState.dragging_index.value = null
    await wrapper.vm.$nextTick()
    const items = wrapper.findAll('[data-testid="deck-grid__item"]')
    expect(items.every((i) => !i.classes().includes('transition-transform'))).toBe(true)
  })
})

describe('DeckGrid — pointerdown wiring [obligation]', () => {
  test('pointerdown on an item calls reorder.onItemPointerdown with its index', async () => {
    const wrapper = mount([makeDeck(1), makeDeck(2)], true)
    const item_wrapper = wrapper.find('[data-testid="deck-grid__item"]')
    await item_wrapper.trigger('pointerdown')
    expect(onItemPointerdownMock).toHaveBeenCalledWith(0, expect.anything())
  })
})

describe('DeckGrid — container height reflects reorder geometry', () => {
  test('sets height from row_count * row_pitch once measured', () => {
    reorderState.measured.value = true
    reorderState.row_count.value = 3
    reorderState.row_pitch.value = 250
    const wrapper = mount([makeDeck(1)])
    expect(wrapper.find('[data-testid="dashboard__decks"]').attributes('style')).toContain(
      'height: 750px'
    )
  })

  test('collapses height to 0 before the container is measured', () => {
    reorderState.measured.value = false
    const wrapper = mount([makeDeck(1)])
    expect(wrapper.find('[data-testid="dashboard__decks"]').attributes('style')).toContain(
      'height: 0px'
    )
  })
})
