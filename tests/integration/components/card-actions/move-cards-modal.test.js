import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { defineComponent, h, nextTick, ref } from 'vue'
import { card } from '@tests/fixtures/card'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { guardAddCardsMock, handleLimitErrorMock, emitSfxMock, gsapTimelineMock } = vi.hoisted(
  () => ({
    guardAddCardsMock: vi.fn(),
    handleLimitErrorMock: vi.fn(),
    emitSfxMock: vi.fn(),
    gsapTimelineMock: vi.fn()
  })
)

vi.mock('@/sfx/bus', () => ({
  emitSfx: emitSfxMock
}))

// `refetch` is a plain `vi.fn()` reassigned per test — real @pinia/colada
// `status` never moves off 'error' on a repeat failure (only `asyncStatus`
// does), so a refetch mock that "fixes" status back to 'success' models the
// retry-succeeds case, and one that leaves status at 'error' models a
// same-error repeat failure without fabricating a status transition.
const mockDecksData = { data: ref([]), status: ref('success'), refetch: vi.fn() }
// `cardsPerDeckLimitRef` mirrors usePlanLimits().cardsPerDeckLimit: 200 for
// free, null (unlimited) for paid — drives useCan().addCards' cap math.
const cardsPerDeckLimitRef = ref(200)

vi.mock('@/api/decks', () => ({
  useMemberDecksQuery: () => mockDecksData
}))

// shake()'s gsap.timeline().to().to().to().to() chain resolves its own
// `onComplete` — fire it synchronously so shake()'s Promise settles.
vi.mock('gsap', () => ({
  gsap: {
    timeline: (opts) => {
      const tl = { to: () => tl }
      gsapTimelineMock(opts)
      opts?.onComplete?.()
      return tl
    }
  }
}))

vi.mock('@/composables/can', () => ({
  useCan: () => ({
    addCards: (count, adding = 1) => {
      const limit = cardsPerDeckLimitRef.value
      return limit === null || count + adding <= limit
    }
  })
}))

vi.mock('@/composables/card/limit-gate', () => ({
  useCardLimitGate: () => ({
    guardAddCards: guardAddCardsMock,
    handleLimitError: handleLimitErrorMock
  })
}))

// ── Component stubs (render functions only — no runtime compiler) ──────────────

const CardStub = defineComponent({
  name: 'CardIndex',
  props: ['size', 'coverConfig', 'side'],
  setup() {
    return () => h('div', { 'data-testid': 'card-stub' })
  }
})

const UiRadioStub = defineComponent({
  name: 'UiRadio',
  props: ['checked', 'active', 'sfx'],
  inheritAttrs: false,
  setup(props, { attrs }) {
    return () =>
      h('div', {
        ...attrs,
        'data-testid': 'move-cards__deck-radio',
        'data-checked': String(props.checked)
      })
  }
})

const UiButtonStub = defineComponent({
  name: 'UiButton',
  props: ['disabled', 'iconLeft'],
  emits: ['press'],
  inheritAttrs: false,
  setup(props, { slots, emit, attrs }) {
    return () =>
      h(
        'button',
        {
          ...attrs,
          disabled: props.disabled,
          onClick: () => emit('press')
        },
        slots.default?.()
      )
  }
})

const DialogCardStub = defineComponent({
  name: 'DialogCard',
  props: ['title'],
  emits: ['close'],
  setup(props, { slots, emit }) {
    return () =>
      h('div', { 'data-testid': 'move-cards' }, [
        h('span', { class: 'move-cards__title' }, props.title),
        h('button', { 'data-testid': 'move-cards__dialog-close', onClick: () => emit('close') }),
        slots.default?.({ viewport: 'desktop' }),
        slots.toolbar?.()
      ])
  }
})

const DialogCardBodyStub = defineComponent({
  name: 'DialogCardBody',
  inheritAttrs: false,
  setup(_props, { slots, attrs }) {
    return () => h('div', { ...attrs }, slots.default?.())
  }
})

const UiOptionsPanelStub = defineComponent({
  name: 'UiOptionsPanel',
  props: ['entries', 'scrollable', 'sfx'],
  emits: ['select'],
  inheritAttrs: false,
  setup(props, { slots, emit, attrs }) {
    return () =>
      h(
        'div',
        { ...attrs },
        props.entries.map((entry) =>
          h(
            'div',
            {
              key: entry.value,
              'data-testid': 'options-panel__card',
              'data-value': entry.value,
              class: entry.disabled ? 'pointer-events-none' : '',
              onClick: () => {
                if (entry.disabled) return
                emit('select', entry.value)
              }
            },
            [slots.leading?.({ entry }), h('span', entry.label), slots.trailing?.({ entry })]
          )
        )
      )
  }
})

