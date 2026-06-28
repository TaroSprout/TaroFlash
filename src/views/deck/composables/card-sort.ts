import { computed, type Ref } from 'vue'
import { useAllCardsInDeckQuery } from '@/api/cards'
import type { CardSortKey } from './view-shell'
import type { CardWithClientId } from './virtual-list'

export type CardSort = ReturnType<typeof useCardSort>

type Comparator = (a: CardWithClientId, b: CardWithClientId) => number

/** FSRS difficulty, hardest first; cards with no review row sink to the bottom. */
function byDifficultyDesc(a: CardWithClientId, b: CardWithClientId): number {
  const da = a.review?.difficulty ?? -Infinity
  const db = b.review?.difficulty ?? -Infinity
  return db - da
}

const COMPARATORS: Record<Exclude<CardSortKey, 'default'>, Comparator> = {
  difficulty: byDifficultyDesc
}

/**
 * Whole-deck card sorting for the base view. A non-default `sort_by` reorders
 * the *entire* deck, so this can't lean on the infinite-scroll pages (which
 * only cover what's loaded) — it fetches every card once (gated on the sort
 * being active) and sorts client-side. Returns the single `displayed_cards`
 * list the grid renders: the untouched paginated list while sorting is off,
 * the fully-ordered fetch while it's on. Feeds `useCardSearch` as its idle list
 * so search composes on top.
 *
 * @param deck_id   - Numeric deck id to scope the fetch to.
 * @param all_cards - The view's paginated card list, shown when sort is off.
 * @param sort_by   - The active sort key from the view shell.
 */
export function useCardSort(
  deck_id: number,
  all_cards: Ref<CardWithClientId[]>,
  sort_by: Ref<CardSortKey>
) {
  const is_active = computed(() => sort_by.value !== 'default')

  const full = useAllCardsInDeckQuery(deck_id, is_active)

  // Server rows are plain `Card`s; tag each with its real id as `client_id` so
  // the grid's v-for key stays uniform across the paginated / sorted swap.
  const full_cards = computed<CardWithClientId[]>(() =>
    (full.data.value ?? []).map((card) => ({ ...card, client_id: String(card.id) }))
  )

  const displayed_cards = computed<CardWithClientId[]>(() => {
    if (!is_active.value) return all_cards.value
    return [...full_cards.value].sort(COMPARATORS[sort_by.value as Exclude<CardSortKey, 'default'>])
  })

  const is_loading = computed(() => is_active.value && full.isLoading.value)

  return { is_active, displayed_cards, is_loading }
}
