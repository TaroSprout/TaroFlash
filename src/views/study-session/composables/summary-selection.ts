import { computed, watch, type Ref } from 'vue'
import { emitSfx } from '@/sfx/bus'
import { useCardSelection } from '@/composables/card'
import { useSummaryCardEdit } from './summary-card-edit'
import { useSummaryCardActions } from './summary-card-actions'
import { aggregateSession, type SummaryCategory } from '../session-summary/aggregate'
import type { CardReviewResult, StudyCard } from './session-engine'

type UseSummarySelectionOptions = {
  cards: Ref<StudyCard[]>
  results: Ref<CardReviewResult[]>
  category: Ref<SummaryCategory | null>
  thresholdFor: (deck_id?: number) => number
  updateCard: (card_id: number, values: Partial<Card>) => void
  dropCard: (card_id: number) => void
  closeCategory: () => void
}

/**
 * Multi-select + per-card destructive actions for a session-summary category
 * page. A session mixes decks, and a category page is a small, already-loaded
 * slice of it — unlike the deck grid this stays deck-agnostic and works off
 * an in-memory list, so it can't reuse
 * `useCardListController`/`useCardActions`/`useBulkActions`, which are
 * single-deck and paginated-query-bound.
 */
export function useSummarySelection({
  cards,
  results,
  category,
  thresholdFor,
  updateCard,
  dropCard,
  closeCategory
}: UseSummarySelectionOptions) {
  // The cards on the currently open category page, resolved from the same
  // session card list the category page itself reads — so a delete/move that
  // drops a card here disappears there too, no separate refetch.
  const category_cards = computed<StudyCard[]>(() => {
    const cat = category.value
    if (!cat) return []

    const summary = aggregateSession(results.value, thresholdFor)
    const group_results =
      cat === 'correct' ? [...summary.groups.correct, ...summary.incorrect] : summary.groups[cat]

    const by_id = new Map(cards.value.map((card) => [card.id, card]))
    return group_results.flatMap((result) => {
      const card = by_id.get(result.card_id)
      return card ? [card] : []
    })
  })

  const selection = useCardSelection(() => category_cards.value.length)
  const edit = useSummaryCardEdit(cards, updateCard)

  function onRemoved(card_id: number) {
    selection.deselectCard(card_id)
    dropCard(card_id)
  }

  const { deleteCards, moveCards } = useSummaryCardActions({ onRemoved })

  /** Positive select-all: every currently loaded card id — no except_ids concept. */
  function selectAll() {
    selection.selected_card_ids.value = category_cards.value.map((card) => card.id)
  }

  function selectedCards(): StudyCard[] {
    return selection.filterSelected(category_cards.value) as StudyCard[]
  }

  /**
   * Toggle-select `id` (when given) and enter selection mode; plays the
   * standard select sfx. The single seam for every selection entry point —
   * the card tap and the item-options "select" action — mirrors deck-view's
   * `actions.ts` `onSelectCard`.
   */
  function onSelectCard(id?: number) {
    if (id !== undefined) selection.toggleSelectCard(id)
    selection.enterSelection()
    emitSfx('select')
  }

  async function onDeleteSelected() {
    await deleteCards(selectedCards())
  }

  async function onMoveSelected() {
    await moveCards(selectedCards())
  }

  async function onDeleteCard(card_id: number) {
    const card = category_cards.value.find((c) => c.id === card_id)
    if (card) await deleteCards([card])
  }

  async function onMoveCard(card_id: number) {
    const card = category_cards.value.find((c) => c.id === card_id)
    if (card) await moveCards([card])
  }

  // Selection only makes sense on a category page — leaving one (including
  // the auto-close below) drops back to the calm, read-only summary.
  watch(category, () => {
    selection.exitSelection()
    edit.stop()
  })

  // The last card leaving a category (deleted, or moved to another deck) has
  // nothing left to show — fall back to the summary landing.
  watch(category_cards, (list) => {
    if (category.value && list.length === 0) closeCategory()
  })

  return {
    category_cards,
    selection,
    editing_card: edit.editing_card,
    edit_saving: edit.saving,
    startEdit: edit.start,
    stopEdit: edit.stop,
    onEditUpdate: edit.update,
    selectAll,
    onDeleteSelected,
    onMoveSelected,
    onDeleteCard,
    onMoveCard,
    onSelectCard
  }
}
