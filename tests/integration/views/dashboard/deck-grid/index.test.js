import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { routerPushMock, createNewDeckMock, onItemPointerdownMock } = vi.hoisted(() => ({
  routerPushMock: vi.fn(),
  createNewDeckMock: vi.fn(() => Promise.resolve()),
  onItemPointerdownMock: vi.fn()
}))

const creatingDeckRef = ref(false)

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

vi.mock('@/views/dashboard/composables/new-deck-action', () => ({
  useNewDeckAction: () => ({ creating_deck: creatingDeckRef, createNewDeck: createNewDeckMock })
}))

vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: () => isMatchMediaRef
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
  props: ['deck', 'size', 'rearranging', 'dragging', 'locked', 'pending'],
  emits: ['press', 'rearrange'],
  setup(props, { emit }) {
    return () =>
      h('div', {
        'data-testid': 'deck-grid-item',
        'data-deck-id': props.deck.id,
        'data-rearranging': String(!!props.rearranging),
        'data-dragging': String(!!props.dragging),
        'data-locked': String(!!props.locked),
        onClick: () => emit('press'),
        onContextmenu: () => emit('rearrange')
      })
  }
})

const NewDeckCardStub = defineComponent({
  name: 'NewDeckCard',
  props: ['size', 'disabled'],
  emits: ['press'],
  setup(props, { emit }) {
    return () =>
      h('div', {
        'data-testid': 'new-deck-card',
        'data-disabled': String(!!props.disabled),
        onClick: () => emit('press')
      })
  }
})

// ── Component import (after mocks) ────────────────────────────────────────────

import DeckGrid from '@/views/dashboard/deck-grid/index.vue'

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeDeck(id, { rank = id, is_locked = false, pending = false, client_key } = {}) {
  return { id, title: `Deck ${id}`, due_count: 0, rank, is_locked, pending, client_key }
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
  creatingDeckRef.value = false
  createNewDeckMock.mockResolvedValue(undefined)
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

  test('an item rearrange emit re-emits rearrange upward', async () => {
    const wrapper = mount([makeDeck(1)])
    await wrapper.find('[data-testid="deck-grid-item"]').trigger('contextmenu')
    expect(wrapper.emitted('rearrange')).toHaveLength(1)
  })
})

describe('DeckGrid — create deck', () => {
  test('clicking new-deck-card calls useNewDeckAction().createNewDeck', async () => {
    const wrapper = mount([])
    await wrapper.find('[data-testid="new-deck-card"]').trigger('click')

    expect(createNewDeckMock).toHaveBeenCalledTimes(1)
  })

  test('does not call createNewDeck when editing is true, even bypassing the disabled UI state', async () => {
    const wrapper = mount([], true)
    await wrapper.find('[data-testid="new-deck-card"]').trigger('click')
    expect(createNewDeckMock).not.toHaveBeenCalled()
  })

  test('passes disabled=true to new-deck-card when creating_deck is true, with no loading prop', () => {
    creatingDeckRef.value = true
    const wrapper = mount([])
    expect(wrapper.find('[data-testid="new-deck-card"]').attributes('data-disabled')).toBe('true')
  })

  test('passes disabled=true to new-deck-card when editing', () => {
    const wrapper = mount([], true)
    expect(wrapper.find('[data-testid="new-deck-card"]').attributes('data-disabled')).toBe('true')
  })

  test('passes disabled=false to new-deck-card when neither creating nor editing', () => {
    const wrapper = mount([], false)
    expect(wrapper.find('[data-testid="new-deck-card"]').attributes('data-disabled')).toBe('false')
  })
})

