import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { ref } from 'vue'
import { card } from '@tests/fixtures/card'

const { modalOpenMock, alertWarnMock, emitSfxMock } = vi.hoisted(() => ({
  modalOpenMock: vi.fn(),
  alertWarnMock: vi.fn(),
  emitSfxMock: vi.fn()
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key) => key })
}))
vi.mock('@/composables/alert', () => ({ useAlert: () => ({ warn: alertWarnMock }) }))
vi.mock('@/composables/modal', () => ({ useModal: () => ({ open: modalOpenMock }) }))
vi.mock('@/sfx/bus', () => ({ emitSfx: emitSfxMock }))
vi.mock('@/components/modals/move-cards.vue', () => ({ default: {} }))

import { useCardActions } from '@/composables/card-editor/card-actions'

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

function makeActions(opts = {}) {
  const list = opts.list ?? makeList()
  const selection = opts.selection ?? makeSelection()
  const mutations = opts.mutations ?? makeMutations()
  const deck_query = opts.deck_query ?? makeDeckQuery()
  const setMode = opts.setMode ?? vi.fn()
  const actions = useCardActions({
    list,
    selection,
    mutations,
    deck_query,
    deck_id: opts.deck_id ?? 10,
    setMode
  })
  return { actions, list, selection, mutations, deck_query, setMode }
}

describe('useCardActions', () => {
  beforeEach(() => {
    modalOpenMock.mockReset()
    alertWarnMock.mockReset()
    emitSfxMock.mockReset()
  })

  // ── onSelectCard ──────────────────────────────────────────────────────────

  describe('onSelectCard', () => {
    test('toggles selection for the given id and enters selection mode', () => {
      const { actions, selection } = makeActions()
      actions.onSelectCard(7)
      expect(selection.toggleSelectCard).toHaveBeenCalledWith(7)
      expect(selection.enterSelection).toHaveBeenCalledOnce()
      expect(emitSfxMock).toHaveBeenCalledWith('ui.select', { blocking: true })
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
    test('returns to view mode, exits selection, and emits the cancel sfx', () => {
      const { actions, selection, setMode } = makeActions()
      actions.onCancel()
      expect(setMode).toHaveBeenCalledWith('view')
      expect(selection.exitSelection).toHaveBeenCalledOnce()
      expect(emitSfxMock).toHaveBeenCalledWith('ui.card_drop')
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

    test('runs cleanup on confirm: refetch + setMode(view) + exitSelection', async () => {
      alertWarnMock.mockReturnValueOnce({ response: Promise.resolve(true) })
      const persisted = [makeCard({ id: 1 })]
      const { actions, mutations, selection, deck_query, setMode } = makeActions({
        list: makeList({ persisted }),
        selection: makeSelection({ selected_ids: [1] })
      })
      await actions.onDeleteCards()
      expect(mutations.deleteCards).toHaveBeenCalledOnce()
      expect(deck_query.refetch).toHaveBeenCalledOnce()
      expect(setMode).toHaveBeenCalledWith('view')
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

    test('fires the move mutation with the chosen destination on confirm', async () => {
      modalOpenMock.mockReturnValueOnce({ response: Promise.resolve({ deck_id: 42 }) })
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

    test('emits the open + close move-modal sfx pair', async () => {
      modalOpenMock.mockReturnValueOnce({ response: Promise.resolve(undefined) })
      const persisted = [makeCard({ id: 7 })]
      const { actions } = makeActions({
        list: makeList({ persisted }),
        selection: makeSelection()
      })
      await actions.onMoveCards(7)
      expect(emitSfxMock).toHaveBeenCalledWith('ui.double_pop_up')
      expect(emitSfxMock).toHaveBeenCalledWith('ui.double_pop_down')
    })

    test('runs cleanup after a successful move: exitSelection + refetch', async () => {
      modalOpenMock.mockReturnValueOnce({ response: Promise.resolve({ deck_id: 42 }) })
      const persisted = [makeCard({ id: 7 })]
      const { actions, selection, deck_query, setMode } = makeActions({
        list: makeList({ persisted }),
        selection: makeSelection({ selected_ids: [7] })
      })
      await actions.onMoveCards()
      expect(selection.exitSelection).toHaveBeenCalledOnce()
      expect(deck_query.refetch).toHaveBeenCalledOnce()
      expect(setMode).not.toHaveBeenCalled()
    })

    test('select-all mode passes { source_deck_id, except_ids } to mutation', async () => {
      modalOpenMock.mockReturnValueOnce({ response: Promise.resolve({ deck_id: 55 }) })
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
  })

  // ── onCancelSelection ────────────────────────────────────────────────────

  describe('onCancelSelection', () => {
    test('exits selection mode and emits the digi-powerdown sfx', () => {
      const { actions, selection, setMode } = makeActions()
      actions.onCancelSelection()
      expect(selection.exitSelection).toHaveBeenCalledOnce()
      expect(emitSfxMock).toHaveBeenCalledWith('ui.digi_powerdown')
      expect(setMode).not.toHaveBeenCalled()
    })
  })
})
