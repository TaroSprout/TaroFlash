import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { card } from '@tests/fixtures/card'

const {
  cardsInfiniteQueryMock,
  allCardsRefetchMock,
  deckQueryMock,
  insertCardMock,
  saveCardMock,
  deleteCardsMock,
  deleteCardsInDeckMock,
  moveCardsMock,
  reorderCardMock,
  setCardImageMock,
  deleteCardImageMock,
  modalOpenMock,
  alertWarnMock,
  emitSfxMock,
  useInfiniteScrollMock,
  guardAddCardsMock,
  handleLimitErrorMock
} = vi.hoisted(() => ({
  cardsInfiniteQueryMock: vi.fn(),
  allCardsRefetchMock: vi.fn().mockResolvedValue({ data: [] }),
  deckQueryMock: vi.fn(),
  insertCardMock: vi.fn(),
  saveCardMock: vi.fn(),
  deleteCardsMock: vi.fn(),
  deleteCardsInDeckMock: vi.fn(),
  moveCardsMock: vi.fn(),
  reorderCardMock: vi.fn(),
  setCardImageMock: vi.fn(),
  deleteCardImageMock: vi.fn(),
  modalOpenMock: vi.fn(),
  alertWarnMock: vi.fn(),
  emitSfxMock: vi.fn(),
  useInfiniteScrollMock: vi.fn(),
  guardAddCardsMock: vi.fn().mockResolvedValue(true),
  handleLimitErrorMock: vi.fn().mockReturnValue(false)
}))

vi.mock('@/api/cards', () => ({
  useCardsInDeckInfiniteQuery: cardsInfiniteQueryMock,
  useAllCardsInDeckQuery: () => ({ refetch: allCardsRefetchMock }),
  useInsertCardMutation: () => ({ mutate: insertCardMock, mutateAsync: insertCardMock }),
  useSaveCardMutation: () => ({ mutate: saveCardMock, mutateAsync: saveCardMock }),
  useDeleteCardsMutation: () => ({ mutate: deleteCardsMock, mutateAsync: deleteCardsMock }),
  useDeleteCardsInDeckMutation: () => ({
    mutate: deleteCardsInDeckMock,
    mutateAsync: deleteCardsInDeckMock
  }),
  useMoveCardsToDeckMutation: () => ({ mutate: moveCardsMock, mutateAsync: moveCardsMock }),
  useMoveCardMutation: () => ({ mutate: reorderCardMock, mutateAsync: reorderCardMock }),
  useSetCardImageMutation: () => ({ mutate: setCardImageMock, mutateAsync: setCardImageMock }),
  useDeleteCardImageMutation: () => ({
    mutate: deleteCardImageMock,
    mutateAsync: deleteCardImageMock
  })
}))

vi.mock('@/api/decks', () => ({
  useDeckQuery: deckQueryMock
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key) => key })
}))

vi.mock('@/composables/alert', () => ({
  useAlert: () => ({ warn: alertWarnMock })
}))

vi.mock('@/composables/modal', () => ({
  useModal: () => ({ open: modalOpenMock })
}))

vi.mock('@/composables/card/limit-gate', () => ({
  useCardLimitGate: () => ({
    guardAddCards: guardAddCardsMock,
    handleLimitError: handleLimitErrorMock
  })
}))

vi.mock('@/sfx/bus', () => ({ emitSfx: emitSfxMock }))

vi.mock('@/composables/ui/infinite-scroll', () => ({
  useInfiniteScroll: useInfiniteScrollMock
}))

vi.mock('@/components/card-actions/move-cards-modal.vue', () => ({ default: {} }))

const { mockNotice } = vi.hoisted(() => ({
  mockNotice: { error: vi.fn(), success: vi.fn(), warn: vi.fn() }
}))
vi.mock('@/stores/notice-store', () => ({ useNoticeStore: () => mockNotice }))

import { useCardListController } from '@/views/deck/composables/list-controller'

function makeCard(overrides = {}) {
  return card.one({ overrides })
}

function makeCardsQuery(persisted = [], next_rank = null) {
  return {
    data: { value: { pages: [{ cards: persisted, next_rank }], pageParams: [0] } },
    hasNextPage: { value: false },
    loadNextPage: vi.fn(),
    isLoading: { value: false }
  }
}

function makeDeckQuery(card_count = 0) {
  return {
    data: ref({ id: 10, card_count }),
    refetch: vi.fn().mockResolvedValue(undefined)
  }
}

// Returns a minimal shell stub that satisfies the controller's `exitMode`, `setMode`,
// and `sort_by` requirements. sort_by is a ref because the source reads it reactively.
function makeShell(overrides = {}) {
  return {
    exitMode: overrides.exitMode ?? vi.fn(),
    setMode: overrides.setMode ?? vi.fn(),
    sort_by: overrides.sort_by ?? ref('default')
  }
}

// Returns the controller with `deck_query` attached so refetch + reactive
// data assertions can target the same handle the controller uses internally.
// Mocks `useDeckQuery` for the lifetime of the call so both the controller
// and the inner card-selection composable resolve to this query — mirrors
// Pinia Colada's per-key dedupe in production.
// Returns the controller flattened — sub-namespaces (list/selection/actions)
// are spread onto the root for ergonomic test destructuring. Real consumers
// reach in via the grouped surface; the flatten happens here only.
function makeController(persisted = [], ids = persisted.map((c) => c.id), deck_query, shell) {
  const dq = deck_query ?? makeDeckQuery(ids.length)
  const sh = shell ?? makeShell()
  cardsInfiniteQueryMock.mockReturnValueOnce(makeCardsQuery(persisted))
  deckQueryMock.mockReturnValue(dq)
  const controller = useCardListController({ deck_id: 10, shell: sh, search_query: ref('') })
  return {
    ...controller,
    ...controller.list,
    ...controller.selection,
    ...controller.actions,
    // Re-expose gated wrappers after the list spread so tests can call the
    // gated versions (addCard/appendCard/prependCard with the limit gate) via
    // ctrl.gated_addCard etc. The list spread above overwrites the ungated
    // versions onto the same keys — these aliases preserve the gated surface.
    gated_addCard: controller.addCard,
    gated_appendCard: controller.appendCard,
    gated_prependCard: controller.prependCard,
    // Expose controller-level addCardAtTop and claimFocus (not spread from list)
    addCardAtTop: controller.addCardAtTop,
    claimFocus: controller.claimFocus,
    deck_query: dq,
    shell: sh
  }
}

