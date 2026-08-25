import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { ref } from 'vue'
import { card } from '@tests/fixtures/card'

const { modalOpenMock, alertWarnMock, emitSfxMock, mockT } = vi.hoisted(() => ({
  modalOpenMock: vi.fn(),
  alertWarnMock: vi.fn(),
  emitSfxMock: vi.fn(),
  mockT: vi.fn((key) => key)
}))

const { mockNotice } = vi.hoisted(() => ({
  mockNotice: { error: vi.fn(), success: vi.fn(), warn: vi.fn() }
}))

const { mockUseAllCardsInDeckQuery, mockDownloadTextFile, mockCardsToCsv } = vi.hoisted(() => ({
  mockUseAllCardsInDeckQuery: vi.fn(),
  mockDownloadTextFile: vi.fn(),
  mockCardsToCsv: vi.fn(() => 'csv-body')
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: mockT })
}))
vi.mock('@/composables/alert', () => ({ useAlert: () => ({ warn: alertWarnMock }) }))
vi.mock('@/composables/modal', () => ({ useModal: () => ({ open: modalOpenMock }) }))
vi.mock('@/sfx/bus', () => ({ emitSfx: emitSfxMock }))
vi.mock('@/components/card-actions/move-cards-modal.vue', () => ({ default: {} }))
vi.mock('@/stores/notice-store', () => ({ useNoticeStore: () => mockNotice }))
vi.mock('@/api/cards', () => ({ useAllCardsInDeckQuery: mockUseAllCardsInDeckQuery }))
vi.mock('@/utils/download', () => ({ downloadTextFile: mockDownloadTextFile }))
vi.mock('@/utils/card/csv', () => ({
  cardsToCsv: mockCardsToCsv,
  deckExportFilename: (title) => `${title ?? 'deck'}.csv`
}))

import { useCardActions } from '@/views/deck/composables/actions'

function makeCard(overrides = {}) {
  return card.one({ overrides })
}

function makeSelection({ selected_ids = [], select_all = false, deselected = [] } = {}) {
  return {
    select_all_mode: ref(select_all),
    selected_count: ref(select_all ? 9999 : selected_ids.length),
    deselected_ids: ref(deselected),
    is_selecting: ref(false),
    isCardSelected: vi.fn((id) =>
      select_all ? !deselected.includes(id) : selected_ids.includes(id)
    ),
    filterSelected: (cards) =>
      cards.filter((c) => {
        if (c.id === undefined) return false
        return select_all ? !deselected.includes(c.id) : selected_ids.includes(c.id)
      }),
    enterSelection: vi.fn(),
    exitSelection: vi.fn(),
    toggleSelectCard: vi.fn()
  }
}

function makeList({ persisted = [], temp_entries = [] } = {}) {
  return {
    persisted_cards: ref(persisted),
    findCard: (id) => persisted.find((c) => c.id === id),
    temp_entries: ref(temp_entries),
    // Mirrors src/views/deck/composables/virtual-list.ts: drop the placeholders
    // standing in for `real_ids`, returning each with the slot it held.
    retireTemps(real_ids) {
      const ids = new Set(real_ids)
      const retired = []

      this.temp_entries.value = this.temp_entries.value.filter((entry, index) => {
        const leaving = entry.real_id !== null && ids.has(entry.real_id)
        if (leaving) retired.push({ index, entry })
        return !leaving
      })

      return retired
    },
    // Mirrors virtual-list.ts: put retired placeholders back in the slots they held.
    restoreTemps(retired) {
      if (retired.length === 0) return

      const entries = this.temp_entries.value.slice()
      for (const { index, entry } of retired) entries.splice(index, 0, entry)

      this.temp_entries.value = entries
    }
  }
}

function makeMutations() {
  return {
    deleteCards: vi.fn().mockResolvedValue(undefined),
    moveCards: vi.fn().mockResolvedValue(undefined),
    insertCard: vi.fn(),
    saveCard: vi.fn()
  }
}

function makeDeckQuery({ title } = {}) {
  return { refetch: vi.fn().mockResolvedValue(undefined), data: ref(title ? { title } : null) }
}

