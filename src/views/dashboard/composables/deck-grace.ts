import { computed, toValue, type MaybeRefOrGetter } from 'vue'

// Free-plan deck limit — the top-N by rank survive a downgrade; the rest lock.
const DECK_LIMIT = 10

/**
 * Downgrade-grace lock state for the dashboard deck grid.
 *
 * During the 15-day grace the backend flags every over-limit deck `is_locked`.
 * We treat "any deck locked" as the in-grace signal, then recompute which decks
 * are locked from *local* rank — so a drag-reorder across the 10th position
 * updates the dim/lock optimistically (the move mutation already patches rank in
 * the cache) without waiting on a refetch. Outside grace nothing is locked.
 *
 * @example
 * const { lockedIds } = useDeckGrace(() => decks)
 * const locked = computed(() => lockedIds.value.has(deck.id))
 */
export function useDeckGrace(decks: MaybeRefOrGetter<Deck[]>) {
  const in_grace = computed(() => toValue(decks).some((deck) => deck.is_locked))

  const lockedIds = computed(() => {
    if (!in_grace.value) return new Set<number>()

    const by_rank = [...toValue(decks)].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
    return new Set(by_rank.slice(DECK_LIMIT).map((deck) => deck.id))
  })

  return { in_grace, lockedIds }
}
