import { computed, ref, type InjectionKey, type Ref } from 'vue'
import { emitSfx } from '@/sfx/bus'
import type { CardWithClientId } from './virtual-list'

export type CardSearch = ReturnType<typeof useCardSearch>

export const cardSearchKey = Symbol('cardSearch') as InjectionKey<CardSearch>

/**
 * In-deck card search UI state. Owns the search bar's visibility, the query
 * text, and the derived display flags. Filtering itself is handled server-side
 * by the `get_cards_in_deck` RPC — this composable just tracks what the user
 * typed and whether the bar is open.
 *
 * `displayed_cards` is a pass-through of the already-filtered `all_cards` from
 * the list controller; `is_loading` and `no_results` reflect the controller's
 * query state while a search is active.
 *
 * @param query_ref   - Shared ref the search bar writes to; also fed into
 *                      `useCardsInDeckInfiniteQuery` as its `search_query` arg.
 * @param all_cards   - The controller's current card list (RPC-filtered).
 * @param is_querying - True while the controller's infinite query is in flight.
 *
 * @example
 * const search_query = ref('')
 * const editor = useCardListController({ ..., search_query })
 * const search = useCardSearch(search_query, editor.list.all_cards, editor.isLoading)
 * provide(cardSearchKey, search)
 */
export function useCardSearch(
  query_ref: Ref<string>,
  all_cards: Ref<CardWithClientId[]>,
  is_querying: Ref<boolean>
) {
  const is_searching = ref(false)

  const query = query_ref
  const trimmed = computed(() => query.value.trim())
  const is_active = computed(() => is_searching.value && trimmed.value.length > 0)

  const displayed_cards = all_cards
  const is_loading = computed(() => is_active.value && is_querying.value)
  const no_results = computed(
    () => is_active.value && !is_loading.value && all_cards.value.length === 0
  )

  function open() {
    emitSfx('generic_button_15')
    is_searching.value = true
  }

  function close() {
    emitSfx('slide_left')
    is_searching.value = false
    query.value = ''
  }

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