describe('useCardListController', () => {
  beforeEach(() => {
    localStorage.clear()
    insertCardMock.mockReset()
    insertCardMock.mockResolvedValue({ id: 9999, rank: 'a5' })
    saveCardMock.mockReset()
    saveCardMock.mockResolvedValue(undefined)
    deleteCardsMock.mockReset()
    deleteCardsMock.mockResolvedValue(undefined)
    deleteCardsInDeckMock.mockReset()
    deleteCardsInDeckMock.mockResolvedValue(0)
    moveCardsMock.mockReset()
    moveCardsMock.mockResolvedValue(undefined)
    reorderCardMock.mockReset()
    reorderCardMock.mockResolvedValue(undefined)
    setCardImageMock.mockReset()
    setCardImageMock.mockResolvedValue(undefined)
    deleteCardImageMock.mockReset()
    deleteCardImageMock.mockResolvedValue(undefined)
    modalOpenMock.mockReset()
    alertWarnMock.mockReset()
    emitSfxMock.mockReset()
    useInfiniteScrollMock.mockReset()
    guardAddCardsMock.mockReset()
    guardAddCardsMock.mockResolvedValue(true)
    handleLimitErrorMock.mockReset()
    handleLimitErrorMock.mockReturnValue(false)
    mockNotice.warn.mockReset()
  })

  // ── Initialization ─────────────────────────────────────────────────────────

  describe('initialization', () => {
    test('all_cards reflects the persisted query pages', () => {
      const { all_cards } = makeController([makeCard({ id: 1 }), makeCard({ id: 2 })])
      expect(all_cards.value.map((c) => c.id)).toEqual([1, 2])
    })

    test('starts with no selection and not in select-all mode', () => {
      const { selected_card_ids, deselected_ids, select_all_mode, saving } = makeController()
      expect(selected_card_ids.value).toEqual([])
      expect(deselected_ids.value).toEqual([])
      expect(select_all_mode.value).toBe(false)
      expect(saving.value).toBe(false)
    })
  })

  // ── addCard ────────────────────────────────────────────────────────────────

  describe('addCard', () => {
    test('appends a temp card with anchor=null when the deck is empty', () => {
      const { all_cards, addCard } = makeController()
      addCard()
      expect(all_cards.value).toHaveLength(1)
      expect(all_cards.value[0].id).toBeLessThan(0)
    })

    test('mints a rank after the last persisted card when no neighbors are passed', async () => {
      const c100 = makeCard({ id: 100 })
      const c200 = makeCard({ id: 200 })
      const { addCard, updateCard, all_cards } = makeController([c100, c200])
      addCard()
      const temp_id = all_cards.value.at(-1).id
      await updateCard(temp_id, { front_text: 'X' })
      const [args] = insertCardMock.mock.calls[0]
      expect(args.rank > c200.rank).toBe(true)
    })

    test('mints a rank after the explicit left neighbor when given', async () => {
      const c100 = makeCard({ id: 100 })
      const c200 = makeCard({ id: 200 })
      const { addCard, updateCard, all_cards } = makeController([c100, c200])
      addCard(100)
      const temp_id = all_cards.value.find((c) => c.id < 0).id
      await updateCard(temp_id, { front_text: 'X' })
      const [args] = insertCardMock.mock.calls[0]
      expect(args.rank > c100.rank).toBe(true)
      expect(args.rank < c200.rank).toBe(true)
    })

    test('mints a rank before the right neighbor when only right is given', async () => {
      const c200 = makeCard({ id: 200 })
      const { addCard, updateCard, all_cards } = makeController([c200])
      addCard(undefined, 200)
      const temp_id = all_cards.value.find((c) => c.id < 0).id
      await updateCard(temp_id, { front_text: 'X' })
      const [args] = insertCardMock.mock.calls[0]
      expect(args.rank < c200.rank).toBe(true)
    })

    test('positions a temp card after its left anchor in the merged list', () => {
      const { all_cards, addCard } = makeController([makeCard({ id: 100 }), makeCard({ id: 200 })])
      addCard(100)
      expect(all_cards.value.map((c) => c.id)).toEqual([100, all_cards.value[1].id, 200])
      expect(all_cards.value[1].id).toBeLessThan(0)
    })

    test('positions a temp card before its right anchor in the merged list', () => {
      const { all_cards, addCard } = makeController([makeCard({ id: 200 })])
      addCard(undefined, 200)
      expect(all_cards.value.map((c) => c.id)).toEqual([all_cards.value[0].id, 200])
      expect(all_cards.value[0].id).toBeLessThan(0)
    })

    test('initializes new temp cards with empty front/back text', () => {
      const { addCard, all_cards } = makeController()
      addCard()
      expect(all_cards.value[0].front_text).toBe('')
      expect(all_cards.value[0].back_text).toBe('')
    })

    test('successive temp adds get unique negative ids', () => {
      const { addCard, all_cards } = makeController()
      addCard()
      addCard()
      const ids = all_cards.value.map((c) => c.id)
      expect(ids[0]).not.toBe(ids[1])
    })

    // Gate tests use the controller's gated addCard/appendCard/prependCard directly
    // (not the spread-in list.addCard) so the guardAddCards call path is exercised.
    // Gate tests use gated_addCard/appendCard/prependCard — aliases preserved in
    // makeController after the list spread (list spread overwrites the same keys).
    test('does not stage a temp card when guardAddCards resolves false', async () => {
      const { gated_addCard, all_cards } = makeController()
      guardAddCardsMock.mockResolvedValue(false)
      await gated_addCard()
      expect(all_cards.value).toHaveLength(0)
    })

    test('stages a temp card when guardAddCards resolves true', async () => {
      const { gated_addCard, all_cards } = makeController()
      guardAddCardsMock.mockResolvedValue(true)
      await gated_addCard()
      expect(all_cards.value).toHaveLength(1)
    })

    test('appendCard calls list.addCard with the target as left neighbor when gate passes', async () => {
      const { gated_appendCard, all_cards } = makeController([
        makeCard({ id: 100 }),
        makeCard({ id: 200 })
      ])
      guardAddCardsMock.mockResolvedValue(true)
      await gated_appendCard(100)
      expect(all_cards.value.map((c) => c.id)).toEqual([100, all_cards.value[1].id, 200])
    })

    test('prependCard calls list.addCard with the target as right neighbor when gate passes', async () => {
      const { gated_prependCard, all_cards } = makeController([
        makeCard({ id: 100 }),
        makeCard({ id: 200 })
      ])
      guardAddCardsMock.mockResolvedValue(true)
      await gated_prependCard(200)
      expect(all_cards.value.map((c) => c.id)).toEqual([100, all_cards.value[1].id, 200])
    })

    test('appendCard does not stage a card when guardAddCards resolves false', async () => {
      const { gated_appendCard, all_cards } = makeController([makeCard({ id: 100 })])
      guardAddCardsMock.mockResolvedValue(false)
      await gated_appendCard(100)
      expect(all_cards.value).toHaveLength(1)
    })

    test('prependCard does not stage a card when guardAddCards resolves false', async () => {
      const { gated_prependCard, all_cards } = makeController([makeCard({ id: 100 })])
      guardAddCardsMock.mockResolvedValue(false)
      await gated_prependCard(100)
      expect(all_cards.value).toHaveLength(1)
    })
  })

  // ── addCardAtTop ──────────────────────────────────────────────────────────

  describe('addCardAtTop', () => {
    test('stages a card at the top of all_cards when gate passes [obligation]', async () => {
      const { addCardAtTop, all_cards } = makeController([makeCard({ id: 100 })])
      guardAddCardsMock.mockResolvedValue(true)
      await addCardAtTop()
      expect(all_cards.value[0].id).toBeLessThan(0)
      expect(all_cards.value[1].id).toBe(100)
    })

    test('does not stage a card when guardAddCards resolves false [obligation]', async () => {
      const { addCardAtTop, all_cards } = makeController([makeCard({ id: 100 })])
      guardAddCardsMock.mockResolvedValue(false)
      await addCardAtTop()
      expect(all_cards.value).toHaveLength(1)
      expect(all_cards.value[0].id).toBe(100)
    })

    test('sets pending_focus_client_id in the same synchronous block as staging [obligation]', async () => {
      // Verify claimFocus returns true for the staged card immediately after addCardAtTop
      // (no await between staging and target assignment in the source — this test pins that)
      const { addCardAtTop, claimFocus, all_cards } = makeController([makeCard({ id: 100 })])
      guardAddCardsMock.mockResolvedValue(true)
      await addCardAtTop()
      const staged_client_id = all_cards.value[0].client_id
      expect(claimFocus(staged_client_id)).toBe(true)
    })
  })

  // ── claimFocus ────────────────────────────────────────────────────────────

  describe('claimFocus', () => {
    test('returns false before any addCardAtTop call [obligation]', () => {
      const { claimFocus } = makeController()
      expect(claimFocus('some-id')).toBe(false)
    })

    test('returns true exactly once for the staged card client_id [obligation]', async () => {
      const { addCardAtTop, claimFocus, all_cards } = makeController([makeCard({ id: 100 })])
      guardAddCardsMock.mockResolvedValue(true)
      await addCardAtTop()
      const staged_client_id = all_cards.value[0].client_id
      expect(claimFocus(staged_client_id)).toBe(true)
      // Second call for the same id must return false (one-shot)
      expect(claimFocus(staged_client_id)).toBe(false)
    })

    test('returns false for a different client_id than the one staged [obligation]', async () => {
      const { addCardAtTop, claimFocus } = makeController([makeCard({ id: 100 })])
      guardAddCardsMock.mockResolvedValue(true)
      await addCardAtTop()
      expect(claimFocus('other-id')).toBe(false)
    })
  })

  // ── claimGrow — the reveal target, staged only by addCardAtTop ──────────────

  describe('claimGrow', () => {
    test('returns true once for a card staged by addCardAtTop (freshly added) [obligation]', async () => {
      const { addCardAtTop, claimGrow, all_cards } = makeController([makeCard({ id: 100 })])
      guardAddCardsMock.mockResolvedValue(true)
      await addCardAtTop()
      const staged_client_id = all_cards.value[0].client_id
      expect(claimGrow(staged_client_id)).toBe(true)
      // One-shot: a second claim returns false
      expect(claimGrow(staged_client_id)).toBe(false)
    })

    test('returns false before any addCardAtTop call [obligation]', () => {
      const { claimGrow } = makeController()
      expect(claimGrow('some-id')).toBe(false)
    })
  })

  // ── appendCard / prependCard ───────────────────────────────────────────────

  describe('appendCard / prependCard', () => {
    test('appendCard delegates to addCard with the target as left neighbor', () => {
      const { all_cards, appendCard } = makeController([
        makeCard({ id: 100 }),
        makeCard({ id: 200 })
      ])
      appendCard(100)
      expect(all_cards.value.map((c) => c.id)).toEqual([100, all_cards.value[1].id, 200])
    })

    test('prependCard delegates to addCard with the target as right neighbor', () => {
      const { all_cards, prependCard } = makeController([
        makeCard({ id: 100 }),
        makeCard({ id: 200 })
      ])
      prependCard(200)
      expect(all_cards.value.map((c) => c.id)).toEqual([100, all_cards.value[1].id, 200])
    })
  })

  // ── create seam — every desktop add path requests autofocus + grow-in ────────

  describe('create seam autofocus', () => {
    test('gated appendCard flags the staged card for autofocus [obligation]', async () => {
      const { gated_appendCard, claimFocus, all_cards } = makeController([makeCard({ id: 100 })])
      await gated_appendCard(100)
      const staged_client_id = all_cards.value.find((c) => c.id < 0).client_id
      expect(claimFocus(staged_client_id)).toBe(true)
    })

    test('gated prependCard flags the staged card for autofocus [obligation]', async () => {
      const { gated_prependCard, claimFocus, all_cards } = makeController([makeCard({ id: 100 })])
      await gated_prependCard(100)
      const staged_client_id = all_cards.value.find((c) => c.id < 0).client_id
      expect(claimFocus(staged_client_id)).toBe(true)
    })

    test('addCardAtTop (empty-state / toolbar path) flags the staged card for autofocus [obligation]', async () => {
      const { addCardAtTop, claimFocus, all_cards } = makeController()
      await addCardAtTop()
      const staged_client_id = all_cards.value[0].client_id
      expect(claimFocus(staged_client_id)).toBe(true)
    })

    test('gated addCard (mobile path) does NOT flag the staged card — the dock owns focus [obligation]', async () => {
      const { gated_addCard, claimFocus, all_cards } = makeController([makeCard({ id: 100 })])
      await gated_addCard()
      const staged_client_id = all_cards.value.find((c) => c.id < 0).client_id
      expect(claimFocus(staged_client_id)).toBe(false)
    })
  })

  // ── updateCard — routing between insertCard (temp) and saveCard (real) ───

  describe('updateCard', () => {
    test('routes to saveCard for an existing (real-id) card', async () => {
      const real = makeCard({ id: 42 })
      const { updateCard } = makeController([real])
      await updateCard(42, { front_text: 'Updated' })
      expect(saveCardMock).toHaveBeenCalledOnce()
      expect(insertCardMock).not.toHaveBeenCalled()
    })

    test('routes to insertCard on first save of a temp card', async () => {
      const { addCard, all_cards, updateCard } = makeController()
      addCard()
      const temp_id = all_cards.value[0].id
      await updateCard(temp_id, { front_text: 'Q', back_text: 'A' })
      expect(insertCardMock).toHaveBeenCalledOnce()
      expect(saveCardMock).not.toHaveBeenCalled()
    })

    test('removes the temp card after a successful insert (cache refetch supplies the real one)', async () => {
      const { addCard, all_cards, updateCard } = makeController()
      addCard()
      const temp_id = all_cards.value[0].id
      await updateCard(temp_id, { front_text: 'X' })
      expect(all_cards.value.find((c) => c.id === temp_id)).toBeUndefined()
    })

    test('passes front/back text to insertCard, preferring values over temp state', async () => {
      const { addCard, all_cards, updateCard } = makeController()
      addCard()
      await updateCard(all_cards.value[0].id, { front_text: 'from values' })
      const [args] = insertCardMock.mock.calls[0]
      expect(args.front_text).toBe('from values')
      expect(args.back_text).toBe('')
    })

    test('is a no-op when the id is not found', async () => {
      const { updateCard } = makeController()
      await updateCard(999, { front_text: 'X' })
      expect(insertCardMock).not.toHaveBeenCalled()
      expect(saveCardMock).not.toHaveBeenCalled()
    })

    test('toggles saving around the async work', async () => {
      let resolveSave
      saveCardMock.mockReturnValueOnce(new Promise((r) => (resolveSave = r)))
      const { updateCard, saving } = makeController([makeCard({ id: 1 })])
      const promise = updateCard(1, { front_text: 'X' })
      expect(saving.value).toBe(true)
      resolveSave()
      await promise
      expect(saving.value).toBe(false)
    })

    test('resets saving even if saveCard rejects', async () => {
      saveCardMock.mockRejectedValueOnce(new Error('boom'))
      const { updateCard, saving } = makeController([makeCard({ id: 1 })])
      await expect(updateCard(1, { front_text: 'X' })).rejects.toThrow('boom')
      expect(saving.value).toBe(false)
    })

    // A staged temp can slip past the stage-time guardAddCards check (stale
    // card_count, concurrent edits on another device) and get rejected by the
    // backend's enforce_deck_card_limit on the INSERT. The insert path routes
    // that rejection through handleLimitError so the upgrade alert still fires.
    test('routes a card-limit insert rejection through handleLimitError instead of throwing', async () => {
      const limit_error = { code: 'PT402' }
      insertCardMock.mockRejectedValueOnce(limit_error)
      handleLimitErrorMock.mockReturnValueOnce(true)
      const { addCard, all_cards, updateCard, saving } = makeController()
      addCard()
      const temp_id = all_cards.value[0].id
      await updateCard(temp_id, { front_text: 'X' })
      expect(handleLimitErrorMock).toHaveBeenCalledWith(limit_error)
      expect(saving.value).toBe(false)
    })

    test('leaves the temp card staged when the insert is rejected by the card limit', async () => {
      insertCardMock.mockRejectedValueOnce({ code: 'PT402' })
      handleLimitErrorMock.mockReturnValueOnce(true)
      const { addCard, all_cards, updateCard } = makeController()
      addCard()
      const temp_id = all_cards.value[0].id
      await updateCard(temp_id, { front_text: 'X' })
      // Still a temp (real_id null) so an upgrade-then-retry re-runs the INSERT.
      expect(all_cards.value.find((c) => c.id === temp_id)).toBeDefined()
    })

    test('rethrows a non-limit insert rejection so generic error handling still runs', async () => {
      insertCardMock.mockRejectedValueOnce(new Error('boom'))
      handleLimitErrorMock.mockReturnValueOnce(false)
      const { addCard, all_cards, updateCard, saving } = makeController()
      addCard()
      const temp_id = all_cards.value[0].id
      await expect(updateCard(temp_id, { front_text: 'X' })).rejects.toThrow('boom')
      expect(saving.value).toBe(false)
    })
  })

  // ── eager insert — stageCard fires the INSERT before any keystroke ─────────

  describe('eager insert on create', () => {
    test('addFocusedCard (desktop appendCard) fires the INSERT immediately, before any text is entered [obligation]', async () => {
      const { gated_appendCard } = makeController([makeCard({ id: 100 })])
      await gated_appendCard(100)
      await flushPromises()
      expect(insertCardMock).toHaveBeenCalledOnce()
    })

    test('addCard (mobile dock editor) fires the INSERT immediately, before any text is entered [obligation]', async () => {
      const { gated_addCard } = makeController([makeCard({ id: 100 })])
      await gated_addCard()
      await flushPromises()
      expect(insertCardMock).toHaveBeenCalledOnce()
    })

    test('only the desktop seam (addFocusedCard) sets the autofocus target, not the mobile seam [obligation]', async () => {
      const { gated_appendCard, gated_addCard, claimFocus, all_cards } = makeController([
        makeCard({ id: 100 })
      ])
      await gated_appendCard(100)
      const desktop_client_id = all_cards.value.find((c) => c.id < 0).client_id
      expect(claimFocus(desktop_client_id)).toBe(true)

      await gated_addCard()
      const mobile_client_id = all_cards.value.find(
        (c) => c.id < 0 && c.client_id !== desktop_client_id
      ).client_id
      expect(claimFocus(mobile_client_id)).toBe(false)
    })

    test('guardAddCards resolving false stages nothing AND fires no insert [obligation]', async () => {
      guardAddCardsMock.mockResolvedValue(false)
      const { gated_appendCard, gated_addCard, all_cards } = makeController([makeCard({ id: 100 })])
      await gated_appendCard(100)
      await gated_addCard()
      await flushPromises()
      expect(all_cards.value).toHaveLength(1)
      expect(insertCardMock).not.toHaveBeenCalled()
    })

    // [obligation] high-value regression: `neighbourRanksFor` skips unranked
    // siblings, so two concurrent mints would both resolve against the same
    // persisted neighbour and collide on the same key. Serializing through
    // one insert_queue makes the second mint read the first's resolved rank.
    test('two cards created in rapid succession mint distinct ranks that sort in render order [obligation]', async () => {
      let next_id = 100
      insertCardMock.mockImplementation(async (args) => ({ id: next_id++, rank: args.rank }))

      const { addCardAtTop, all_cards } = makeController([makeCard({ id: 1 })])
      guardAddCardsMock.mockResolvedValue(true)

      // Fire both creates back to back, without awaiting the first's insert.
      addCardAtTop()
      addCardAtTop()
      // Two inserts serialized through insert_queue is a deeper promise chain
      // than a single insert — flush enough microtask ticks for both to settle.
      for (let i = 0; i < 6; i++) await flushPromises()

      const temps = all_cards.value.filter((c) => c.id !== 1)
      expect(temps).toHaveLength(2)

      const [top, bottom] = temps
      expect(top.rank).toBeTruthy()
      expect(bottom.rank).toBeTruthy()
      expect(top.rank).not.toBe(bottom.rank)
      // Render order is top-to-bottom; ranks must sort the same way.
      expect(top.rank < bottom.rank).toBe(true)
    })

    // [obligation] typing into a card whose eager INSERT is still in flight
    // must yield exactly one card carrying the text — updateCard awaits the
    // pending insert, then routes to saveCard (UPDATE), never a second insert.
    test('typing while the eager insert is in flight yields exactly one card carrying the text [obligation]', async () => {
      let resolveInsert
      insertCardMock.mockReturnValueOnce(
        new Promise((r) => {
          resolveInsert = () => r({ id: 200, rank: 'm5' })
        })
      )

      const { addCardAtTop, all_cards, updateCard } = makeController()
      guardAddCardsMock.mockResolvedValue(true)
      await addCardAtTop()

      const client_id = all_cards.value[0].client_id
      const temp_id = all_cards.value[0].id
      const update_promise = updateCard(temp_id, { front_text: 'typed while inserting' })

      resolveInsert()
      await update_promise

      expect(insertCardMock).toHaveBeenCalledOnce()
      expect(saveCardMock).toHaveBeenCalledOnce()
      const [{ values }] = saveCardMock.mock.calls[0]
      expect(values.front_text).toBe('typed while inserting')
      expect(all_cards.value.filter((c) => c.client_id === client_id)).toHaveLength(1)
    })

    // [obligation] a PT402 rejection on the eager insert rolls the staged row
    // back out of the list — contrast with the updateCard→insertTemp path
    // (see the `updateCard` describe above), which deliberately leaves the
    // temp staged because it may carry user-typed text.
    test('a PT402 rejection on the eager insert removes the staged card from the list [obligation]', async () => {
      insertCardMock.mockRejectedValueOnce({ code: 'PT402' })
      handleLimitErrorMock.mockReturnValueOnce(true)

      const { addCardAtTop, all_cards } = makeController()
      guardAddCardsMock.mockResolvedValue(true)
      await addCardAtTop()
      await flushPromises()
      await flushPromises()

      expect(all_cards.value).toHaveLength(0)
    })

    test('a PT402 rejection on the eager insert surfaces the upgrade alert via handleLimitError [obligation]', async () => {
      const limit_error = { code: 'PT402' }
      insertCardMock.mockRejectedValueOnce(limit_error)
      handleLimitErrorMock.mockReturnValueOnce(true)

      const { addCardAtTop } = makeController()
      guardAddCardsMock.mockResolvedValue(true)
      await addCardAtTop()
      await flushPromises()
      await flushPromises()

      expect(handleLimitErrorMock).toHaveBeenCalledWith(limit_error)
    })

    // [obligation] a non-limit failure of the eager insert is swallowed: the
    // insert only ever carries an empty card, so nothing typed can be lost.
    // No toast, the entry stays a temp, and the next edit re-inserts it.
    test('a non-limit failure of the eager insert is swallowed — no toast, entry stays a temp [obligation]', async () => {
      insertCardMock.mockRejectedValueOnce(new Error('network down'))

      const { addCardAtTop, all_cards } = makeController()
      guardAddCardsMock.mockResolvedValue(true)
      await addCardAtTop()
      await flushPromises()
      await flushPromises()

      expect(all_cards.value).toHaveLength(1)
      expect(all_cards.value[0].id).toBeLessThan(0)
      expect(mockNotice.warn).not.toHaveBeenCalled()
      expect(mockNotice.error).not.toHaveBeenCalled()
    })

    test('the next edit re-inserts a temp whose eager insert failed non-limit [obligation]', async () => {
      insertCardMock.mockRejectedValueOnce(new Error('network down'))
      insertCardMock.mockResolvedValueOnce({ id: 300, rank: 'm9' })

      const { addCardAtTop, all_cards, updateCard } = makeController()
      guardAddCardsMock.mockResolvedValue(true)
      await addCardAtTop()
      await flushPromises()
      await flushPromises()

      const temp_id = all_cards.value[0].id
      await updateCard(temp_id, { front_text: 'retry' })

      expect(insertCardMock).toHaveBeenCalledTimes(2)
      const [second_call_args] = insertCardMock.mock.calls[1]
      expect(second_call_args.front_text).toBe('retry')
    })

    // [obligation] negative: nothing removes an empty temp on blur or when
    // leaving the deck — a successfully-inserted, still-empty card just stays.
    test('a successfully eager-inserted, still-empty card is never auto-removed [obligation]', async () => {
      const { addCardAtTop, all_cards } = makeController()
      guardAddCardsMock.mockResolvedValue(true)
      await addCardAtTop()
      await flushPromises()
      await flushPromises()

      expect(all_cards.value).toHaveLength(1)
      expect(all_cards.value[0].front_text).toBe('')
      expect(all_cards.value[0].back_text).toBe('')
    })

    // [obligation] regression this branch closes: an eagerly-created card is
    // promoted in place and never refetched, so `patchTemp` — not the optimistic
    // cache patch — is what lets the mobile editor's one-side-at-a-time saves
    // both land on the same entry instead of clobbering each other.
    test('create card, save front text, then save back text — both sides survive [obligation]', async () => {
      insertCardMock.mockResolvedValueOnce({ id: 400, rank: 'm7' })

      const { addCardAtTop, all_cards, updateCard } = makeController()
      guardAddCardsMock.mockResolvedValue(true)
      await addCardAtTop()
      await flushPromises()
      await flushPromises()

      const card_id = all_cards.value[0].id
      await updateCard(card_id, { front_text: 'Question' })
      await updateCard(card_id, { back_text: 'Answer' })

      const entry = all_cards.value.find((c) => c.id === card_id)
      expect(entry.front_text).toBe('Question')
      expect(entry.back_text).toBe('Answer')
      // Both saves route to UPDATE — the card was already promoted by the
      // eager insert, so nothing here fires a second INSERT.
      expect(insertCardMock).toHaveBeenCalledOnce()
      expect(saveCardMock).toHaveBeenCalledTimes(2)
    })
  })

  // ── selection — positive mode ──────────────────────────────────────────────

  describe('selection — positive mode', () => {
    test('selectCard adds an id once (no duplicates)', () => {
      const { selectCard, selected_card_ids } = makeController()
      selectCard(1)
      selectCard(1)
      expect(selected_card_ids.value).toEqual([1])
    })

    test('deselectCard removes an id', () => {
      const { selectCard, deselectCard, selected_card_ids } = makeController()
      selectCard(1)
      selectCard(2)
      deselectCard(1)
      expect(selected_card_ids.value).toEqual([2])
    })

    test('toggleSelectCard flips selection state', () => {
      const { toggleSelectCard, selected_card_ids } = makeController()
      toggleSelectCard(1)
      expect(selected_card_ids.value).toEqual([1])
      toggleSelectCard(1)
      expect(selected_card_ids.value).toEqual([])
    })

    test('isCardSelected reflects the positive selection set', () => {
      const { selectCard, isCardSelected } = makeController()
      selectCard(1)
      expect(isCardSelected(1)).toBe(true)
      expect(isCardSelected(2)).toBe(false)
    })

    test('selected_count tracks the positive selection length', () => {
      const { selectCard, selected_count } = makeController()
      selectCard(1)
      selectCard(2)
      expect(selected_count.value).toBe(2)
    })

    test('all_cards_selected is true when the positive selection equals the deck total', () => {
      const { selectCard, all_cards_selected } = makeController(
        [makeCard({ id: 1 }), makeCard({ id: 2 })],
        [1, 2]
      )
      expect(all_cards_selected.value).toBe(false)
      selectCard(1)
      selectCard(2)
      expect(all_cards_selected.value).toBe(true)
    })
  })

  // ── selection — select-all mode (A2) ───────────────────────────────────────

  describe('selection — select-all mode', () => {
    test('selectAllCards flips into select-all mode and clears the positive list', () => {
      const { selectCard, selectAllCards, selected_card_ids, select_all_mode } = makeController()
      selectCard(1)
      selectAllCards()
      expect(select_all_mode.value).toBe(true)
      expect(selected_card_ids.value).toEqual([])
    })

    test('isCardSelected returns true for everything except deselected ids in select-all mode', () => {
      const { selectAllCards, deselectCard, isCardSelected } = makeController(
        [makeCard({ id: 1 }), makeCard({ id: 2 })],
        [1, 2]
      )
      selectAllCards()
      deselectCard(1)
      expect(isCardSelected(1)).toBe(false)
      expect(isCardSelected(2)).toBe(true)
    })

    test('selected_count = total - deselected in select-all mode', () => {
      const { selectAllCards, deselectCard, selected_count } = makeController(
        [makeCard({ id: 1 }), makeCard({ id: 2 }), makeCard({ id: 3 })],
        [1, 2, 3]
      )
      selectAllCards()
      expect(selected_count.value).toBe(3)
      deselectCard(2)
      expect(selected_count.value).toBe(2)
    })

    test('selectCard in select-all mode removes the id from the deselected list', () => {
      const { selectAllCards, deselectCard, selectCard, deselected_ids } = makeController(
        [makeCard({ id: 1 })],
        [1]
      )
      selectAllCards()
      deselectCard(1)
      expect(deselected_ids.value).toEqual([1])
      selectCard(1)
      expect(deselected_ids.value).toEqual([])
    })

    test('clearSelectedCards exits select-all mode and empties both lists', () => {
      const { selectAllCards, deselectCard, clearSelectedCards, select_all_mode, deselected_ids } =
        makeController([makeCard({ id: 1 })], [1])
      selectAllCards()
      deselectCard(1)
      clearSelectedCards()
      expect(select_all_mode.value).toBe(false)
      expect(deselected_ids.value).toEqual([])
    })

    test('toggleSelectAll selects everything when nothing is selected', () => {
      const { toggleSelectAll, select_all_mode } = makeController(
        [makeCard({ id: 1 }), makeCard({ id: 2 })],
        [1, 2]
      )
      toggleSelectAll()
      expect(select_all_mode.value).toBe(true)
    })

    test('toggleSelectAll clears the selection when everything is selected', () => {
      const { toggleSelectAll, select_all_mode, all_cards_selected } = makeController(
        [makeCard({ id: 1 })],
        [1]
      )
      toggleSelectAll()
      expect(all_cards_selected.value).toBe(true)
      toggleSelectAll()
      expect(select_all_mode.value).toBe(false)
    })

    test('all_cards_selected is true in select-all mode iff nothing has been deselected', () => {
      const { selectAllCards, deselectCard, all_cards_selected } = makeController(
        [makeCard({ id: 1 }), makeCard({ id: 2 })],
        [1, 2]
      )
      selectAllCards()
      expect(all_cards_selected.value).toBe(true)
      deselectCard(1)
      expect(all_cards_selected.value).toBe(false)
    })
  })

  // ── card_count — server-side deck total projected from deck_query ─────────

  describe('card_count', () => {
    test('defaults to 0 when deck data is not yet loaded [obligation]', () => {
      const dq = { data: ref(null), refetch: vi.fn() }
      cardsInfiniteQueryMock.mockReturnValueOnce(makeCardsQuery([]))
      deckQueryMock.mockReturnValue(dq)
      const ctrl = useCardListController({ deck_id: 10, shell: makeShell() })
      expect(ctrl.card_count.value).toBe(0)
    })

    test('reflects deck_query.data.card_count reactively [obligation]', () => {
      const dq = makeDeckQuery(197)
      const ctrl = makeController([], [], dq)
      expect(ctrl.card_count.value).toBe(197)
    })

    test('updates when deck_query.data.card_count changes [obligation]', () => {
      const dq = makeDeckQuery(10)
      const ctrl = makeController([], [], dq)
      expect(ctrl.card_count.value).toBe(10)
      dq.data.value = { id: 10, card_count: 25 }
      expect(ctrl.card_count.value).toBe(25)
    })
  })

  // ── card_attributes — projected from deck_query ──────────────────────────

  describe('card_attributes', () => {
    test('defaults to empty front/back when deck data is not yet loaded', () => {
      const ctrl = makeController()
      expect(ctrl.card_attributes.value).toEqual({ front: {}, back: {} })
    })

    test('tracks deck_query.data.card_attributes reactively', () => {
      const deck_query = makeDeckQuery()
      const ctrl = makeController([], [], deck_query)
      deck_query.data.value = { card_attributes: { front: { x: 1 }, back: { y: 2 } } }
      expect(ctrl.card_attributes.value).toEqual({ front: { x: 1 }, back: { y: 2 } })
    })
  })

  // ── newCard — enter edit mode, play chime, stage card ───────────────────────

  describe('newCard', () => {
    test('calls shell.setMode("edit") in both empty and non-empty cases [obligation]', async () => {
      const setMode = vi.fn().mockResolvedValue(undefined)
      const sh = makeShell({ setMode })

      // non-empty path
      const ctrl = makeController([makeCard({ id: 1 })], [1], undefined, sh)
      await ctrl.newCard()
      expect(setMode).toHaveBeenCalledWith('edit')
    })

    test('with empty cards, addCardAtTop runs even when setMode promise never resolves [obligation]', async () => {
      // Empty deck — mode-stack is not mounted, so setMode should not be awaited.
      // Return a never-resolving promise to prove the implementation does NOT await it.
      const setMode = vi.fn().mockReturnValue(new Promise(() => {}))
      const sh = makeShell({ setMode })
      const ctrl = makeController([], [], undefined, sh)

      // newCard must complete (not hang) and stage a card
      await ctrl.newCard()
      expect(ctrl.list.all_cards.value).toHaveLength(1)
      expect(ctrl.list.all_cards.value[0].id).toBeLessThan(0)
    })

    test('with cards present, awaits setMode before staging (setMode resolves first) [obligation]', async () => {
      let setModeResolve
      const setMode = vi.fn().mockReturnValue(new Promise((r) => (setModeResolve = r)))
      const sh = makeShell({ setMode })
      const ctrl = makeController([makeCard({ id: 1 })], [1], undefined, sh)

      const promise = ctrl.newCard()
      // setMode not yet resolved — card should not be staged yet
      expect(ctrl.list.all_cards.value).toHaveLength(1)
      expect(ctrl.list.all_cards.value.every((c) => c.id > 0)).toBe(true)

      setModeResolve()
      await promise
      // After setMode resolves, the new card is staged at the top
      expect(ctrl.list.all_cards.value[0].id).toBeLessThan(0)
    })

    test('emits the add chime in both paths [obligation]', async () => {
      // empty path
      const setMode = vi.fn().mockReturnValue(new Promise(() => {}))
      const ctrl = makeController([], [], undefined, makeShell({ setMode }))
      await ctrl.newCard()
      expect(emitSfxMock).toHaveBeenCalledWith('ui.press')
    })

    test('emits the add chime on non-empty deck path too [obligation]', async () => {
      emitSfxMock.mockReset()
      const setMode = vi.fn().mockResolvedValue(undefined)
      const ctrl = makeController([makeCard({ id: 1 })], [1], undefined, makeShell({ setMode }))
      await ctrl.newCard()
      expect(emitSfxMock).toHaveBeenCalledWith('ui.press')
    })

    test('stages the new card at index 0 when deck is non-empty [obligation]', async () => {
      const setMode = vi.fn().mockResolvedValue(undefined)
      const ctrl = makeController(
        [makeCard({ id: 100 }), makeCard({ id: 200 })],
        [100, 200],
        undefined,
        makeShell({ setMode })
      )
      await ctrl.newCard()
      expect(ctrl.list.all_cards.value[0].id).toBeLessThan(0)
      expect(ctrl.list.all_cards.value[1].id).toBe(100)
    })

    test('does not stage a card when guardAddCards blocks (limit reached) [obligation]', async () => {
      guardAddCardsMock.mockResolvedValue(false)
      const setMode = vi.fn().mockReturnValue(new Promise(() => {}))
      const ctrl = makeController([], [], undefined, makeShell({ setMode }))
      await ctrl.newCard()
      // setMode is still called (gate check happens inside addCardAtTop)
      expect(ctrl.list.all_cards.value).toHaveLength(0)
    })
  })

  // ── editCard — grid dropdown's "Edit" intent ─────────────────────────────────

  describe('editCard', () => {
    test('is a no-op when card_id matches nothing [obligation]', async () => {
      const setMode = vi.fn().mockResolvedValue(undefined)
      const ctrl = makeController([makeCard({ id: 1 })], [1], undefined, makeShell({ setMode }))
      await ctrl.editCard(999)
      expect(setMode).not.toHaveBeenCalled()
    })

    test('sets pending_focus_client_id, switches to edit mode, then scrolls [obligation]', async () => {
      const setMode = vi.fn().mockResolvedValue(undefined)
      const ctrl = makeController([makeCard({ id: 1 })], [1], undefined, makeShell({ setMode }))
      const scroller = { scrollToCard: vi.fn() }
      ctrl.registerScroller(scroller)

      const client_id = ctrl.list.all_cards.value[0].client_id
      await ctrl.editCard(1)

      expect(setMode).toHaveBeenCalledWith('edit')
      expect(ctrl.claimFocus(client_id)).toBe(true)
      expect(scroller.scrollToCard).toHaveBeenCalledWith(client_id)
    })

    test('focuses the edited card but stages no grow-in reveal (unlike addCardAtTop) [obligation]', async () => {
      const setMode = vi.fn().mockResolvedValue(undefined)
      const ctrl = makeController([makeCard({ id: 1 })], [1], undefined, makeShell({ setMode }))
      ctrl.registerScroller({ scrollToCard: vi.fn() })

      const client_id = ctrl.list.all_cards.value[0].client_id
      await ctrl.editCard(1)

      expect(ctrl.claimGrow(client_id)).toBe(false)
      expect(ctrl.claimFocus(client_id)).toBe(true)
    })

    test('is a no-op scroll-wise when no scroller is registered [obligation]', async () => {
      const setMode = vi.fn().mockResolvedValue(undefined)
      const ctrl = makeController([makeCard({ id: 1 })], [1], undefined, makeShell({ setMode }))
      await expect(ctrl.editCard(1)).resolves.toBeUndefined()
    })
  })

  // ── reorderCard — moves a persisted card to a new slot ───────────────────────

  describe('reorderCard', () => {
    // [obligation] no-op when dragged card is a temp (id < 0)
    test('is a no-op when the dragged card is a temp (id < 0)', () => {
      const { all_cards, addCard, reorderCard } = makeController([makeCard({ id: 100 })])
      addCard()
      const temp_idx = all_cards.value.findIndex((c) => c.id < 0)
      reorderCard(temp_idx, 1)
      expect(reorderCardMock).not.toHaveBeenCalled()
    })

    // [obligation] reorder still mints a key even with a single persisted card
    // in the list — rankBetween(null, null) mints the first key of the deck,
    // it's not a no-op condition (only a temp/unranked drag is).
    test('still fires the mutation when dragging the only persisted card', () => {
      const { reorderCard } = makeController([makeCard({ id: 1 })])
      reorderCard(0, 0)
      expect(reorderCardMock).toHaveBeenCalledOnce()
    })

    test('calls the reorder mutation with card_id, deck_id, and a rank between the resolved neighbours', () => {
      const c1 = makeCard({ id: 1 })
      const c2 = makeCard({ id: 2 })
      const c3 = makeCard({ id: 3 })
      const ctrl = makeController([c1, c2, c3])
      ctrl.reorderCard(2, 0)
      // Without card at idx 2 (id=3): [id=1, id=2]. to=0 → drops before id=1.
      const [args] = reorderCardMock.mock.calls[0]
      expect(args.card_id).toBe(3)
      expect(args.deck_id).toBe(10)
      expect(args.rank < c1.rank).toBe(true)
    })

    test('does not throw when the mutation rejects (floating promise)', async () => {
      reorderCardMock.mockRejectedValueOnce(new Error('network'))
      const ctrl = makeController([makeCard({ id: 1 }), makeCard({ id: 2 })])
      // Should not throw
      expect(() => ctrl.reorderCard(1, 0)).not.toThrow()
    })

    test('fires notice.warn(toast.warn.reorder-failed) when the mutation rejects [obligation]', async () => {
      reorderCardMock.mockRejectedValueOnce(new Error('network'))
      const ctrl = makeController([makeCard({ id: 1 }), makeCard({ id: 2 })])

      ctrl.reorderCard(1, 0)
      await new Promise((r) => setTimeout(r, 0))

      expect(mockNotice.warn).toHaveBeenCalledWith('toast.warn.reorder-failed')
    })
  })

  // ── shell plumbing — mode and grid_size live on the shell, not the controller

  describe('shell plumbing', () => {
    test('controller passes shell.exitMode to card-actions (onCancel calls exitMode)', () => {
      const exitMode = vi.fn()
      const sh = makeShell({ exitMode })
      const ctrl = makeController([], [], undefined, sh)
      ctrl.onCancel()
      expect(exitMode).toHaveBeenCalledOnce()
    })
  })

  // ── can_reorder — backstop for a non-default sort, mobile page-settings gap
  describe('can_reorder [obligation]', () => {
    test('is true when the shell sort_by is default', () => {
      const sh = makeShell({ sort_by: ref('default') })
      const ctrl = makeController([], [], undefined, sh)
      expect(ctrl.can_reorder.value).toBe(true)
    })

    test('is false under a non-default sort — rendered neighbours are not rank neighbours', () => {
      const sh = makeShell({ sort_by: ref('difficulty') })
      const ctrl = makeController([], [], undefined, sh)
      expect(ctrl.can_reorder.value).toBe(false)
    })

    test('tracks the shell sort_by reactively', () => {
      const sort_by = ref('default')
      const sh = makeShell({ sort_by })
      const ctrl = makeController([], [], undefined, sh)
      expect(ctrl.can_reorder.value).toBe(true)
      sort_by.value = 'difficulty'
      expect(ctrl.can_reorder.value).toBe(false)
    })
  })

  // ── infinite scroll — observeSentinel wires the cards_query into an observer

  describe('observeSentinel', () => {
    test('exposes hasNextPage and isLoading refs sourced from cards_query', () => {
      const cards_query = makeCardsQuery([])
      cards_query.hasNextPage.value = true
      cards_query.isLoading.value = false
      cardsInfiniteQueryMock.mockReturnValueOnce(cards_query)
      deckQueryMock.mockReturnValue(makeDeckQuery())
      const ctrl = useCardListController({ deck_id: 10, shell: makeShell(), search_query: ref('') })
      expect(ctrl.hasNextPage.value).toBe(true)
      expect(ctrl.isLoading.value).toBe(false)
    })

    test('observeSentinel calls useInfiniteScroll with the sentinel and a delegating loader', () => {
      const cards_query = makeCardsQuery([])
      cardsInfiniteQueryMock.mockReturnValueOnce(cards_query)
      deckQueryMock.mockReturnValue(makeDeckQuery())
      const ctrl = useCardListController({ deck_id: 10, shell: makeShell(), search_query: ref('') })
      const sentinel = { value: null }
      ctrl.observeSentinel(sentinel)
      expect(useInfiniteScrollMock).toHaveBeenCalledOnce()
      const [observed_ref, on_intersect] = useInfiniteScrollMock.mock.calls[0]
      expect(observed_ref).toBe(sentinel)
      on_intersect()
      expect(cards_query.loadNextPage).toHaveBeenCalledOnce()
    })

    test('enabled getter combines hasNextPage AND !isLoading', () => {
      const cards_query = makeCardsQuery([])
      cards_query.hasNextPage.value = true
      cards_query.isLoading.value = false
      cardsInfiniteQueryMock.mockReturnValueOnce(cards_query)
      deckQueryMock.mockReturnValue(makeDeckQuery())
      const ctrl = useCardListController({ deck_id: 10, shell: makeShell(), search_query: ref('') })
      ctrl.observeSentinel({ value: null })
      const [, , options] = useInfiniteScrollMock.mock.calls[0]
      expect(options.enabled()).toBe(true)
      cards_query.isLoading.value = true
      expect(options.enabled()).toBe(false)
      cards_query.isLoading.value = false
      cards_query.hasNextPage.value = false
      expect(options.enabled()).toBe(false)
    })
  })

  // ── intent handlers — onCancel / onSelectCard / onDeleteCards / onMoveCards ─

  describe('intent handlers', () => {
    test('onCancel calls shell.exitMode, exits selection, and clears selection', async () => {
      const exitMode = vi.fn()
      const sh = makeShell({ exitMode })
      const deck_query = makeDeckQuery()
      const ctrl = makeController([makeCard({ id: 1 })], [1], deck_query, sh)
      ctrl.selectCard(1)
      ctrl.enterSelection()
      await ctrl.onCancel()
      expect(exitMode).toHaveBeenCalledOnce()
      expect(ctrl.is_selecting.value).toBe(false)
      expect(ctrl.selected_card_ids.value).toEqual([])
      expect(deck_query.refetch).not.toHaveBeenCalled()
    })

    test('onSelectCard toggles the id and enters selection mode', () => {
      const ctrl = makeController([makeCard({ id: 1 })], [1])
      ctrl.onSelectCard(1)
      expect(ctrl.isCardSelected(1)).toBe(true)
      expect(ctrl.is_selecting.value).toBe(true)
    })

    test('onSelectCard without id just enters selection mode without mutating selection', () => {
      const ctrl = makeController([makeCard({ id: 1 })], [1])
      ctrl.onSelectCard()
      expect(ctrl.selected_card_ids.value).toEqual([])
      expect(ctrl.is_selecting.value).toBe(true)
    })

    test('onDeleteCards skips deletion when the user cancels the confirm alert', async () => {
      alertWarnMock.mockReturnValueOnce({ response: Promise.resolve(false) })
      const ctrl = makeController([makeCard({ id: 1 })], [1])
      ctrl.selectCard(1)
      await ctrl.onDeleteCards()
      expect(deleteCardsMock).not.toHaveBeenCalled()
    })

    test('onDeleteCards deletes and clears selection, mode is unchanged [obligation]', async () => {
      alertWarnMock.mockReturnValueOnce({ response: Promise.resolve(true) })
      const exitMode = vi.fn()
      const sh = makeShell({ exitMode })
      const deck_query = makeDeckQuery()
      const ctrl = makeController([makeCard({ id: 1 })], [1], deck_query, sh)
      ctrl.selectCard(1)
      ctrl.enterSelection()
      await ctrl.onDeleteCards()
      expect(deleteCardsMock).toHaveBeenCalledOnce()
      expect(deck_query.refetch).toHaveBeenCalledOnce()
      expect(exitMode).not.toHaveBeenCalled()
      expect(ctrl.is_selecting.value).toBe(false)
    })

    test('onDeleteCards with an explicit id deletes just that card when nothing else selected', async () => {
      alertWarnMock.mockReturnValueOnce({ response: Promise.resolve(true) })
      const ctrl = makeController([makeCard({ id: 7 })], [7])
      await ctrl.onDeleteCards(7)
      const [cards] = deleteCardsMock.mock.calls[0]
      expect(cards.map((c) => c.id)).toEqual([7])
    })

    test('onDeleteCards strips review from the cards it hands to the mutation', async () => {
      alertWarnMock.mockReturnValueOnce({ response: Promise.resolve(true) })
      const ctrl = makeController([makeCard({ id: 7, review: { due: new Date() } })], [7])
      await ctrl.onDeleteCards(7)
      const [cards] = deleteCardsMock.mock.calls[0]
      expect('review' in cards[0]).toBe(false)
    })

    test('onDeleteCards does not mutate selection when called with an explicit id', async () => {
      alertWarnMock.mockReturnValueOnce({ response: Promise.resolve(false) })
      const ctrl = makeController([makeCard({ id: 7 })], [7])
      await ctrl.onDeleteCards(7)
      expect(ctrl.selected_card_ids.value).toEqual([])
    })

    test('onDeleteCards in select-all mode calls deleteCardsInDeck with except_ids', async () => {
      alertWarnMock.mockReturnValueOnce({ response: Promise.resolve(true) })
      const ctrl = makeController([makeCard({ id: 1 }), makeCard({ id: 2 })], [1, 2])
      ctrl.selectAllCards()
      ctrl.deselectCard(1)
      await ctrl.onDeleteCards()
      expect(deleteCardsInDeckMock).toHaveBeenCalledWith({ deck_id: 10, except_ids: [1] })
      expect(deleteCardsMock).not.toHaveBeenCalled()
      expect(ctrl.select_all_mode.value).toBe(false)
    })

    test('onDeleteCards is a no-op when nothing is selected and no id is provided', async () => {
      const ctrl = makeController([makeCard({ id: 1 })], [1])
      await ctrl.onDeleteCards()
      expect(alertWarnMock).not.toHaveBeenCalled()
      expect(deleteCardsMock).not.toHaveBeenCalled()
      expect(deleteCardsInDeckMock).not.toHaveBeenCalled()
    })

    test('onDeleteCards does not duplicate the card when its id is already in the selection', async () => {
      alertWarnMock.mockReturnValueOnce({ response: Promise.resolve(true) })
      const ctrl = makeController([makeCard({ id: 7 })], [7])
      ctrl.selectCard(7)
      await ctrl.onDeleteCards(7)
      const [cards] = deleteCardsMock.mock.calls[0]
      expect(cards.map((c) => c.id)).toEqual([7])
    })

    test('onMoveCards is a no-op when called without an id and nothing is selected', async () => {
      const ctrl = makeController([makeCard({ id: 1 })], [1])
      await ctrl.onMoveCards()
      expect(modalOpenMock).not.toHaveBeenCalled()
    })

    test('onMoveCards opens the move modal and fires the move mutation on confirmation', async () => {
      // The modal now owns invoking `move` itself (only resolving once it
      // succeeds), so the mock must call the `move` prop it was given rather
      // than resolving the response directly.
      modalOpenMock.mockImplementationOnce((_component, { props }) => ({
        response: props.move(42).then(() => ({ deck_id: 42 }))
      }))
      const ctrl = makeController([makeCard({ id: 7 })], [7])
      await ctrl.onMoveCards(7)
      expect(modalOpenMock).toHaveBeenCalledOnce()
      expect(moveCardsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          target_deck_id: 42,
          card_ids: expect.any(Array)
        })
      )
    })

    test('onMoveCards does not fire the move mutation when the modal is dismissed', async () => {
      modalOpenMock.mockReturnValueOnce({ response: Promise.resolve(undefined) })
      const ctrl = makeController([makeCard({ id: 7 })], [7])
      await ctrl.onMoveCards(7)
      expect(moveCardsMock).not.toHaveBeenCalled()
    })

    test('onMoveCards does not mutate selection state', async () => {
      modalOpenMock.mockReturnValueOnce({ response: Promise.resolve(undefined) })
      const ctrl = makeController([makeCard({ id: 7 })], [7])
      await ctrl.onMoveCards(7)
      expect(ctrl.isCardSelected(7)).toBe(false)
    })
  })
})
