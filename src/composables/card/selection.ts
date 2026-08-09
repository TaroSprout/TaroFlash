import { computed, ref, toValue, type MaybeRefOrGetter } from 'vue'

export type CardSelection = ReturnType<typeof useCardSelection>

/**
 * Which cards are picked in the deck editor.
 *
 * Normally a list of the ones ticked. Under "select all" it flips — everything
 * is selected except the ones since unticked.
 *
 * @param total_card_count - Persisted card count for the deck, passed in so
 *   this stays independent of the decks query.
 */
export function useCardSelection(total_card_count: MaybeRefOrGetter<number>) {
  const selected_card_ids = ref<number[]>([])
  const deselected_ids = ref<number[]>([])
  const select_all_mode = ref(false)
  const is_selecting = ref(false)

  const total_count = computed(() => toValue(total_card_count) ?? 0)

  const selected_count = computed(() => {
    if (select_all_mode.value) {
      return Math.max(0, total_count.value - deselected_ids.value.length)
    }

    return selected_card_ids.value.length
  })

  const all_cards_selected = computed(() => {
    if (select_all_mode.value) return deselected_ids.value.length === 0
    return total_count.value > 0 && selected_card_ids.value.length === total_count.value
  })

  /** Enters selection mode; persists past `clearSelectedCards` until explicitly exited. */
  function enterSelection() {
    is_selecting.value = true
  }

  function exitSelection() {
    is_selecting.value = false
    clearSelectedCards()
  }

  function isCardSelected(id: number): boolean {
    if (select_all_mode.value) return !deselected_ids.value.includes(id)
    return selected_card_ids.value.includes(id)
  }

  function selectCard(id: number) {
    if (select_all_mode.value) {
      const i = deselected_ids.value.indexOf(id)
      if (i !== -1) deselected_ids.value.splice(i, 1)
      return
    }

    if (!selected_card_ids.value.includes(id)) selected_card_ids.value.push(id)
  }

  function deselectCard(id: number) {
    if (select_all_mode.value) {
      if (!deselected_ids.value.includes(id)) deselected_ids.value.push(id)
      return
    }

    const i = selected_card_ids.value.indexOf(id)
    if (i !== -1) selected_card_ids.value.splice(i, 1)
  }

  function toggleSelectCard(id: number) {
    if (isCardSelected(id)) deselectCard(id)
    else selectCard(id)
  }

  function selectAllCards() {
    select_all_mode.value = true
    deselected_ids.value = []
    selected_card_ids.value = []
  }

  function clearSelectedCards() {
    select_all_mode.value = false
    deselected_ids.value = []
    selected_card_ids.value = []
  }

  function toggleSelectAll() {
    if (all_cards_selected.value) clearSelectedCards()
    else selectAllCards()
  }

  // Unsaved temp cards have no id, and selection only applies to persisted rows.
  function filterSelected(cards: Card[]): Card[] {
    return cards.filter((card) => {
      if (card.id === undefined) return false
      return isCardSelected(card.id)
    })
  }

  return {
    selected_card_ids,
    deselected_ids,
    select_all_mode,
    total_card_count: total_count,
    selected_count,
    all_cards_selected,
    is_selecting,
    enterSelection,
    exitSelection,
    isCardSelected,
    selectCard,
    deselectCard,
    toggleSelectCard,
    selectAllCards,
    clearSelectedCards,
    toggleSelectAll,
    filterSelected
  }
}
