import type { CardSelection, VirtualCardList } from '@/composables/card'

export type DeleteArgs = { except_ids: number[] } | { cards: Card[] }

export type MoveArgs = { card_ids: number[] } | { source_deck_id: number; except_ids: number[] }

/**
 * Loaded persisted cards covered by the current selection, with `review`
 * stripped so the result is safe to spread into write payloads.
 *
 * In select-all mode this is incomplete by design — only the loaded pages
 * are reflected. The select-all delete path uses `{ except_ids }` instead so
 * the FE never has to enumerate every card.
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
 * Build a card-set payload by combining the current selection with an
 * optional additional card id:
 *
 * - `additional_card_id` undefined            → just the current selection.
 * - `additional_card_id` already in selection → just the current selection.
 * - `additional_card_id` new                  → selection plus that card.
 *
 * Strips `review` from the appended card so the result is safe to spread
 * into write payloads. Does not mutate selection state.
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
 * Resolve the args for the underlying delete mutation, deduced from the
 * current selection state. Returns `null` when there is nothing to delete.
 *
 * - select-all mode → `{ except_ids }` for deck-wide delete.
 * - otherwise       → `{ cards }` enumerated from selection + optional id.
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
 * Resolve the args for the underlying move mutation. Returns `null` when
 * nothing is movable.
 *
 * - select-all mode → `{ source_deck_id, except_ids }`; the BE moves every
 *   card in the source deck except the deselected ones, so the FE doesn't
 *   have to enumerate ids that aren't even loaded yet.
 * - otherwise       → `{ card_ids }` enumerated from selection + optional id.
 *
 * Also returns `preview_cards` — the loaded subset of the moving set, used
 * by the modal title for representative front/back display. In select-all
 * mode this is incomplete (only loaded pages); the BE works off the args.
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
