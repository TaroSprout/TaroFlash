import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { shallowMount, mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { defineComponent, h, nextTick, ref } from 'vue'
import { card } from '@tests/fixtures/card'
// Generates the real Tailwind utilities and stations.css roles this file's
// theming obligations need — without it, `bg-well`/`bg-skeleton`/`shimmer`
// resolve to nothing and every computed-style assertion below is vacuous.
import '@/styles/main.css'

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
  props: {
    size: {},
    coverConfig: {},
    side: {},
    // Boolean-typed so a valueless `shimmer` template attribute casts to
    // `true` instead of surviving as the empty string Vue leaves a plain
    // string-array prop declaration with.
    shimmer: { type: Boolean }
  },
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

// `sfx` is declared so it lands in props (not attrs) and stays readable via
// `props('sfx')`. The real UiButton fires its press cue from inside its own
// `tap()` handler, which this shallow stub doesn't model — so a call site here
// can only assert it wired the role through, never that audio played.
const UiButtonStub = defineComponent({
  name: 'UiButton',
  props: ['disabled', 'iconLeft', 'sfx'],
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
  const {
    cards = [],
    count,
    close = vi.fn(),
    move = vi.fn().mockResolvedValue(undefined),
    // Live DOM attachment, needed only where a test reads computed/pseudo-element
    // styles — everything else stays detached, which is cheaper.
    attach = false
  } = opts
  // A plain destructured default can't distinguish "omitted" from an explicit
  // `current_deck_id: undefined` (both fall back to it) — read straight off
  // `opts` so a test can exercise the real undefined (mixed-deck) case.
  const current_deck_id = 'current_deck_id' in opts ? opts.current_deck_id : 30

  const wrapper = shallowMount(MoveCardsModal, {
    ...(attach ? { attachTo: document.body } : {}),
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

/**
 * Mounts with the real dialog-card (and, optionally, the real card) attached
 * to a `position: fixed; inset: 0` host, mirroring the ui-kit modal overlay
 * that always wraps this component in production — without an explicit-height
 * ancestor, the dialog's mobile-viewport `h-full` has nothing to fill and
 * collapses to its content height instead, which the real overlay never lets
 * happen. `data-station`, `bg-*` roles, and the local colour remap all resolve
 * to actual computed values here instead of stub markup.
 */
function mountRealModal(opts = {}) {
  const {
    cards = [makeCard()],
    current_deck_id = 30,
    close = vi.fn(),
    move = vi.fn(),
    real_card = false
  } = opts

  const host = document.createElement('div')
  host.style.position = 'fixed'
  host.style.inset = '0'
  // `display: flex` (default `align-items: stretch`) is what the real modal
  // overlay's flex wrapper gives the dialog — a definite height its own
  // `h-full` can resolve against, through the extra wrapper div Vue Test
  // Utils inserts between this host and the mounted component.
  host.style.display = 'flex'
  document.body.appendChild(host)

  const wrapper = mount(MoveCardsModal, {
    attachTo: host,
    props: { cards, current_deck_id, close, move },
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn, stubActions: false })],
      stubs: {
        UiRadio: UiRadioStub,
        UiButton: UiButtonStub,
        UiOptionsPanel: UiOptionsPanelStub,
        ScrollBar: ScrollBarStub,
        DialogCard: false,
        DialogCardHeader: false,
        DialogCardBody: DialogCardBodyStub,
        Card: real_card ? false : CardStub
      }
    }
  })
  return { wrapper, host }
}

describe('MoveCardsModal', () => {
  let real_wrappers = []

  afterEach(() => {
    for (const { wrapper, host } of real_wrappers) {
      wrapper.unmount()
      host.remove()
    }
    real_wrappers = []
  })

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

    test('never renders the skeleton and the real deck-list panel at the same time, in either state [obligation]', () => {
      mockDecksData.status.value = 'pending'
      const { wrapper } = mountModal({ cards: [makeCard()] })
      const pendingSkeleton = wrapper
        .find('[data-testid="move-cards__deck-list-skeleton"]')
        .exists()
      const pendingList = wrapper.find('[data-testid="move-cards__deck-list"]').exists()
      expect(pendingSkeleton && pendingList).toBe(false)

      mockDecksData.status.value = 'success'
      const { wrapper: loaded } = mountModal({ cards: [makeCard()] })
      const loadedSkeleton = loaded.find('[data-testid="move-cards__deck-list-skeleton"]').exists()
      const loadedList = loaded.find('[data-testid="move-cards__deck-list"]').exists()
      expect(loadedSkeleton && loadedList).toBe(false)
    })

    test('gives every skeleton row a shimmering cover and a shimmering label bar [obligation]', () => {
      mockDecksData.status.value = 'pending'
      const { wrapper } = mountModal({ cards: [makeCard()] })

      const rows = wrapper.findAll('[data-testid="move-cards__deck-list-skeleton-row"]')
      rows.forEach((row) => {
        const cover = row.findComponent(CardStub)
        expect(cover.props('shimmer')).toBe(true)
        expect(row.find('[data-testid="move-cards__deck-list-skeleton-label"]').exists()).toBe(true)
      })
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

    // A ui-kit button is silent on press unless the call site names a role, so
    // wiring the cue is this component's job and worth asserting here. That
    // the named role actually plays is UiButton's own contract, covered in
    // tests/integration/components/ui-kit/button.test.js — this asserts the
    // wiring only, since the stub below can't reach the real tap() handler.
    test('wires the default press cue onto the retry button [obligation]', () => {
      mockDecksData.status.value = 'error'
      const { wrapper } = mountModal({ cards: [makeCard()] })

      const retry = wrapper
        .findAllComponents(UiButtonStub)
        .find((button) => button.attributes('data-testid') === 'move-cards__retry')

      expect(retry.props('sfx')).toEqual({ press: 'ui.press' })
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
      // Two distinct cues fire on this press in the real app: the button's own
      // ui.press at tap time, then ui.rejected once the refetch fails. Only
      // the second reaches emitSfxMock here — the first belongs to the real
      // UiButton's tap() handler, which the stub replaces. Assert the role,
      // never a total emission count, or that boundary reads as a bug.
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

  // ── Skeleton theming ──────────────────────────────────────────────────────

  describe('skeleton theming [obligation]', () => {
    test('the shimmering label bar establishes its own positioning context, containing the sweep', () => {
      mockDecksData.status.value = 'pending'
      const { wrapper } = mountModal({ cards: [makeCard()], attach: true })

      try {
        const label = wrapper.find('[data-testid="move-cards__deck-list-skeleton-label"]')
        const label_style = getComputedStyle(label.element)
        // The sweep is an absolutely-positioned `::after` — a `static` host
        // gives it no containing block of its own, so it resolves against the
        // nearest positioned ancestor instead (the whole dialog).
        expect(label_style.position).not.toBe('static')

        const sweep_style = getComputedStyle(label.element, '::after')
        expect(sweep_style.content).not.toBe('none')
        expect(sweep_style.position).toBe('absolute')
        // `--shimmer-bleed` is 0 here, so the sweep's inset sits flush with the
        // label bar's own box rather than reaching past it.
        expect(sweep_style.top).toBe('0px')
        expect(sweep_style.left).toBe('0px')
        expect(sweep_style.right).toBe('0px')
        expect(sweep_style.bottom).toBe('0px')

        // Confirms the containing block really is the bar, not the dialog:
        // the bar is far narrower than the modal it sits inside.
        const dialog_width = wrapper
          .find('[data-testid="move-cards"]')
          .element.getBoundingClientRect().width
        const label_width = label.element.getBoundingClientRect().width
        expect(label_width).toBeLessThan(dialog_width)
      } finally {
        wrapper.unmount()
      }
    })

    test('the dialog, the skeleton container, and a placeholder each paint a different background', () => {
      mockDecksData.status.value = 'pending'
      const { wrapper, host } = mountRealModal({ cards: [makeCard()] })
      real_wrappers.push({ wrapper, host })

      const dialog_bg = getComputedStyle(
        wrapper.find('[data-testid="move-cards"]').element
      ).backgroundColor
      const skeleton_bg = getComputedStyle(
        wrapper.find('[data-testid="move-cards__deck-list-skeleton"]').element
      ).backgroundColor
      const placeholder_bg = getComputedStyle(
        wrapper.find('[data-testid="move-cards__deck-list-skeleton-label"]').element
      ).backgroundColor

      expect(dialog_bg).not.toBe(skeleton_bg)
      expect(dialog_bg).not.toBe(placeholder_bg)
      expect(skeleton_bg).not.toBe(placeholder_bg)
    })

    test('the local raised-role remap makes the skeleton cover match the placeholder, not the well it sits in', () => {
      mockDecksData.status.value = 'pending'
      const { wrapper, host } = mountRealModal({ cards: [makeCard()], real_card: true })
      real_wrappers.push({ wrapper, host })

      const well_bg = getComputedStyle(
        wrapper.find('[data-testid="move-cards__deck-list-skeleton"]').element
      ).backgroundColor
      const placeholder_bg = getComputedStyle(
        wrapper.find('[data-testid="move-cards__deck-list-skeleton-label"]').element
      ).backgroundColor
      const cover_bg = getComputedStyle(
        wrapper.find('[data-testid="card-cover"]').element
      ).backgroundColor

      // `SKELETON_COVER` carries no palette, so the cover falls to
      // `--color-raised` for its fill — the local `[--color-raised:var(--color-skeleton)]`
      // remap is what makes that resolve to the same paint as the label bar
      // instead of `well`, which is invisible against this container.
      expect(cover_bg).toBe(placeholder_bg)
      expect(cover_bg).not.toBe(well_bg)
    })

    test('the modal does not change height when the real deck list replaces the skeleton', async () => {
      mockDecksData.status.value = 'pending'
      const { wrapper, host } = mountRealModal({ cards: [makeCard()] })
      real_wrappers.push({ wrapper, host })

      const dialog = wrapper.find('[data-testid="move-cards"]').element
      const pending_height = dialog.getBoundingClientRect().height

      mockDecksData.status.value = 'success'
      await nextTick()

      const loaded_height = dialog.getBoundingClientRect().height
      expect(loaded_height).toBe(pending_height)
    })
  })
})