function makeAllCardsQuery(cards = []) {
  return { refetch: vi.fn().mockResolvedValue({ status: 'success', data: cards }) }
}

function makeShell(opts = {}) {
  return { exitMode: opts.exitMode ?? vi.fn() }
}

function makeActions(opts = {}) {
  const list = opts.list ?? makeList()
  const selection = opts.selection ?? makeSelection()
  const mutations = opts.mutations ?? makeMutations()
  const deck_query = opts.deck_query ?? makeDeckQuery()
  const shell = opts.shell ?? makeShell()
  const all_cards_query = opts.all_cards_query ?? makeAllCardsQuery()
  mockUseAllCardsInDeckQuery.mockReturnValue(all_cards_query)
  const actions = useCardActions({
    list,
    selection,
    mutations,
    deck_query,
    deck_id: opts.deck_id ?? 10,
    shell
  })
  return { actions, list, selection, mutations, deck_query, shell, all_cards_query }
}

describe('useCardActions', () => {
  beforeEach(() => {
    modalOpenMock.mockReset()
    alertWarnMock.mockReset()
    emitSfxMock.mockReset()
    mockNotice.error.mockReset()
    mockNotice.success.mockReset()
    mockT.mockClear()
    mockDownloadTextFile.mockReset()
    mockCardsToCsv.mockReset().mockReturnValue('csv-body')
    mockUseAllCardsInDeckQuery.mockReset()
  })

  // ── onSelectCard ──────────────────────────────────────────────────────────

  describe('onSelectCard', () => {
    test('toggles selection for the given id and enters selection mode', () => {
      const { actions, selection } = makeActions()
      actions.onSelectCard(7)
      expect(selection.toggleSelectCard).toHaveBeenCalledWith(7)
      expect(selection.enterSelection).toHaveBeenCalledOnce()
      expect(emitSfxMock).toHaveBeenCalledWith('ui.select')
    })

    test('without id, just enters selection mode', () => {
      const { actions, selection } = makeActions()
      actions.onSelectCard()
      expect(selection.toggleSelectCard).not.toHaveBeenCalled()
      expect(selection.enterSelection).toHaveBeenCalledOnce()
    })
  })

  // ── onCancel ──────────────────────────────────────────────────────────────

  describe('onCancel', () => {
    test('calls shell.exitMode, exits selection, and emits the cancel sfx', () => {
      const exitMode = vi.fn()
      const { actions, selection } = makeActions({ shell: makeShell({ exitMode }) })
      actions.onCancel()
      expect(exitMode).toHaveBeenCalledOnce()
      expect(selection.exitSelection).toHaveBeenCalledOnce()
      expect(emitSfxMock).toHaveBeenCalledWith('dialog.close')
    })

    test('does not refetch the deck', () => {
      const { actions, deck_query } = makeActions()
      actions.onCancel()
      expect(deck_query.refetch).not.toHaveBeenCalled()
    })
  })

  // ── onDeleteCards ─────────────────────────────────────────────────────────

  describe('onDeleteCards', () => {
    test('is a no-op when nothing is selected and no id is passed', async () => {
      const { actions, mutations } = makeActions()
      await actions.onDeleteCards()
      expect(alertWarnMock).not.toHaveBeenCalled()
      expect(mutations.deleteCards).not.toHaveBeenCalled()
    })

    test('skips deletion when the user dismisses the confirm alert', async () => {
      alertWarnMock.mockReturnValueOnce({ response: Promise.resolve(false) })
      const persisted = [makeCard({ id: 1 })]
      const { actions, mutations } = makeActions({
        list: makeList({ persisted }),
        selection: makeSelection({ selected_ids: [1] })
      })
      await actions.onDeleteCards()
      expect(mutations.deleteCards).not.toHaveBeenCalled()
    })

    test('deletes the explicit id when nothing else is selected', async () => {
      alertWarnMock.mockReturnValueOnce({ response: Promise.resolve(true) })
      const persisted = [makeCard({ id: 7 })]
      const { actions, mutations } = makeActions({
        list: makeList({ persisted }),
        selection: makeSelection()
      })
      await actions.onDeleteCards(7)
      const [args] = mutations.deleteCards.mock.calls[0]
      expect(args.cards.map((c) => c.id)).toEqual([7])
    })

    test('runs cleanup on confirm: refetch + exitSelection (mode is NOT reset) [obligation]', async () => {
      alertWarnMock.mockReturnValueOnce({ response: Promise.resolve(true) })
      const persisted = [makeCard({ id: 1 })]
      const exitMode = vi.fn()
      const { actions, mutations, selection, deck_query } = makeActions({
        list: makeList({ persisted }),
        selection: makeSelection({ selected_ids: [1] }),
        shell: makeShell({ exitMode })
      })
      await actions.onDeleteCards()
      expect(mutations.deleteCards).toHaveBeenCalledOnce()
      expect(deck_query.refetch).toHaveBeenCalledOnce()
      expect(exitMode).not.toHaveBeenCalled()
      expect(selection.exitSelection).toHaveBeenCalledOnce()
    })

    test('select-all mode hands { except_ids } to the mutation', async () => {
      alertWarnMock.mockReturnValueOnce({ response: Promise.resolve(true) })
      const { actions, mutations } = makeActions({
        list: makeList(),
        selection: makeSelection({ select_all: true, deselected: [3, 4] })
      })
      await actions.onDeleteCards()
      const [args] = mutations.deleteCards.mock.calls[0]
      expect(args.except_ids).toEqual([3, 4])
    })

    test('shows an error notice and skips cleanup when deleteCards rejects [obligation]', async () => {
      alertWarnMock.mockReturnValueOnce({ response: Promise.resolve(true) })
      const persisted = [makeCard({ id: 1 })]
      const mutations = makeMutations()
      mutations.deleteCards.mockRejectedValueOnce(new Error('boom'))
      const { actions, selection, deck_query } = makeActions({
        list: makeList({ persisted }),
        selection: makeSelection({ selected_ids: [1] }),
        mutations
      })

      await actions.onDeleteCards()

      expect(mockNotice.error).toHaveBeenCalledWith('toast.error.delete-cards-failed')
      expect(selection.exitSelection).not.toHaveBeenCalled()
      expect(deck_query.refetch).not.toHaveBeenCalled()
    })
  })

  // ── onDeleteCardImmediate ─────────────────────────────────────────────────
  // The grid's reorder-mode corner button: no confirm alert, fires the delete
  // cue directly. [obligation]

  describe('onDeleteCardImmediate [obligation]', () => {
    test('fires the card.delete sfx directly, without going through confirmDelete', async () => {
      const persisted = [makeCard({ id: 1 })]
      const { actions, mutations } = makeActions({ list: makeList({ persisted }) })

      await actions.onDeleteCardImmediate(1)

      expect(emitSfxMock).toHaveBeenCalledWith('card.delete')
      expect(alertWarnMock).not.toHaveBeenCalled()
      expect(mutations.deleteCards).toHaveBeenCalledOnce()
    })

    test('calls mutations.deleteCards with the card in the cards array', async () => {
      const persisted = [makeCard({ id: 5 })]
      const { actions, mutations } = makeActions({ list: makeList({ persisted }) })

      await actions.onDeleteCardImmediate(5)

      const [args] = mutations.deleteCards.mock.calls[0]
      expect(args.cards.map((c) => c.id)).toEqual([5])
    })

    test('retires the card temp entry before the mutation and runs afterDelete on success', async () => {
      const persisted = [makeCard({ id: 1 })]
      const list = makeList({ persisted })
      const retireTempsSpy = vi.spyOn(list, 'retireTemps')
      const { actions, mutations, selection, deck_query } = makeActions({ list })

      await actions.onDeleteCardImmediate(1)

      expect(retireTempsSpy).toHaveBeenCalledWith([1])
      expect(mutations.deleteCards).toHaveBeenCalledOnce()
      expect(selection.exitSelection).toHaveBeenCalledOnce()
      expect(deck_query.refetch).toHaveBeenCalledOnce()
    })

    test('restores the retired temp entry and shows an error notice when the mutation rejects', async () => {
      const persisted = [makeCard({ id: 1 })]
      const temp_entries = [{ index: 0, real_id: 1, card: { id: 1 } }]
      const mutations = makeMutations()
      mutations.deleteCards.mockRejectedValueOnce(new Error('boom'))
      const list = makeList({ persisted, temp_entries })
      const restoreTempsSpy = vi.spyOn(list, 'restoreTemps')
      const { actions, selection, deck_query } = makeActions({ list, mutations })

      await actions.onDeleteCardImmediate(1)

      expect(mockNotice.error).toHaveBeenCalledWith('toast.error.delete-cards-failed')
      expect(restoreTempsSpy).toHaveBeenCalledOnce()
      expect(list.temp_entries.value).toEqual(temp_entries)
      expect(selection.exitSelection).not.toHaveBeenCalled()
      expect(deck_query.refetch).not.toHaveBeenCalled()
    })

    test('is a no-op when the card is not found', async () => {
      const { actions, mutations } = makeActions({ list: makeList({ persisted: [] }) })

      await actions.onDeleteCardImmediate(999)

      expect(mutations.deleteCards).not.toHaveBeenCalled()
      expect(emitSfxMock).not.toHaveBeenCalledWith('card.delete')
    })
  })

  // ── onMoveCards ───────────────────────────────────────────────────────────

  describe('onMoveCards', () => {
    test('is a no-op when nothing is selected and no id is passed', async () => {
      const { actions } = makeActions()
      await actions.onMoveCards()
      expect(modalOpenMock).not.toHaveBeenCalled()
    })

    test('opens the move modal with the resolved cards and the current deck id', async () => {
      modalOpenMock.mockReturnValueOnce({ response: Promise.resolve(undefined) })
      const persisted = [makeCard({ id: 7 })]
      const { actions } = makeActions({
        list: makeList({ persisted }),
        selection: makeSelection(),
        deck_id: 99
      })
      await actions.onMoveCards(7)
      expect(modalOpenMock).toHaveBeenCalledOnce()
      const [, options] = modalOpenMock.mock.calls[0]
      expect(options.props.current_deck_id).toBe(99)
      expect(options.props.cards.map((c) => c.id)).toEqual([7])
    })

    test('does not fire the move mutation when the modal is dismissed', async () => {
      modalOpenMock.mockReturnValueOnce({ response: Promise.resolve(undefined) })
      const persisted = [makeCard({ id: 7 })]
      const { actions, mutations } = makeActions({
        list: makeList({ persisted }),
        selection: makeSelection()
      })
      await actions.onMoveCards(7)
      expect(mutations.moveCards).not.toHaveBeenCalled()
    })

    test('the move closure passed to the modal fires the mutation with the chosen destination [obligation]', async () => {
      // Mirrors what move-cards.vue does: invoke the passed `move` closure with
      // the chosen deck before resolving with the modal response.
      modalOpenMock.mockImplementationOnce((_component, options) => ({
        response: options.props.move(42).then(() => ({ deck_id: 42 }))
      }))
      const persisted = [makeCard({ id: 7 })]
      const { actions, mutations } = makeActions({
        list: makeList({ persisted }),
        selection: makeSelection()
      })
      await actions.onMoveCards(7)
      const [args] = mutations.moveCards.mock.calls[0]
      expect(args.target_deck_id).toBe(42)
      expect(args.card_ids).toEqual([7])
    })

    test('emits the open move-modal sfx', async () => {
      modalOpenMock.mockReturnValueOnce({ response: Promise.resolve(undefined) })
      const persisted = [makeCard({ id: 7 })]
      const { actions } = makeActions({
        list: makeList({ persisted }),
        selection: makeSelection()
      })
      await actions.onMoveCards(7)
      expect(emitSfxMock).toHaveBeenCalledWith('dialog.open')
    })

    test('runs cleanup after a successful move: exitSelection + refetch (mode unchanged)', async () => {
      modalOpenMock.mockReturnValueOnce({ response: Promise.resolve({ deck_id: 42 }) })
      const persisted = [makeCard({ id: 7 })]
      const exitMode = vi.fn()
      const { actions, selection, deck_query } = makeActions({
        list: makeList({ persisted }),
        selection: makeSelection({ selected_ids: [7] }),
        shell: makeShell({ exitMode })
      })
      await actions.onMoveCards()
      expect(selection.exitSelection).toHaveBeenCalledOnce()
      expect(deck_query.refetch).toHaveBeenCalledOnce()
      expect(exitMode).not.toHaveBeenCalled()
    })

    test('select-all mode: the move closure passes { source_deck_id, except_ids } to mutation', async () => {
      modalOpenMock.mockImplementationOnce((_component, options) => ({
        response: options.props.move(55).then(() => ({ deck_id: 55 }))
      }))
      const { actions, mutations } = makeActions({
        list: makeList(),
        selection: makeSelection({ select_all: true, deselected: [3, 4] }),
        deck_id: 10
      })
      await actions.onMoveCards()
      const [vars] = mutations.moveCards.mock.calls[0]
      expect(vars.target_deck_id).toBe(55)
      expect(vars.source_deck_id).toBe(10)
      expect(vars.except_ids).toEqual([3, 4])
    })

    // [obligation] whole-deck move sizes its rank mint from the caller's own
    // count rather than a server round-trip — the move closure must forward it.
    test('select-all mode: the move closure passes the resolved count to the mutation [obligation]', async () => {
      modalOpenMock.mockImplementationOnce((_component, options) => ({
        response: options.props.move(55).then(() => ({ deck_id: 55 }))
      }))
      const { actions, mutations } = makeActions({
        list: makeList(),
        selection: makeSelection({ select_all: true, deselected: [3, 4] }),
        deck_id: 10
      })
      await actions.onMoveCards()
      const [vars] = mutations.moveCards.mock.calls[0]
      expect(vars.count).toBe(9999)
    })

    test('select-all mode passes count to openMoveModal so the title shows total not preview length', async () => {
      modalOpenMock.mockReturnValueOnce({ response: Promise.resolve(undefined) })
      const persisted = [makeCard({ id: 1 }), makeCard({ id: 2 })]
      const selection = makeSelection({ select_all: true })
      selection.selected_count = { value: 200 }
      const { actions } = makeActions({
        list: makeList({ persisted }),
        selection,
        deck_id: 10
      })
      await actions.onMoveCards()
      const [, options] = modalOpenMock.mock.calls[0]
      // count=200 is the full selection; only 2 preview_cards loaded
      expect(options.props.count).toBe(200)
      expect(options.props.cards).toHaveLength(2)
    })

    test('the move closure passed to the modal lets a rejected mutation propagate [obligation]', async () => {
      // Error handling now lives entirely inside move-cards.vue — this composable's
      // `move` closure must not swallow a rejection with a local try/catch.
      modalOpenMock.mockReturnValueOnce({ response: Promise.resolve(undefined) })
      const persisted = [makeCard({ id: 7 })]
      const mutations = makeMutations()
      mutations.moveCards.mockRejectedValueOnce(new Error('boom'))
      const { actions } = makeActions({
        list: makeList({ persisted }),
        selection: makeSelection(),
        mutations
      })
      await actions.onMoveCards(7)

      const [, options] = modalOpenMock.mock.calls[0]
      await expect(options.props.move(42)).rejects.toThrow('boom')
    })

    test('does not run cleanup (exitSelection/refetch) when the modal is dismissed [obligation]', async () => {
      modalOpenMock.mockReturnValueOnce({ response: Promise.resolve(undefined) })
      const persisted = [makeCard({ id: 7 })]
      const { actions, selection, deck_query } = makeActions({
        list: makeList({ persisted }),
        selection: makeSelection()
      })
      await actions.onMoveCards(7)
      expect(selection.exitSelection).not.toHaveBeenCalled()
      expect(deck_query.refetch).not.toHaveBeenCalled()
    })
  })

  // ── onCancelSelection ────────────────────────────────────────────────────

  describe('onCancelSelection', () => {
    test('exits selection mode and emits the digi-powerdown sfx', () => {
      const { actions, selection } = makeActions()
      actions.onCancelSelection()
      expect(selection.exitSelection).toHaveBeenCalledOnce()
      expect(emitSfxMock).toHaveBeenCalledWith('ui.deselect')
    })
  })

  // ── onExportCards / onExportSelection ────────────────────────────────────

  describe('onExportCards', () => {
    test('fetches the whole deck via the all-cards query, ignoring the current selection [obligation]', async () => {
      const cards = [makeCard({ id: 1 }), makeCard({ id: 2 })]
      const all_cards_query = makeAllCardsQuery(cards)
      const selection = makeSelection({ selected_ids: [1] })
      const { actions } = makeActions({ all_cards_query, selection })

      await actions.onExportCards()

      expect(all_cards_query.refetch).toHaveBeenCalledOnce()
      expect(mockCardsToCsv).toHaveBeenCalledWith(cards)
    })

    test('downloads with the deck-title filename and toasts the real exported count [obligation]', async () => {
      const cards = [makeCard({ id: 1 }), makeCard({ id: 2 }), makeCard({ id: 3 })]
      const deck_query = makeDeckQuery({ title: 'My Deck' })
      const { actions } = makeActions({ all_cards_query: makeAllCardsQuery(cards), deck_query })

      await actions.onExportCards()

      expect(mockDownloadTextFile).toHaveBeenCalledWith('My Deck.csv', 'csv-body')
      expect(mockT).toHaveBeenCalledWith('toast.success.cards-exported', { count: 3 })
      expect(mockNotice.success).toHaveBeenCalledWith('toast.success.cards-exported')
    })

    test('is a no-op on an empty deck: no download, no toast [obligation]', async () => {
      const { actions } = makeActions({ all_cards_query: makeAllCardsQuery([]) })

      await actions.onExportCards()

      expect(mockDownloadTextFile).not.toHaveBeenCalled()
      expect(mockNotice.success).not.toHaveBeenCalled()
    })
  })

  describe('onExportSelection', () => {
    test('normal mode exports exactly filterSelected(persisted_cards), without hitting the all-cards fetch [obligation]', async () => {
      const persisted = [makeCard({ id: 1 }), makeCard({ id: 2 }), makeCard({ id: 3 })]
      const selection = makeSelection({ selected_ids: [1, 3] })
      const all_cards_query = makeAllCardsQuery(persisted)
      const { actions } = makeActions({ list: makeList({ persisted }), selection, all_cards_query })

      await actions.onExportSelection()

      expect(all_cards_query.refetch).not.toHaveBeenCalled()
      expect(mockCardsToCsv).toHaveBeenCalledWith([persisted[0], persisted[2]])
    })

    test('select-all mode fetches the whole deck and filters out only the deselected ids [obligation]', async () => {
      const all_cards = [makeCard({ id: 1 }), makeCard({ id: 2 }), makeCard({ id: 3 })]
      const selection = makeSelection({ select_all: true, deselected: [2] })
      const all_cards_query = makeAllCardsQuery(all_cards)
      const { actions } = makeActions({ selection, all_cards_query })

      await actions.onExportSelection()

      expect(all_cards_query.refetch).toHaveBeenCalledOnce()
      expect(mockCardsToCsv).toHaveBeenCalledWith([all_cards[0], all_cards[2]])
    })

    test('select-all mode with everything deselected is a no-op: no download, no toast [obligation]', async () => {
      const all_cards = [makeCard({ id: 1 }), makeCard({ id: 2 })]
      const selection = makeSelection({ select_all: true, deselected: [1, 2] })
      const { actions } = makeActions({ selection, all_cards_query: makeAllCardsQuery(all_cards) })

      await actions.onExportSelection()

      expect(mockDownloadTextFile).not.toHaveBeenCalled()
      expect(mockNotice.success).not.toHaveBeenCalled()
    })

    test('toasts the real exported count, not the nominal selected_count, when they diverge [obligation]', async () => {
      // makeSelection's selected_count sentinel for select-all is 9999 — the real
      // resolved list after filtering deselected ids is only 2 cards.
      const all_cards = [makeCard({ id: 1 }), makeCard({ id: 2 }), makeCard({ id: 3 })]
      const selection = makeSelection({ select_all: true, deselected: [3] })
      const { actions } = makeActions({ selection, all_cards_query: makeAllCardsQuery(all_cards) })

      await actions.onExportSelection()

      expect(mockT).toHaveBeenCalledWith('toast.success.cards-exported', { count: 2 })
    })
  })
})