const ScrollBarStub = defineComponent({
  name: 'ScrollBar',
  setup() {
    return () => null
  }
})

import MoveCardsModal from '@/components/card-actions/move-cards-modal.vue'
import { useNoticeStore } from '@/stores/notice-store'

function makeCard(overrides = {}) {
  return card.one({ overrides })
}

// `mockDecksData.status` is shared module state read by every mounted
// instance's own `watch(status, …)` — a wrapper left mounted from an earlier
// test keeps reacting to later status mutations (e.g. flipping to 'error'
// re-fires *every* still-mounted instance's notice.error cue). Track every
// wrapper and unmount them all after each test so only the wrapper under test
// observes that test's mutation.
const mounted_wrappers = []

function mountModal(opts = {}) {
  const { cards = [], count, close = vi.fn(), move = vi.fn().mockResolvedValue(undefined) } = opts
  // A plain destructured default can't distinguish "omitted" from an explicit
  // `current_deck_id: undefined` (both fall back to it) — read straight off
  // `opts` so a test can exercise the real undefined (mixed-deck) case.
  const current_deck_id = 'current_deck_id' in opts ? opts.current_deck_id : 30

  const wrapper = shallowMount(MoveCardsModal, {
    props: { cards, current_deck_id, count, close, move },
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn, stubActions: false })],
      stubs: {
        Card: CardStub,
        UiRadio: UiRadioStub,
        UiButton: UiButtonStub,
        DialogCard: DialogCardStub,
        DialogCardBody: DialogCardBodyStub,
        UiOptionsPanel: UiOptionsPanelStub,
        ScrollBar: ScrollBarStub
      }
    }
  })
  mounted_wrappers.push(wrapper)
  return { wrapper, close, move }
}

