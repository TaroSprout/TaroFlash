import { computed, ref, type InjectionKey, type Ref } from 'vue'
import { useSearchCardsInDeckQuery } from '@/api/cards'
import { emitSfx } from '@/sfx/bus'
import type { CardWithClientId } from './virtual-list'

export type CardSearch = ReturnType<typeof useCardSearch>

export const cardSearchKey = Symbol('cardSearch') as InjectionKey<CardSearch>

/**
 * In-deck card search: a transient filter bar over the base view that matches
 * the live query against each card's front/back text (server-side `ilike`, so
 * it spans the whole deck, not just the infinite-scroll pages already loaded).
 *
 * Owns the bar's visibility (`is_searching`), the query text, the backing
 * search query, and the single `displayed_cards` list the grid renders —
 * the full deck while idle, the matches while a query is active. Kept out of
 * `useDeckViewShell`, which is deliberately free of card-data concerns.
 *
 * @param deck_id   - Numeric deck id to scope the search to.
 * @param all_cards - The view's full card list, shown when no query is active.
 *
 * @example
 * const search = useCardSearch(deck_id, editor.list.all_cards)
 * provide(cardSearchKey, search)
 */
export function useCardSearch(deck_id: number, all_cards: Ref<CardWithClientId[]>) {
  const is_searching = ref(false)
  const query = ref('')

  const trimmed = computed(() => query.value.trim())
  const is_active = computed(() => is_searching.value && trimmed.value.length > 0)

  const search = useSearchCardsInDeckQuery(deck_id, trimmed)

  // Server results are plain `Card`s; tag each with a `client_id` (its real id)
  // so the grid's v-for key stays uniform across the full-list / results swap.
  const results = computed<CardWithClientId[]>(() =>
    (search.data.value ?? []).map((card) => ({ ...card, client_id: String(card.id) }))
  )

  const displayed_cards = computed<CardWithClientId[]>(() =>
    is_active.value ? results.value : all_cards.value
  )
  const is_loading = computed(() => is_active.value && search.isLoading.value)
  const no_results = computed(
    () => is_active.value && !search.isLoading.value && (search.data.value?.length ?? 0) === 0
  )

  /** Reveal the filter field, playing the shared chime. */
  function open() {
    emitSfx('generic_button_15')
    is_searching.value = true
  }

  /** Hide the field and clear the query, dropping back to the full list. */
  function close() {
    emitSfx('slide_left')
    is_searching.value = false
    query.value = ''
  }

  /** Toggle the field open or closed. */
  function toggle() {
    if (is_searching.value) close()
    else open()
  }

  return {
    is_searching,
    query,
    is_active,
    displayed_cards,
    is_loading,
    no_results,
    open,
    close,
    toggle
  }
}
