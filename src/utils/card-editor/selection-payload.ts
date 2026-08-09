import type { CardSelection } from '@/composables/card'
import type { VirtualCardList } from '@/views/deck/composables'

export type DeleteArgs = { except_ids: number[] } | { cards: Card[] }

export type MoveArgs = { card_ids: number[] } | { source_deck_id: number; except_ids: number[] }

/**
 * The saved cards the selection covers, of those scrolled into view.
 *
 * Under "select all" that's a partial answer — only what's loaded — so never
 * build a whole-deck operation from it.
 */
export function loadedSelectedCards(
  selection: Pick<CardSelection, 'filterSelected'>,
  list: Pick<VirtualCardList, 'persisted_cards'>
): Card[] {
  return selection
    .filterSelected(list.persisted_cards.value)
    .map(({ review: _review, ...rest }) => rest as Card)
}

/**
 * The selection, plus one more card when the action was aimed at a card
 * outside it — right-clicking an unselected row while others are ticked.
 *
 * Leaves the selection itself alone.
 *
 * @param additional_card_id - The aimed-at card. Already-selected or unknown
 *   ids change nothing.
 */
export function collectCards(
  selection: Pick<CardSelection, 'filterSelected' | 'isCardSelected'>,
  list: Pick<VirtualCardList, 'persisted_cards' | 'findCard'>,
  additional_card_id: number | undefined
): Card[] {
  const selected = loadedSelectedCards(selection, list)

  if (additional_card_id === undefined) return selected
  if (selection.isCardSelected(additional_card_id)) return selected

  const card = list.findCard(additional_card_id)
  if (!card) return selected

  const { review: _review, ...without_review } = card
  return [...selected, without_review as Card]
}

/**
 * What to hand the delete, and how many cards it covers. `null` when nothing
 * would be deleted.
 *
 * Under "select all" it describes the deck by what was *un*ticked, so deleting
 * ten thousand cards never means listing ten thousand ids.
 */
export function resolveDeleteArgs(
  selection: Pick<
    CardSelection,
    'select_all_mode' | 'selected_count' | 'deselected_ids' | 'filterSelected' | 'isCardSelected'
  >,
  list: Pick<VirtualCardList, 'persisted_cards' | 'findCard'>,
  additional_card_id?: number
): { count: number; args: DeleteArgs } | null {
  if (selection.select_all_mode.value) {
    return {
      count: selection.selected_count.value,
      args: { except_ids: selection.deselected_ids.value.slice() }
    }
  }

  const cards = collectCards(selection, list, additional_card_id)
  if (cards.length === 0) return null

  return { count: cards.length, args: { cards } }
}

/**
 * What to hand the move, how many cards it covers, and a few of them to show
 * in the confirmation. `null` when nothing would move.
 *
 * Same "select all" shape as the delete above. `preview_cards` is only ever
 * for display — the count is the honest number, that list may be shorter.
 */
export function resolveMoveArgs(
  selection: Pick<
    CardSelection,
    'select_all_mode' | 'selected_count' | 'deselected_ids' | 'filterSelected' | 'isCardSelected'
  >,
  list: Pick<VirtualCardList, 'persisted_cards' | 'findCard'>,
  source_deck_id: number,
  additional_card_id?: number
): { count: number; args: MoveArgs; preview_cards: Card[] } | null {
  if (selection.select_all_mode.value) {
    if (selection.selected_count.value === 0) return null

    return {
      count: selection.selected_count.value,
      args: { source_deck_id, except_ids: selection.deselected_ids.value.slice() },
      preview_cards: loadedSelectedCards(selection, list)
    }
  }

  const cards = collectCards(selection, list, additional_card_id)
  if (cards.length === 0) return null

  return {
    count: cards.length,
    args: { card_ids: cards.map((c) => c.id) },
    preview_cards: cards
  }
}
