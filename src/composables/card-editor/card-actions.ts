import { useI18n } from 'vue-i18n'
import { useAlert } from '@/composables/alert'
import { useModal } from '@/composables/modal'
import { emitSfx } from '@/sfx/bus'
import MoveCardsModal from '@/components/modals/move-cards.vue'
import { collectCards, resolveDeleteArgs } from '@/utils/card-editor/selection-payload'
import type { useDeckQuery } from '@/api/decks'
import type { CardSelection } from './card-selection'
import type { VirtualCardList } from './virtual-card-list'
import type { CardMutations } from './card-mutations'

export type CardActions = ReturnType<typeof useCardActions>

type DeckQuery = ReturnType<typeof useDeckQuery>

type Args = {
  list: VirtualCardList
  selection: CardSelection
  mutations: CardMutations
  deck_query: Pick<DeckQuery, 'refetch'>
  deck_id: number
  setMode: (mode: CardEditorMode) => void
}

/**
 * Intent handlers for the deck-editor: confirm + delete, open + move, enter
 * selection, exit mode. Composes modal / alert / sfx around the underlying
 * mutations so the controller doesn't carry that UI baggage.
 *
 * @example
 * const actions = useCardActions({ list, selection, mutations, deck_id, setMode })
 * actions.onDeleteCards(card_id)
 */
export function useCardActions({ list, selection, mutations, deck_query, deck_id, setMode }: Args) {
  const { t } = useI18n()
  const modal = useModal()
  const alert = useAlert()

  /** Show the delete-N-cards confirm alert. Resolves to the user's choice. */
  function confirmDelete(count: number) {
    const { response } = alert.warn({
      title: t('alert.delete-card.title', { count }),
      message: t('alert.delete-card.message', { count }),
      confirmLabel: t('alert.delete-card.confirm'),
      confirmAudio: 'ui.trash_crumple_short'
    })
    return response
  }

  /** Cleanup applied after any successful delete: drop selection, refetch, exit. */
  async function afterDelete() {
    selection.exitSelection()
    await deck_query.refetch()
    setMode('view')
  }

  /** Cleanup applied after any successful move: drop selection, refetch source deck. */
  async function afterMove() {
    selection.exitSelection()
    await deck_query.refetch()
  }

  /**
   * Confirm + delete a set of cards. Source of the set:
   *
   * - select-all mode             → deck-wide via `{ except_ids }`.
   * - `additional_card_id` given  → that card plus the current selection.
   * - neither                     → the current selection only.
   *
   * No-op when there's nothing to delete or the user dismisses the alert.
   */
  async function onDeleteCards(additional_card_id?: number) {
    const resolved = resolveDeleteArgs(selection, list, additional_card_id)
    if (!resolved) return
    if (!(await confirmDelete(resolved.count))) return

    await mutations.deleteCards(resolved.args)
    await afterDelete()
  }

  /**
   * Toggle selection for `id` (when given) and enter selection mode. Used by
   * both the row checkbox click and the "select" item-options action — the
   * latter passes no id to enter selection mode without altering anything.
   */
  function onSelectCard(id?: number) {
    if (id !== undefined) selection.toggleSelectCard(id)
    selection.enterSelection()
    emitSfx('ui.select', { blocking: true })
  }

  /**
   * Open the move-cards modal with the given cards, paired with the open /
   * close sfx. Returns the user's chosen destination deck or `undefined` if
   * they dismissed the modal.
   */
  function openMoveModal(cards: Card[]) {
    emitSfx('ui.double_pop_up')

    const { response } = modal.open<{ deck_id: number }>(MoveCardsModal, {
      backdrop: true,
      props: { cards, current_deck_id: deck_id }
    })
    response.then(() => emitSfx('ui.double_pop_down'))

    return response
  }

  /**
   * Open the move-cards modal for the current selection plus an optional
   * additional card. On confirm, runs the move mutation against the chosen
   * destination deck.
   */
  async function onMoveCards(additional_card_id?: number) {
    const cards = collectCards(selection, list, additional_card_id)
    if (cards.length === 0) return

    const target = await openMoveModal(cards)
    if (!target) return

    await mutations.moveCards({ cards, target_deck_id: target.deck_id })
    await afterMove()
  }

  /** Exit the current mode: drop selection, return to view mode. */
  function onCancel() {
    emitSfx('ui.card_drop')
    setMode('view')
    selection.exitSelection()
  }

  /** Exit selection mode only (keeps the current editor mode). */
  function onCancelSelection() {
    emitSfx('ui.digi_powerdown')
    selection.exitSelection()
  }

  return { onDeleteCards, onSelectCard, onMoveCards, onCancel, onCancelSelection }
}