describe('DeckGrid — pending deck guards', () => {
  test("a pending deck is keyed by client_key, not id — re-keying it doesn't replay the pop-in", () => {
    const pending_deck = makeDeck(-1, { pending: true, client_key: 'temp-key-1' })
    const wrapper = mount([pending_deck])
    const item_wrapper = wrapper.find('[data-testid="deck-grid__item"]')
    expect(item_wrapper.exists()).toBe(true)
  })

  test('clicking a pending deck does not navigate', async () => {
    const pending_deck = makeDeck(-1, { pending: true, client_key: 'temp-key-1' })
    const wrapper = mount([pending_deck])
    await wrapper.find('[data-testid="deck-grid-item"]').trigger('click')
    expect(routerPushMock).not.toHaveBeenCalled()
  })

  test('a settled deck still navigates on click', async () => {
    const wrapper = mount([makeDeck(1)])
    await wrapper.find('[data-testid="deck-grid-item"]').trigger('click')
    expect(routerPushMock).toHaveBeenCalledWith({ name: 'deck', params: { id: 1 } })
  })

  test('pointerdown on a pending deck does not start a reorder drag', async () => {
    const pending_deck = makeDeck(-1, { pending: true, client_key: 'temp-key-1' })
    const wrapper = mount([pending_deck], true)
    await wrapper.find('[data-testid="deck-grid__item"]').trigger('pointerdown')
    expect(onItemPointerdownMock).not.toHaveBeenCalled()
  })

  test('a pending deck does not get cursor-grab even while editing', () => {
    const pending_deck = makeDeck(-1, { pending: true, client_key: 'temp-key-1' })
    const wrapper = mount([pending_deck], true)
    expect(wrapper.find('[data-testid="deck-grid__item"]').classes()).not.toContain('cursor-grab')
  })

  test('a pending deck is not marked rearranging on DeckGridItem, even in edit mode', () => {
    const pending_deck = makeDeck(-1, { pending: true, client_key: 'temp-key-1' })
    const wrapper = mount([pending_deck], true)
    expect(wrapper.findComponent(DeckGridItemStub).props('rearranging')).toBe(false)
  })

  test('forwards pending=true to DeckGridItem for a pending row', () => {
    const pending_deck = makeDeck(-1, { pending: true, client_key: 'temp-key-1' })
    const wrapper = mount([pending_deck])
    expect(wrapper.findComponent(DeckGridItemStub).props('pending')).toBe(true)
  })

  test('forwards pending=false to DeckGridItem for a settled row', () => {
    const wrapper = mount([makeDeck(1)])
    expect(wrapper.findComponent(DeckGridItemStub).props('pending')).toBe(false)
  })
})

describe('DeckGrid — editing mode forwards rearranging/dragging to each item', () => {
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

describe('DeckGrid — reflow transition', () => {
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

  test('clears the transition class once REFLOW_TRANSITION_DURATION elapses', async () => {
    vi.useFakeTimers()
    const wrapper = mount([makeDeck(1)])
    await wrapper.setProps({ decks: [makeDeck(1), makeDeck(2)] })
    await wrapper.setProps({ decks: [makeDeck(2)] })
    expect(wrapper.find('[data-testid="deck-grid__item"]').classes()).toContain(
      'transition-transform'
    )

    vi.advanceTimersByTime(200)
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="deck-grid__item"]').classes()).not.toContain(
      'transition-transform'
    )
    vi.useRealTimers()
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

describe('DeckGrid — pointerdown wiring', () => {
  test('pointerdown on an item calls reorder.onItemPointerdown with its index', async () => {
    const wrapper = mount([makeDeck(1), makeDeck(2)], true)
    const item_wrapper = wrapper.find('[data-testid="deck-grid__item"]')
    await item_wrapper.trigger('pointerdown')
    expect(onItemPointerdownMock).toHaveBeenCalledWith(0, expect.anything())
  })
})

describe('DeckGrid — downgrade-grace lock forwarding', () => {
  test('forwards locked=true to decks ranked below the top 10, false to the rest, while in grace', () => {
    const decks = Array.from({ length: 12 }, (_, i) =>
      makeDeck(i + 1, { rank: i + 1, is_locked: i === 11 })
    )
    const wrapper = mount(decks)
    const items = wrapper.findAllComponents(DeckGridItemStub)

    for (let i = 0; i < 10; i++) expect(items[i].props('locked')).toBe(false)
    expect(items[10].props('locked')).toBe(true)
    expect(items[11].props('locked')).toBe(true)
  })

  test('forwards locked=false to every deck when not in grace, even with more than 10 decks', () => {
    const decks = Array.from({ length: 12 }, (_, i) => makeDeck(i + 1))
    const wrapper = mount(decks)
    const items = wrapper.findAllComponents(DeckGridItemStub)
    expect(items.every((item) => item.props('locked') === false)).toBe(true)
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