describe('MoveCardsModal', () => {
  beforeEach(() => {
    guardAddCardsMock.mockReset().mockResolvedValue(true)
    handleLimitErrorMock.mockReset().mockReturnValue(false)
    emitSfxMock.mockReset()
    gsapTimelineMock.mockReset()
    cardsPerDeckLimitRef.value = 200
    mockDecksData.status.value = 'success'
    mockDecksData.refetch.mockReset()
    mockDecksData.data.value = [
      { id: 10, title: 'Deck A', card_count: 0 },
      { id: 20, title: 'Deck B', card_count: 0 },
      { id: 30, title: 'Current Deck', card_count: 0 }
    ]
  })

  afterEach(() => {
    mounted_wrappers.splice(0).forEach((wrapper) => {
      // Some tests unmount manually to compare pre/post state; guard the
      // sweep against unmounting an already-unmounted wrapper twice.
      if (wrapper.vm) wrapper.unmount()
    })
  })

  // ── Skeleton (pending decks query) ──────────────────────────────────────────

  describe('pending decks query', () => {
    test('renders exactly 4 skeleton rows and no real deck-list panel [obligation]', () => {
      mockDecksData.status.value = 'pending'
      const { wrapper } = mountModal({ cards: [makeCard()] })

      const rows = wrapper.findAll('[data-testid="move-cards__deck-list-skeleton-row"]')
      expect(rows).toHaveLength(4)
      expect(wrapper.find('[data-testid="move-cards__deck-list"]').exists()).toBe(false)
    })

    test('swaps the skeleton for the real deck-list panel once the query succeeds [obligation]', async () => {
      mockDecksData.status.value = 'pending'
      const { wrapper } = mountModal({ cards: [makeCard()] })
      expect(wrapper.find('[data-testid="move-cards__deck-list-skeleton"]').exists()).toBe(true)

      mockDecksData.status.value = 'success'
      await nextTick()

      expect(wrapper.find('[data-testid="move-cards__deck-list-skeleton"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="move-cards__deck-list"]').exists()).toBe(true)
    })

    test('keeps the confirm button disabled throughout the pending state [obligation]', () => {
      mockDecksData.status.value = 'pending'
      const { wrapper } = mountModal({ cards: [makeCard()] })

      expect(wrapper.find('[data-testid="move-cards__move"]').attributes('disabled')).toBeDefined()
    })
  })

  // ── Error (decks query failure + retry) ─────────────────────────────────────

  describe('decks query error', () => {
    test('renders the error node and hides the deck list/skeleton when the decks query fails [obligation]', () => {
      mockDecksData.status.value = 'error'
      const { wrapper } = mountModal({ cards: [makeCard()] })

      expect(wrapper.find('[data-testid="move-cards__deck-list-error"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="move-cards__deck-list"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="move-cards__deck-list-skeleton"]').exists()).toBe(false)
      expect(wrapper.findAll('[data-testid="move-cards__deck-list-skeleton-row"]')).toHaveLength(0)
    })

    test('plays notice.error exactly once when the decks query first surfaces an error [obligation]', async () => {
      // `watch(status, …)` only fires on a change observed *after* setup —
      // mount at 'success' first, then flip to 'error' so the transition
      // itself is what the watcher sees, matching how a real query settles
      // to 'error' only after the component is already mounted and watching.
      mountModal({ cards: [makeCard()] })
      mockDecksData.status.value = 'error'
      await nextTick()

      expect(emitSfxMock).toHaveBeenCalledTimes(1)
      expect(emitSfxMock).toHaveBeenCalledWith('notice.error')
    })

    test('keeps the confirm button disabled in the error state — no deck can be selected [obligation]', () => {
      mockDecksData.status.value = 'error'
      const { wrapper } = mountModal({ cards: [makeCard()] })

      expect(wrapper.find('[data-testid="move-cards__move"]').attributes('disabled')).toBeDefined()
    })

    test('keeps the modal mounted, open, and its title unchanged on a decks-load failure [obligation]', () => {
      const cards = [makeCard({ front_text: 'Q', back_text: 'A' })]
      const success = mountModal({ cards })
      const successTitle = success.wrapper.find('.move-cards__title').text()
      success.wrapper.unmount()

      mockDecksData.status.value = 'error'
      const { wrapper, close } = mountModal({ cards })

      expect(wrapper.find('[data-testid="move-cards"]').exists()).toBe(true)
      expect(wrapper.find('.move-cards__title').text()).toBe(successTitle)
      expect(close).not.toHaveBeenCalled()
    })

    test('clicking retry calls refetch() [obligation]', async () => {
      mockDecksData.status.value = 'error'
      mockDecksData.refetch.mockResolvedValue(undefined)
      const { wrapper } = mountModal({ cards: [makeCard()] })

      await wrapper.find('[data-testid="move-cards__retry"]').trigger('click')

      expect(mockDecksData.refetch).toHaveBeenCalledTimes(1)
    })

    test('a successful retry swaps the error node for the real deck list [obligation]', async () => {
      mockDecksData.status.value = 'error'
      mockDecksData.refetch.mockImplementation(() => {
        mockDecksData.status.value = 'success'
        return Promise.resolve()
      })
      const { wrapper } = mountModal({ cards: [makeCard()] })
      expect(wrapper.find('[data-testid="move-cards__deck-list-error"]').exists()).toBe(true)

      await wrapper.find('[data-testid="move-cards__retry"]').trigger('click')
      await flushPromises()

      expect(wrapper.find('[data-testid="move-cards__deck-list-error"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="move-cards__deck-list"]').exists()).toBe(true)
    })

    // ⚠️ Known trap: @pinia/colada's `status` never moves off 'error' on a
    // repeat failure — only `asyncStatus` toggles loading→idle. This mock
    // reproduces that: the failed refetch leaves `status` at 'error' rather
    // than fabricating an error→error transition through a reassignment. A
    // `watch(status, …)` genuinely can't observe this, which is why the
    // source detects a repeat-failure by comparing values inside the retry
    // handler instead of watching `status` for a transition. If that
    // detection regresses, the assertions below fail — that is the point,
    // see the Bug found note in the report.
    test('a repeat retry failure shakes the message and plays ui.rejected without changing the message text [obligation]', async () => {
      // First failure: mount at 'success', then flip to 'error' so
      // `watch(status, …)` actually observes the transition and the initial
      // notice.error cue fires — same setup as the "first appearance" test.
      mockDecksData.refetch.mockImplementation(() => Promise.resolve())
      const { wrapper } = mountModal({ cards: [makeCard()] })
      mockDecksData.status.value = 'error'
      await nextTick()
      const messageBefore = wrapper
        .find('[data-testid="move-cards__deck-list-error-message"]')
        .text()

      // Real @pinia/colada semantics: a repeat failure leaves `status` at
      // 'error' — the mock reflects that by never reassigning it, so
      // `refetch()` itself produces no observable status change.
      await wrapper.find('[data-testid="move-cards__retry"]').trigger('click')
      await flushPromises()

      const messageAfter = wrapper
        .find('[data-testid="move-cards__deck-list-error-message"]')
        .text()
      expect(messageAfter).toBe(messageBefore)
      expect(emitSfxMock).toHaveBeenCalledWith('ui.rejected')
      // shake() is the only visible signal of the repeat failure — its gsap
      // timeline must have been built, not merely the cue emitted.
      expect(gsapTimelineMock).toHaveBeenCalled()
    })
  })

  // ── Layout ──────────────────────────────────────────────────────────────────

  test('renders the deck list and action buttons', () => {
    const cards = [makeCard({ front_text: 'Q', back_text: 'A' })]
    const { wrapper } = mountModal({ cards })
    expect(wrapper.find('[data-testid="move-cards__deck-list"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="move-cards__actions"]').exists()).toBe(true)
  })

  test('renders one deck item per deck from useMemberDecksQuery', () => {
    const cards = [makeCard()]
    const { wrapper } = mountModal({ cards })
    const items = wrapper.findAll('[data-testid="options-panel__card"]')
    expect(items).toHaveLength(3)
  })

  test('no longer wraps the deck list in a dialog-card-body — the panel owns its own scroll handle [obligation]', () => {
    const cards = [makeCard()]
    const { wrapper } = mountModal({ cards })
    expect(wrapper.find('[data-testid="move-cards__deck-list-wrap"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="dialog-card-body"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="move-cards__deck-list"]').exists()).toBe(true)
  })

  // dialog-card's `content-grid` gives grid-column: content to its own direct
  // children only — a wrapper in between would have opted the deck list out.
  test('the deck list is a direct child of dialog-card, landing in the same content-grid column as before [obligation]', () => {
    const cards = [makeCard()]
    const wrapper = shallowMount(MoveCardsModal, {
      props: { cards, current_deck_id: 30, close: vi.fn(), move: vi.fn() },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn, stubActions: false })],
        stubs: {
          Card: CardStub,
          UiRadio: UiRadioStub,
          UiButton: UiButtonStub,
          UiOptionsPanel: UiOptionsPanelStub,
          ScrollBar: ScrollBarStub,
          DialogCard: false,
          DialogCardHeader: false
        }
      }
    })

    const dialog_card = wrapper.find('[data-testid="move-cards"]')
    const deck_list = wrapper.find('[data-testid="move-cards__deck-list"]')
    expect(deck_list.element.parentElement).toBe(dialog_card.element)
  })

  test('disables the current deck row', () => {
    const cards = [makeCard()]
    const { wrapper } = mountModal({ cards, current_deck_id: 10 })
    const items = wrapper.findAll('[data-testid="options-panel__card"]')
    // deck 10 (index 0) is the current deck
    expect(items[0].attributes('class')).toContain('pointer-events-none')
    expect(items[1].attributes('class')).not.toContain('pointer-events-none')
  })

  test('disables no deck when current_deck_id is undefined (mixed-deck selection) [obligation]', () => {
    const cards = [makeCard()]
    const { wrapper } = mountModal({ cards, current_deck_id: undefined })
    const items = wrapper.findAll('[data-testid="options-panel__card"]')

    items.forEach((item) => expect(item.attributes('class')).not.toContain('pointer-events-none'))
  })

  test('every deck stays selectable when current_deck_id is undefined [obligation]', async () => {
    const cards = [makeCard()]
    const { wrapper } = mountModal({ cards, current_deck_id: undefined })

    await wrapper.findAll('[data-testid="options-panel__card"]')[0].trigger('click')

    expect(wrapper.find('[data-testid="move-cards__move"]').attributes('disabled')).toBeUndefined()
  })

  // ── Title / moving_count obligation ──────────────────────────────────────────

  test('count prop overrides cards.length for title computation', async () => {
    const preview_cards = [
      makeCard({ front_text: 'Q1', back_text: 'A1' }),
      makeCard({ front_text: 'Q2', back_text: 'A2' }),
      makeCard({ front_text: 'Q3', back_text: 'A3' })
    ]
    const { wrapper } = mountModal({ cards: preview_cards, count: 200 })
    const titleText = wrapper.find('.move-cards__title').text()
    expect(titleText).toContain('200')
    expect(titleText).not.toMatch(/\b3\b/)
  })

  test('without count prop, title reflects cards.length when cards have content', async () => {
    const two_cards = [
      makeCard({ front_text: 'Q1', back_text: 'A1' }),
      makeCard({ front_text: 'Q2', back_text: 'A2' })
    ]
    const { wrapper } = mountModal({ cards: two_cards })
    const titleText = wrapper.find('.move-cards__title').text()
    expect(titleText).toContain('2')
  })

  test('moving_count (guard math) uses count, not cards.length, even with a single blank preview card [obligation]', async () => {
    // A single blank placeholder card zeroes out the title's effective_count,
    // but the authoritative moving_count must still drive the limit guard —
    // resolveMoveArgs' count (200, from select-all mode), not cards.length (1).
    const blank_preview = [makeCard({ front_text: '', back_text: '' })]
    const { wrapper } = mountModal({ cards: blank_preview, count: 200 })

    await wrapper.findAll('[data-testid="options-panel__card"]')[1].trigger('click')
    await wrapper.find('[data-testid="move-cards__move"]').trigger('click')
    await flushPromises()

    expect(guardAddCardsMock).toHaveBeenCalledWith(200)
  })

  // ── Guard 1: onMove calls guardAddCards before closing ───────────────────────

  describe('Guard 1 — guardAddCards', () => {
    test('calls guardAddCards with moving_count against the selected deck [obligation]', async () => {
      const cards = [makeCard()]
      const { wrapper } = mountModal({ cards, current_deck_id: 30 })
      await wrapper.findAll('[data-testid="options-panel__card"]')[1].trigger('click')
      await wrapper.find('[data-testid="move-cards__move"]').trigger('click')
      await flushPromises()
      expect(guardAddCardsMock).toHaveBeenCalledWith(1)
    })

    test('does not close the modal when guardAddCards resolves false [obligation]', async () => {
      guardAddCardsMock.mockResolvedValue(false)
      const cards = [makeCard()]
      const { wrapper, close } = mountModal({ cards, current_deck_id: 30 })
      await wrapper.findAll('[data-testid="options-panel__card"]')[1].trigger('click')
      await wrapper.find('[data-testid="move-cards__move"]').trigger('click')
      await flushPromises()
      expect(close).not.toHaveBeenCalled()
    })

    test('closes the modal with the selected deck_id when guardAddCards resolves true', async () => {
      guardAddCardsMock.mockResolvedValue(true)
      const cards = [makeCard()]
      const { wrapper, close } = mountModal({ cards, current_deck_id: 30 })
      await wrapper.findAll('[data-testid="options-panel__card"]')[1].trigger('click')
      await wrapper.find('[data-testid="move-cards__move"]').trigger('click')
      await flushPromises()
      expect(close).toHaveBeenCalledWith({ deck_id: 20 })
    })
  })

  // ── Guard 2: isDeckFull ───────────────────────────────────────────────────────

  describe('Guard 2 — full deck rows', () => {
    test('shows the "Full" label instead of a radio for a full deck [obligation]', () => {
      mockDecksData.data.value = [
        { id: 10, title: 'Deck A', card_count: 200 },
        { id: 20, title: 'Deck B', card_count: 0 },
        { id: 30, title: 'Current Deck', card_count: 0 }
      ]
      const cards = [makeCard()]
      const { wrapper } = mountModal({ cards, current_deck_id: 30 })
      const items = wrapper.findAll('[data-testid="options-panel__card"]')
      expect(items[0].find('[data-testid="move-cards__deck-full-label"]').exists()).toBe(true)
      expect(items[0].find('[data-testid="move-cards__deck-radio"]').exists()).toBe(false)
    })

    test('clicking a full deck row does not change selected_deck_id [obligation]', async () => {
      mockDecksData.data.value = [
        { id: 10, title: 'Deck A', card_count: 200 },
        { id: 20, title: 'Deck B', card_count: 0 },
        { id: 30, title: 'Current Deck', card_count: 0 }
      ]
      const cards = [makeCard()]
      const { wrapper } = mountModal({ cards, current_deck_id: 30 })
      await wrapper.findAll('[data-testid="options-panel__card"]')[0].trigger('click')
      // Move button stays disabled — no deck got selected via the full row's tap
      expect(wrapper.find('[data-testid="move-cards__move"]').attributes('disabled')).toBeDefined()
    })

    test('a non-full deck keeps its radio and is not marked full', () => {
      mockDecksData.data.value = [
        { id: 10, title: 'Deck A', card_count: 200 },
        { id: 20, title: 'Deck B', card_count: 0 },
        { id: 30, title: 'Current Deck', card_count: 0 }
      ]
      const cards = [makeCard()]
      const { wrapper } = mountModal({ cards, current_deck_id: 30 })
      const items = wrapper.findAll('[data-testid="options-panel__card"]')
      expect(items[1].find('[data-testid="move-cards__deck-full-label"]').exists()).toBe(false)
      expect(items[1].find('[data-testid="move-cards__deck-radio"]').exists()).toBe(true)
    })

    test('paid plan (null cardsPerDeckLimit) never marks a deck full', () => {
      cardsPerDeckLimitRef.value = null
      mockDecksData.data.value = [{ id: 10, title: 'Deck A', card_count: 999999 }]
      const cards = [makeCard()]
      const { wrapper } = mountModal({ cards, current_deck_id: 30 })
      const items = wrapper.findAll('[data-testid="options-panel__card"]')
      expect(items[0].find('[data-testid="move-cards__deck-full-label"]').exists()).toBe(false)
    })

    test('the current deck row never shows the "Full" label even when its math would flag it full [obligation]', () => {
      mockDecksData.data.value = [
        { id: 10, title: 'Deck A', card_count: 0 },
        { id: 20, title: 'Deck B', card_count: 0 },
        { id: 30, title: 'Current Deck', card_count: 200 }
      ]
      const cards = [makeCard()]
      const { wrapper } = mountModal({ cards, current_deck_id: 30 })
      const items = wrapper.findAll('[data-testid="options-panel__card"]')
      // Current deck is index 2 — stays radio-based disabled treatment, no "Full" label
      expect(items[2].find('[data-testid="move-cards__deck-full-label"]').exists()).toBe(false)
      expect(items[2].find('[data-testid="move-cards__deck-radio"]').exists()).toBe(true)
      expect(items[2].attributes('class')).toContain('pointer-events-none')
    })
  })

  // ── Selection ─────────────────────────────────────────────────────────────

  test('move button is disabled when no deck is selected', () => {
    const { wrapper } = mountModal({ cards: [makeCard()] })
    expect(wrapper.find('[data-testid="move-cards__move"]').attributes('disabled')).toBeDefined()
  })

  test('clicking a deck item selects that deck', async () => {
    const cards = [makeCard()]
    const { wrapper } = mountModal({ cards })
    const items = wrapper.findAll('[data-testid="options-panel__card"]')
    await items[1].trigger('click')
    expect(wrapper.find('[data-testid="move-cards__move"]').attributes('disabled')).toBeUndefined()
  })

  test('clicking the same deck again deselects it', async () => {
    const cards = [makeCard()]
    const { wrapper } = mountModal({ cards })
    const items = wrapper.findAll('[data-testid="options-panel__card"]')
    await items[1].trigger('click')
    await items[1].trigger('click')
    expect(wrapper.find('[data-testid="move-cards__move"]').attributes('disabled')).toBeDefined()
  })

  test('move button click is a no-op when no deck is selected', async () => {
    const { wrapper, close } = mountModal({ cards: [makeCard()] })
    await wrapper.find('[data-testid="move-cards__move"]').trigger('click')
    await flushPromises()
    expect(close).not.toHaveBeenCalled()
    expect(guardAddCardsMock).not.toHaveBeenCalled()
  })

  // ── Cancel ──────────────────────────────────────────────────────────────────

  test('dialog-card close calls close with false', async () => {
    const { wrapper, close } = mountModal({ cards: [makeCard()] })
    await wrapper.find('[data-testid="move-cards__dialog-close"]').trigger('click')
    expect(close).toHaveBeenCalledWith(false)
  })

  test('dialog-card close emits pop_up_close [obligation]', async () => {
    const { wrapper } = mountModal({ cards: [makeCard()] })
    await wrapper.find('[data-testid="move-cards__dialog-close"]').trigger('click')
    expect(emitSfxMock).toHaveBeenCalledWith('dialog.close')
  })

  // ── onMove failure handling ──────────────────────────────────────────────────

  describe('onMove failure handling', () => {
    test('sets moving true before awaiting move, then resets it back to false on success [obligation]', async () => {
      let resolve_move
      const move = vi.fn(() => new Promise((resolve) => (resolve_move = resolve)))
      const { wrapper } = mountModal({ cards: [makeCard()], move })
      await wrapper.findAll('[data-testid="options-panel__card"]')[1].trigger('click')
      wrapper.find('[data-testid="move-cards__move"]').trigger('click')
      await flushPromises()

      expect(wrapper.find('[data-testid="move-cards__move"]').attributes('loading')).toBe('true')

      resolve_move()
      await flushPromises()

      expect(wrapper.find('[data-testid="move-cards__move"]').attributes('loading')).toBe('false')
    })

    test('calls close({ deck_id }) with the selected deck id when move resolves [obligation]', async () => {
      const move = vi.fn().mockResolvedValue(undefined)
      const { wrapper, close } = mountModal({ cards: [makeCard()], move })
      await wrapper.findAll('[data-testid="options-panel__card"]')[1].trigger('click')
      await wrapper.find('[data-testid="move-cards__move"]').trigger('click')
      await flushPromises()

      expect(move).toHaveBeenCalledWith(20)
      expect(close).toHaveBeenCalledWith({ deck_id: 20 })
    })

    test('shows a success toast with the moved-card count before closing [obligation]', async () => {
      const move = vi.fn().mockResolvedValue(undefined)
      const cards = [makeCard({ id: 1 }), makeCard({ id: 2 })]
      const { wrapper } = mountModal({ cards, move })
      await wrapper.findAll('[data-testid="options-panel__card"]')[1].trigger('click')
      await wrapper.find('[data-testid="move-cards__move"]').trigger('click')
      await flushPromises()

      const notice = useNoticeStore()
      expect(notice.notices).toHaveLength(1)
      expect(notice.notices[0].state).toBe('success')
    })

    test('when move rejects with a plan-limit error, does not close, calls handleLimitError, and does not show the generic notice [obligation]', async () => {
      const error = { code: 'PT402' }
      const move = vi.fn().mockRejectedValue(error)
      handleLimitErrorMock.mockReturnValue(true)
      const { wrapper, close } = mountModal({ cards: [makeCard()], move })
      await wrapper.findAll('[data-testid="options-panel__card"]')[1].trigger('click')
      await wrapper.find('[data-testid="move-cards__move"]').trigger('click')
      await flushPromises()

      expect(close).not.toHaveBeenCalled()
      expect(handleLimitErrorMock).toHaveBeenCalledWith(error)
      const notice = useNoticeStore()
      expect(notice.notices).toHaveLength(0)
    })

    test('when move rejects and handleLimitError returns false, shows the generic move-failed notice and does not close [obligation]', async () => {
      const error = new Error('network down')
      const move = vi.fn().mockRejectedValue(error)
      handleLimitErrorMock.mockReturnValue(false)
      const { wrapper, close } = mountModal({ cards: [makeCard()], move })
      await wrapper.findAll('[data-testid="options-panel__card"]')[1].trigger('click')
      await wrapper.find('[data-testid="move-cards__move"]').trigger('click')
      await flushPromises()

      expect(close).not.toHaveBeenCalled()
      expect(handleLimitErrorMock).toHaveBeenCalledWith(error)
      const notice = useNoticeStore()
      expect(notice.notices).toHaveLength(1)
      expect(notice.notices[0].state).toBe('error')
    })

    test('resets moving back to false after a failed move [obligation]', async () => {
      const move = vi.fn().mockRejectedValue(new Error('nope'))
      const { wrapper } = mountModal({ cards: [makeCard()], move })
      await wrapper.findAll('[data-testid="options-panel__card"]')[1].trigger('click')
      await wrapper.find('[data-testid="move-cards__move"]').trigger('click')
      await flushPromises()

      expect(wrapper.find('[data-testid="move-cards__move"]').attributes('loading')).toBe('false')
    })
  })

  test('clicking the radio directly selects its deck', async () => {
    const cards = [makeCard()]
    const { wrapper } = mountModal({ cards })
    const radios = wrapper.findAllComponents({ name: 'UiRadio' })
    await radios[1].trigger('click')
    expect(wrapper.find('[data-testid="move-cards__move"]').attributes('disabled')).toBeUndefined()
  })
})
