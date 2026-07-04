import { useI18n } from 'vue-i18n'
import { emitSfx } from '@/sfx/bus'
import { resolveDeleteArgs, resolveMoveArgs } from '@/utils/card-editor/selection-payload'
import { useCardPrompts, type CardSelection, type CardMutations } from '@/composables/card'
import { useCardLimitGate } from '@/composables/card/limit-gate'
import { useToast } from '@/composables/toast'
import type { useDeckQuery } from '@/api/decks'
import type { VirtualCardList } from './virtual-list'
import type { DeckViewShell } from './view-shell'

export type CardActions = ReturnType<typeof useCardActions>

type DeckQuery = ReturnType<typeof useDeckQuery>

type Args = {
  list: VirtualCardList
  selection: CardSelection
  mutations: CardMutations
  deck_query: Pick<DeckQuery, 'refetch'>
  deck_id: number
  shell: Pick<DeckViewShell, 'exitMode'>
}

/**
 * Intent handlers for the deck-editor: confirm + delete, open + move, enter
 * selection, exit mode. Composes modal / alert / sfx around the underlying
 * mutations so the controller doesn't carry that UI baggage. Flows that end
 * editing hand control back to the deck-view shell via `shell.exitMode()`.
 *
 * @example
 * const actions = useCardActions({ list, selection, mutations, deck_id, shell })
 * actions.onDeleteCards(card_id)
 */
export function useCardActions({ list, selection, mutations, deck_query, deck_id, shell }: Args) {
  const { t } = useI18n()
  const { confirmDelete, openMoveModal } = useCardPrompts()
  const { handleLimitError } = useCardLimitGate(undefined)
  const toast = useToast()

  /** Cleanup applied after any successful delete: drop selection, refetch. */
  async function afterDelete() {
    selection.exitSelection()
    await deck_query.refetch()
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
    emitSfx('select')
  }

  /**
   * Open the move-cards modal for the current selection plus an optional
   * additional card. On confirm, runs the move mutation against the chosen
   * destination deck. Select-all mode routes through the deck-wide BE path
   * so cards on unloaded pages still move.
   */
  async function onMoveCards(additional_card_id?: number) {
    const resolved = resolveMoveArgs(selection, list, deck_id, additional_card_id)
    if (!resolved) return

    const target = await openMoveModal(resolved.preview_cards, resolved.count, deck_id)
    if (!target) return

    const vars =
      'card_ids' in resolved.args
        ? {
            target_deck_id: target.deck_id,
            card_ids: resolved.args.card_ids,
            source_deck_ids: Array.from(
              new Set(resolved.preview_cards.map((c) => c.deck_id).filter((id) => id !== undefined))
            )
          }
        : { target_deck_id: target.deck_id, ...resolved.args }

    try {
      await mutations.moveCards(vars)
    } catch (error) {
      if (!handleLimitError(error)) toast.error(t('toast.error.move-cards-failed'))
      return
    }

    await afterMove()
  }

  /** Exit the current mode: drop selection, return to view mode. */
  function onCancel() {
    emitSfx('card_drop')
    shell.exitMode()
    selection.exitSelection()
  }

  /** Exit selection mode only (keeps the current editor mode). */
  function onCancelSelection() {
    emitSfx('digi_powerdown')
    selection.exitSelection()
  }

  return { onDeleteCards, onSelectCard, onMoveCards, onCancel, onCancelSelection }
}
