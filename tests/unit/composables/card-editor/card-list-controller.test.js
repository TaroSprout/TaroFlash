import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { ref, nextTick } from 'vue'
import { card } from '@tests/fixtures/card'

const {
  cardsInfiniteQueryMock,
  deckQueryMock,
  insertCardAtMock,
  saveCardMock,
  deleteCardsMock,
  deleteCardsInDeckMock,
  moveCardsMock,
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
  deckQueryMock: vi.fn(),
  insertCardAtMock: vi.fn(),
  saveCardMock: vi.fn(),
  deleteCardsMock: vi.fn(),
  deleteCardsInDeckMock: vi.fn(),
  moveCardsMock: vi.fn(),
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
  useInsertCardAtMutation: () => ({ mutate: insertCardAtMock, mutateAsync: insertCardAtMock }),
  useSaveCardMutation: () => ({ mutate: saveCardMock, mutateAsync: saveCardMock }),
  useDeleteCardsMutation: () => ({ mutate: deleteCardsMock, mutateAsync: deleteCardsMock }),
  useDeleteCardsInDeckMutation: () => ({
    mutate: deleteCardsInDeckMock,
    mutateAsync: deleteCardsInDeckMock
  }),
  useMoveCardsToDeckMutation: () => ({ mutate: moveCardsMock, mutateAsync: moveCardsMock }),
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

vi.mock('@/composables/use-card-limit-gate', () => ({
  useCardLimitGate: () => ({
    guardAddCards: guardAddCardsMock,
    handleLimitError: handleLimitErrorMock
  })
}))

vi.mock('@/sfx/bus', () => ({ emitSfx: emitSfxMock }))

vi.mock('@/composables/use-infinite-scroll', () => ({
  useInfiniteScroll: useInfiniteScrollMock
}))

vi.mock('@/components/modals/move-cards.vue', () => ({ default: {} }))

import { useCardListController } from '@/composables/card-editor/card-list-controller'

function makeCard(overrides = {}) {
  return card.one({ overrides })
}

function makeCardsQuery(persisted = []) {
  return {
    data: { value: { pages: [persisted], pageParams: [0] } },
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

// Returns a minimal shell stub that satisfies the controller's `exitMode` requirement.
function makeShell(overrides = {}) {
  return { exitMode: overrides.exitMode ?? vi.fn() }
}

// Returns the controller with `deck_query` attached so refetch + reactive
// data assertions can target the same handle the controller uses internally.
// Mocks `useDeckQuery` for the lifetime of the call so both the controller
// and the inner card-selection composable resolve to this query — mirrors
// Pinia Colada's per-key dedupe in production.
// Returns the controller flattened — sub-namespaces (list/selection/carousel/
// actions) are spread onto the root for ergonomic test destructuring. Real
// consumers reach in via the grouped surface; the flatten happens here only.
function makeController(persisted = [], ids = persisted.map((c) => c.id), deck_query, shell) {
  const dq = deck_query ?? makeDeckQuery(ids.length)
  const sh = shell ?? makeShell()
  cardsInfiniteQueryMock.mockReturnValueOnce(makeCardsQuery(persisted))
  deckQueryMock.mockReturnValue(dq)
  const controller = useCardListController({ deck_id: 10, shell: sh })
  return {
    ...controller,
    ...controller.list,
    ...controller.selection,
    ...controller.carousel,
    ...controller.actions,
    // Re-expose gated wrappers after the list spread so tests can call the
    // gated versions (addCard/appendCard/prependCard with the limit gate) via
    // ctrl.gated_addCard etc. The list spread above overwrites the ungated
    // versions onto the same keys — these aliases preserve the gated surface.
    gated_addCard: controller.addCard,
    gated_appendCard: controller.appendCard,
    gated_prependCard: controller.prependCard,
    deck_query: dq,
    shell: sh
  }
}

describe('useCardListController', () => {
  beforeEach(() => {
    localStorage.clear()
    insertCardAtMock.mockReset()
    insertCardAtMock.mockResolvedValue({ id: 9999, rank: 1500 })
    saveCardMock.mockReset()
    saveCardMock.mockResolvedValue(undefined)
    deleteCardsMock.mockReset()
    deleteCardsMock.mockResolvedValue(undefined)
    deleteCardsInDeckMock.mockReset()
    deleteCardsInDeckMock.mockResolvedValue(0)
    moveCardsMock.mockReset()
    moveCardsMock.mockResolvedValue(undefined)
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

    test('uses the last persisted card as anchor (side=after) when no neighbors are passed', async () => {
      const { addCard, updateCard, all_cards } = makeController([
        makeCard({ id: 100 }),
        makeCard({ id: 200 })
      ])
      addCard()
      const temp_id = all_cards.value.at(-1).id
      await updateCard(temp_id, { front_text: 'X' })
      const [args] = insertCardAtMock.mock.calls[0]
      expect(args.anchor_id).toBe(200)
      expect(args.side).toBe('after')
    })

    test('uses the explicit left neighbor as anchor (side=after) when given', async () => {
      const { addCard, updateCard, all_cards } = makeController([
        makeCard({ id: 100 }),
        makeCard({ id: 200 })
      ])
      addCard(100)
      const temp_id = all_cards.value.find((c) => c.id < 0).id
      await updateCard(temp_id, { front_text: 'X' })
      const [args] = insertCardAtMock.mock.calls[0]
      expect(args.anchor_id).toBe(100)
      expect(args.side).toBe('after')
    })

    test('uses the right neighbor as anchor (side=before) when only right is given', async () => {
      const { addCard, updateCard, all_cards } = makeController([makeCard({ id: 200 })])
      addCard(undefined, 200)
      const temp_id = all_cards.value.find((c) => c.id < 0).id
      await updateCard(temp_id, { front_text: 'X' })
      const [args] = insertCardAtMock.mock.calls[0]
      expect(args.anchor_id).toBe(200)
      expect(args.side).toBe('before')
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

  // ── updateCard — routing between insertCardAt (temp) and saveCard (real) ───

  describe('updateCard', () => {
    test('routes to saveCard for an existing (real-id) card', async () => {
      const real = makeCard({ id: 42 })
      const { updateCard } = makeController([real])
      await updateCard(42, { front_text: 'Updated' })
      expect(saveCardMock).toHaveBeenCalledOnce()
      expect(insertCardAtMock).not.toHaveBeenCalled()
    })

    test('routes to insertCardAt on first save of a temp card', async () => {
      const { addCard, all_cards, updateCard } = makeController()
      addCard()
      const temp_id = all_cards.value[0].id
      await updateCard(temp_id, { front_text: 'Q', back_text: 'A' })
      expect(insertCardAtMock).toHaveBeenCalledOnce()
      expect(saveCardMock).not.toHaveBeenCalled()
    })

    test('removes the temp card after a successful insert (cache refetch supplies the real one)', async () => {
      const { addCard, all_cards, updateCard } = makeController()
      addCard()
      const temp_id = all_cards.value[0].id
      await updateCard(temp_id, { front_text: 'X' })
      expect(all_cards.value.find((c) => c.id === temp_id)).toBeUndefined()
    })

    test('passes front/back text to insertCardAt, preferring values over temp state', async () => {
      const { addCard, all_cards, updateCard } = makeController()
      addCard()
      await updateCard(all_cards.value[0].id, { front_text: 'from values' })
      const [args] = insertCardAtMock.mock.calls[0]
      expect(args.front_text).toBe('from values')
      expect(args.back_text).toBe('')
    })

    test('is a no-op when the id is not found', async () => {
      const { updateCard } = makeController()
      await updateCard(999, { front_text: 'X' })
      expect(insertCardAtMock).not.toHaveBeenCalled()
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
      insertCardAtMock.mockRejectedValueOnce(limit_error)
      handleLimitErrorMock.mockReturnValueOnce(true)
      const { addCard, all_cards, updateCard, saving } = makeController()
      addCard()
      const temp_id = all_cards.value[0].id
      await updateCard(temp_id, { front_text: 'X' })
      expect(handleLimitErrorMock).toHaveBeenCalledWith(limit_error)
      expect(saving.value).toBe(false)
    })

    test('leaves the temp card staged when the insert is rejected by the card limit', async () => {
      insertCardAtMock.mockRejectedValueOnce({ code: 'PT402' })
      handleLimitErrorMock.mockReturnValueOnce(true)
      const { addCard, all_cards, updateCard } = makeController()
      addCard()
      const temp_id = all_cards.value[0].id
      await updateCard(temp_id, { front_text: 'X' })
      // Still a temp (real_id null) so an upgrade-then-retry re-runs the INSERT.
      expect(all_cards.value.find((c) => c.id === temp_id)).toBeDefined()
    })

    test('rethrows a non-limit insert rejection so generic error handling still runs', async () => {
      insertCardAtMock.mockRejectedValueOnce(new Error('boom'))
      handleLimitErrorMock.mockReturnValueOnce(false)
      const { addCard, all_cards, updateCard, saving } = makeController()
      addCard()
      const temp_id = all_cards.value[0].id
      await expect(updateCard(temp_id, { front_text: 'X' })).rejects.toThrow('boom')
      expect(saving.value).toBe(false)
    })
  })

  // ── image writes — routed through the mutation layer, toggling saving ──────

  describe('setCardImage / deleteCardImage', () => {
    test('setCardImage forwards card_id, side, file and the deck_id', async () => {
      const { setCardImage } = makeController([makeCard({ id: 42 })])
      const file = new File(['x'], 'a.png', { type: 'image/png' })
      await setCardImage(42, 'front', file)
      expect(setCardImageMock).toHaveBeenCalledWith({
        card_id: 42,
        deck_id: 10,
        file,
        side: 'front'
      })
    })

    test('deleteCardImage forwards card_id, side and the deck_id', async () => {
      const { deleteCardImage } = makeController([makeCard({ id: 42 })])
      await deleteCardImage(42, 'back')
      expect(deleteCardImageMock).toHaveBeenCalledWith({ card_id: 42, deck_id: 10, side: 'back' })
    })

    test('toggles saving around the image upload', async () => {
      let resolveSet
      setCardImageMock.mockReturnValueOnce(new Promise((r) => (resolveSet = r)))
      const { setCardImage, saving } = makeController([makeCard({ id: 42 })])
      const promise = setCardImage(42, 'front', new File(['x'], 'a.png'))
      expect(saving.value).toBe(true)
      resolveSet()
      await promise
      expect(saving.value).toBe(false)
    })

    test('resets saving even if the image upload rejects', async () => {
      setCardImageMock.mockRejectedValueOnce(new Error('boom'))
      const { setCardImage, saving } = makeController([makeCard({ id: 42 })])
      await expect(setCardImage(42, 'front', new File(['x'], 'a.png'))).rejects.toThrow('boom')
      expect(saving.value).toBe(false)
    })
  })

  describe('setFaceImage', () => {
    test('routes a File to the set-image mutation', async () => {
      const { setFaceImage } = makeController([makeCard({ id: 42 })])
      const file = new File(['x'], 'a.png', { type: 'image/png' })
      await setFaceImage(42, 'front', file)
      expect(setCardImageMock).toHaveBeenCalledWith({
        card_id: 42,
        deck_id: 10,
        file,
        side: 'front'
      })
      expect(deleteCardImageMock).not.toHaveBeenCalled()
    })

    test('routes null to the delete-image mutation', async () => {
      const { setFaceImage } = makeController([makeCard({ id: 42 })])
      await setFaceImage(42, 'back', null)
      expect(deleteCardImageMock).toHaveBeenCalledWith({ card_id: 42, deck_id: 10, side: 'back' })
      expect(setCardImageMock).not.toHaveBeenCalled()
    })

    test('is a no-op for undefined (untouched face)', async () => {
      const { setFaceImage } = makeController([makeCard({ id: 42 })])
      await setFaceImage(42, 'front', undefined)
      expect(setCardImageMock).not.toHaveBeenCalled()
      expect(deleteCardImageMock).not.toHaveBeenCalled()
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

  // ── infinite scroll — observeSentinel wires the cards_query into an observer

  describe('observeSentinel', () => {
    test('exposes hasNextPage and isLoading refs sourced from cards_query', () => {
      const cards_query = makeCardsQuery([])
      cards_query.hasNextPage.value = true
      cards_query.isLoading.value = false
      cardsInfiniteQueryMock.mockReturnValueOnce(cards_query)
      deckQueryMock.mockReturnValue(makeDeckQuery())
      const ctrl = useCardListController({ deck_id: 10 })
      expect(ctrl.hasNextPage.value).toBe(true)
      expect(ctrl.isLoading.value).toBe(false)
    })

    test('observeSentinel calls useInfiniteScroll with the sentinel and a delegating loader', () => {
      const cards_query = makeCardsQuery([])
      cardsInfiniteQueryMock.mockReturnValueOnce(cards_query)
      deckQueryMock.mockReturnValue(makeDeckQuery())
      const ctrl = useCardListController({ deck_id: 10 })
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
      const ctrl = useCardListController({ deck_id: 10 })
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
      modalOpenMock.mockReturnValueOnce({ response: Promise.resolve({ deck_id: 42 }) })
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

  // ── pagination — page state, wrap, auto-load, and is_page_loading ──────────

  describe('pagination', () => {
    function makeReactiveCardsQuery({ persisted = [], hasNext = false, loading = false } = {}) {
      return {
        data: ref({ pages: [persisted], pageParams: [0] }),
        hasNextPage: ref(hasNext),
        isLoading: ref(loading),
        loadNextPage: vi.fn()
      }
    }

    function makePagingController({
      persisted = [],
      hasNext = false,
      loading = false,
      card_count
    } = {}) {
      const ids = persisted.map((c) => c.id)
      const cards_query = makeReactiveCardsQuery({ persisted, hasNext, loading })
      cardsInfiniteQueryMock.mockReturnValueOnce(cards_query)
      const dq = makeDeckQuery(card_count ?? ids.length)
      deckQueryMock.mockReturnValue(dq)
      const root = useCardListController({ deck_id: 10, shell: makeShell() })
      const controller = { ...root, ...root.list, ...root.selection, ...root.carousel }
      return { controller, cards_query, deck_query: dq }
    }

    test('initial page state is page=0 with default forward direction', () => {
      const { controller } = makePagingController()
      expect(controller.page.value).toBe(0)
      expect(controller.page_direction.value).toBe('forward')
    })

    test('page_size floors at 1 when no capacity has been reported', () => {
      const { controller } = makePagingController()
      expect(controller.page_size.value).toBe(1)
    })

    test('setVisibleCapacity drives page_size and total_pages', () => {
      const { controller } = makePagingController({ card_count: 50 })
      controller.setVisibleCapacity(8)
      expect(controller.page_size.value).toBe(8)
      // ceil(50 / 8) = 7
      expect(controller.total_pages.value).toBe(7)
    })

    test('total_pages floors at 1 when card_count is zero', () => {
      const { controller } = makePagingController({ card_count: 0 })
      controller.setVisibleCapacity(8)
      expect(controller.total_pages.value).toBe(1)
    })

    test('total_pages reflects the deck query card_count, not the loaded card length', () => {
      const persisted = [makeCard({ id: 1 }), makeCard({ id: 2 })]
      const { controller } = makePagingController({ persisted, card_count: 80 })
      controller.setVisibleCapacity(10)
      // ceil(80 / 10) === 8, even though only 2 cards are loaded
      expect(controller.total_pages.value).toBe(8)
    })

    test('visible_cards returns all_cards.slice(0, 1) before capacity is reported (bootstrap)', () => {
      const persisted = [makeCard({ id: 1 }), makeCard({ id: 2 }), makeCard({ id: 3 })]
      const { controller } = makePagingController({ persisted, card_count: 3 })
      expect(controller.visible_cards.value.map((c) => c.id)).toEqual([1])
    })

    test('visible_cards windows by page once capacity is set', () => {
      const persisted = Array.from({ length: 10 }, (_, i) => makeCard({ id: i + 1 }))
      const { controller } = makePagingController({ persisted, card_count: 10 })
      controller.setVisibleCapacity(4)
      expect(controller.visible_cards.value.map((c) => c.id)).toEqual([1, 2, 3, 4])
      controller.nextPage()
      expect(controller.visible_cards.value.map((c) => c.id)).toEqual([5, 6, 7, 8])
    })

    test('nextPage wraps from the last page back to 0 and sets direction=forward', () => {
      const persisted = Array.from({ length: 10 }, (_, i) => makeCard({ id: i + 1 }))
      const { controller } = makePagingController({ persisted, card_count: 10 })
      controller.setVisibleCapacity(4)
      controller.nextPage() // page 1
      controller.nextPage() // page 2 (last, ceil(10/4)=3)
      controller.nextPage() // wraps to 0
      expect(controller.page.value).toBe(0)
      expect(controller.page_direction.value).toBe('forward')
    })

    test('prevPage wraps from page 0 to the last page and sets direction=backward', () => {
      const persisted = Array.from({ length: 10 }, (_, i) => makeCard({ id: i + 1 }))
      const { controller } = makePagingController({ persisted, card_count: 10 })
      controller.setVisibleCapacity(4)
      controller.prevPage()
      // total_pages=3, last index=2
      expect(controller.page.value).toBe(2)
      expect(controller.page_direction.value).toBe('backward')
    })

    test('prevPage and nextPage are no-ops when total_pages <= 1', () => {
      const { controller } = makePagingController({ card_count: 4 })
      controller.setVisibleCapacity(8)
      expect(controller.total_pages.value).toBe(1)
      controller.prevPage()
      controller.nextPage()
      expect(controller.page.value).toBe(0)
    })

    test('can_paginate is true only when total_pages > 1', () => {
      const { controller } = makePagingController({ card_count: 5 })
      controller.setVisibleCapacity(10)
      expect(controller.can_paginate.value).toBe(false)
      controller.setVisibleCapacity(2)
      expect(controller.can_paginate.value).toBe(true)
    })

    test('page is clamped when total_pages shrinks below the current page', async () => {
      const { controller } = makePagingController({ card_count: 100 })
      controller.setVisibleCapacity(10) // total_pages = 10
      controller.nextPage()
      controller.nextPage()
      controller.nextPage() // page = 3
      controller.setVisibleCapacity(50) // total_pages = 2 → clamp page to 1
      await flushMicrotasks()
      expect(controller.page.value).toBeLessThanOrEqual(1)
    })

    test('is_page_loading is true when the target page lies beyond loaded cards and more remain', () => {
      const persisted = Array.from({ length: 5 }, (_, i) => makeCard({ id: i + 1 }))
      const { controller } = makePagingController({
        persisted,
        hasNext: true,
        card_count: 100
      })
      controller.setVisibleCapacity(10)
      controller.nextPage() // page 1, start=10, length=5 → start >= length
      expect(controller.is_page_loading.value).toBe(true)
    })

    test('is_page_loading is false when there are no more pages, even if loaded < target', () => {
      const persisted = Array.from({ length: 5 }, (_, i) => makeCard({ id: i + 1 }))
      const { controller } = makePagingController({
        persisted,
        hasNext: false,
        card_count: 5
      })
      controller.setVisibleCapacity(10)
      expect(controller.is_page_loading.value).toBe(false)
    })

    test('auto-loader calls loadNextPage when target > loaded and the query can fetch', async () => {
      const persisted = Array.from({ length: 5 }, (_, i) => makeCard({ id: i + 1 }))
      const { controller, cards_query } = makePagingController({
        persisted,
        hasNext: true,
        card_count: 100
      })
      controller.setVisibleCapacity(10)
      controller.nextPage()
      await flushMicrotasks()
      expect(cards_query.loadNextPage).toHaveBeenCalled()
    })

    test('auto-loader does not call loadNextPage while isLoading is true', async () => {
      const persisted = Array.from({ length: 5 }, (_, i) => makeCard({ id: i + 1 }))
      const { controller, cards_query } = makePagingController({
        persisted,
        hasNext: true,
        loading: true,
        card_count: 100
      })
      controller.setVisibleCapacity(10)
      controller.nextPage()
      await flushMicrotasks()
      expect(cards_query.loadNextPage).not.toHaveBeenCalled()
    })

    test('auto-loader does not call loadNextPage when hasNextPage is false', async () => {
      const persisted = Array.from({ length: 5 }, (_, i) => makeCard({ id: i + 1 }))
      const { controller, cards_query } = makePagingController({
        persisted,
        hasNext: false,
        card_count: 100
      })
      controller.setVisibleCapacity(10)
      controller.nextPage()
      await flushMicrotasks()
      expect(cards_query.loadNextPage).not.toHaveBeenCalled()
    })
  })
})

async function flushMicrotasks() {
  await Promise.resolve()
  await Promise.resolve()
}
