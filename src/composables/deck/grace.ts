import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { FREE_DECK_LIMIT } from '@/config/plans'

/**
 * Downgrade-grace lock state for a deck list. The backend flags over-limit decks
 * `is_locked`; "any deck locked" means in-grace, and locked-ness is then
 * recomputed from *local* rank so a reorder across the limit line updates the
 * dim/lock optimistically, without a refetch. Outside grace nothing is locked.
 */
export function useDeckGrace(decks: MaybeRefOrGetter<Deck[]>) {
  const in_grace = computed(() => toValue(decks).some((deck) => deck.is_locked))

  const lockedIds = computed(() => {
    if (!in_grace.value) return new Set<number>()

    const by_rank = [...toValue(decks)].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
    return new Set(by_rank.slice(FREE_DECK_LIMIT).map((deck) => deck.id))
  })

  return { in_grace, lockedIds }
}
