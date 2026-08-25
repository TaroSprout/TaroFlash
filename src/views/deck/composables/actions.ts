import { useI18n } from 'vue-i18n'
import { emitSfx } from '@/sfx/bus'
import { fadeEnter, fadeLeave } from '@/utils/animations/fade'
import { useNoticeStore } from '@/stores/notice-store'
import { resolveDeleteArgs, resolveMoveArgs } from '@/utils/card-editor/selection-payload'
import { useCardPrompts, type CardSelection, type CardMutations } from '@/composables/card'
import { useAllCardsInDeckQuery } from '@/api/cards'
import type { useDeckQuery } from '@/api/decks'
import { cardsToCsv, deckExportFilename } from '@/utils/card/csv'
import { downloadTextFile } from '@/utils/download'
import type { VirtualCardList } from './virtual-list'
import type { DeckViewShell } from './view-shell'

export type CardActions = ReturnType<typeof useCardActions>

type DeckQuery = ReturnType<typeof useDeckQuery>

type Args = {
  list: VirtualCardList
  selection: CardSelection
  mutations: CardMutations
  deck_query: Pick<DeckQuery, 'refetch' | 'data'>
  deck_id: number
  shell: Pick<DeckViewShell, 'exitMode'>
}

/**
 * Intent handlers for the deck-editor: confirm + delete, open + move, enter
 * selection, exit mode. Composes modal / alert / sfx around the underlying
 * mutations so the controller doesn't carry that UI baggage.
 */
export function useCardActions({ list, selection, mutations, deck_query, deck_id, shell }: Args) {
  const { t } = useI18n()
  const notice = useNoticeStore()
  const { confirmDelete, openMoveModal } = useCardPrompts()
  const all_cards_query = useAllCardsInDeckQuery(() => deck_id)

  /**
   * The promoted placeholders a deck-wide write clears: everything created
   * this session that the write wasn't told to leave alone.
   */
  function promotedTempIdsExcept(except_ids: number[]): number[] {
    const kept = new Set(except_ids)

    return list.temp_entries.value
      .map((entry) => entry.real_id)
      .filter((id): id is number => id !== null && !kept.has(id))
  }

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

    // The cards' own placeholders go with them, in the same beat as the
    // mutation's optimistic cache write — a card created this session has a
    // placeholder standing in for it that no refetch can drop.
    // →[K:deck-temp-card-handoff]
    const retired =
      'cards' in resolved.args ? list.retireTemps(resolved.args.cards.map((card) => card.id)) : []

    try {
      await mutations.deleteCards(resolved.args)
    } catch {
      list.restoreTemps(retired)
      notice.error(t('toast.error.delete-cards-failed'))
      return
    }

    // The deck-wide path stays un-optimistic, so its placeholders only go once
    // the server has taken the cards.
    if ('except_ids' in resolved.args) {
      list.retireTemps(promotedTempIdsExcept(resolved.args.except_ids))
    }

    await afterDelete()
  }

  /**
   * Delete one card with no confirmation — the grid's reorder-mode corner
   * button. Reorder is already a destructive editing mode, so it skips
   * `confirmDelete` and fires the delete cue directly instead of riding the
   * confirm alert's `confirmAudio`. Fades `card_el` out before the mutation
   * fires, so the card visibly leaves instead of vanishing the instant the
   * grid reflows. No-op when the card isn't found.
   */
  async function onDeleteCardImmediate(card_id: number, card_el: HTMLElement) {
    const card = list.findCard(card_id)
    if (!card) return

    const { review: _review, ...without_review } = card
    const retired = list.retireTemps([card_id])

    emitSfx('card.delete')
    await new Promise<void>((resolve) => fadeLeave(card_el, resolve))

    try {
      await mutations.deleteCards({ cards: [without_review as Card] })
    } catch {
      list.restoreTemps(retired)
      fadeEnter(card_el, () => {})
      notice.error(t('toast.error.delete-cards-failed'))
      return
    }

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
    emitSfx('ui.select')
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

    async function move(target_deck_id: number) {
      const vars =
        'card_ids' in resolved!.args
          ? {
              target_deck_id,
              card_ids: resolved!.args.card_ids,
              source_deck_ids: Array.from(
                new Set(
                  resolved!.preview_cards.map((c) => c.deck_id).filter((id) => id !== undefined)
                )
              )
            }
          : { target_deck_id, ...resolved!.args, count: resolved!.count }

      await mutations.moveCards(vars)
    }

    const target = await openMoveModal(resolved.preview_cards, resolved.count, deck_id, move)
    if (!target) return

    // Same placeholder problem as delete: the source deck's refetch can't take
    // away a row the persisted list never carried. →[K:deck-temp-card-handoff]
    list.retireTemps(
      'card_ids' in resolved.args
        ? resolved.args.card_ids
        : promotedTempIdsExcept(resolved.args.except_ids)
    )

    await afterMove()
  }

  /** Exit the current mode: drop selection, return to view mode. */
  function onCancel() {
    emitSfx('dialog.close')
    shell.exitMode()
    selection.exitSelection()
  }

  /** Exit selection mode only (keeps the current editor mode). */
  function onCancelSelection() {
    emitSfx('ui.deselect')
    selection.exitSelection()
  }

  /** Every card in the deck, in rank order — bypasses the grid's pagination. */
  async function resolveAllCards(): Promise<Card[]> {
    const result = await all_cards_query.refetch()
    return result.status === 'success' ? result.data : []
  }

  /** Download `cards` as CSV and toast the count. No-op on an empty result. */
  function exportCards(cards: Card[]) {
    if (cards.length === 0) return

    const filename = deckExportFilename(deck_query.data.value?.title)
    const csv = cardsToCsv(cards)

    downloadTextFile(filename, csv)
    notice.success(t('toast.success.cards-exported', { count: cards.length }))
  }

  /** Exports the whole deck, whatever happens to be selected. */
  async function onExportCards() {
    const cards = await resolveAllCards()

    exportCards(cards)
  }

  /**
   * Exports the picked cards.
   *
   * Under "select all" the pick is held as exclusions, so it covers cards the
   * grid never loaded — that case reads the deck in full before filtering.
   */
  async function onExportSelection() {
    if (!selection.select_all_mode.value) {
      const picked = selection.filterSelected(list.persisted_cards.value)

      exportCards(picked)
      return
    }

    const all = await resolveAllCards()
    const picked = all.filter((card) => card.id !== undefined && selection.isCardSelected(card.id))

    exportCards(picked)
  }

  return {
    onDeleteCards,
    onDeleteCardImmediate,
    onSelectCard,
    onMoveCards,
    onCancel,
    onCancelSelection,
    onExportCards,
    onExportSelection
  }
}
