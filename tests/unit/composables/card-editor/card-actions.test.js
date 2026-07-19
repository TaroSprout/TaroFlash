import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { ref } from 'vue'
import { card } from '@tests/fixtures/card'

const { modalOpenMock, alertWarnMock, emitSfxMock } = vi.hoisted(() => ({
  modalOpenMock: vi.fn(),
  alertWarnMock: vi.fn(),
  emitSfxMock: vi.fn()
}))

const { mockNotice } = vi.hoisted(() => ({
  mockNotice: { error: vi.fn(), success: vi.fn(), warn: vi.fn() }
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key) => key })
}))
vi.mock('@/composables/alert', () => ({ useAlert: () => ({ warn: alertWarnMock }) }))
vi.mock('@/composables/modal', () => ({ useModal: () => ({ open: modalOpenMock }) }))
vi.mock('@/sfx/bus', () => ({ emitSfx: emitSfxMock }))
vi.mock('@/components/card-actions/move-cards-modal.vue', () => ({ default: {} }))
vi.mock('@/stores/notice-store', () => ({ useNoticeStore: () => mockNotice }))

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

function makeList({ persisted = [] } = {}) {
  return {
    persisted_cards: ref(persisted),
    findCard: (id) => persisted.find((c) => c.id === id)
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

function makeDeckQuery() {
  return { refetch: vi.fn().mockResolvedValue(undefined) }
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
  const actions = useCardActions({
    list,
    selection,
    mutations,
    deck_query,
    deck_id: opts.deck_id ?? 10,
    shell
  })
  return { actions, list, selection, mutations, deck_query, shell }
}

describe('useCardActions', () => {
  beforeEach(() => {
    modalOpenMock.mockReset()
    alertWarnMock.mockReset()
    emitSfxMock.mockReset()
    mockNotice.error.mockReset()
  })

  // ── onSelectCard ──────────────────────────────────────────────────────────

  describe('onSelectCard', () => {
    test('toggles selection for the given id and enters selection mode', () => {
      const { actions, selection } = makeActions()
      actions.onSelectCard(7)
      expect(selection.toggleSelectCard).toHaveBeenCalledWith(7)
      expect(selection.enterSelection).toHaveBeenCalledOnce()
      expect(emitSfxMock).toHaveBeenCalledWith('select')
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
      expect(emitSfxMock).toHaveBeenCalledWith('card_drop')
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
      expect(emitSfxMock).toHaveBeenCalledWith('double_pop_up')
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
      expect(emitSfxMock).toHaveBeenCalledWith('digi_powerdown')
    })
  })
})
