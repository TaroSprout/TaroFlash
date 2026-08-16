import { computed, ref, type InjectionKey, type Ref } from 'vue'
import { emitSfx } from '@/sfx/bus'
import type { CardWithClientId } from './virtual-list'

export type CardSearch = ReturnType<typeof useCardSearch>

export const cardSearchKey = Symbol('cardSearch') as InjectionKey<CardSearch>

/**
 * In-deck card search UI state — the search bar's visibility, the query text,
 * and the derived display flags. Filtering itself is server-side, via
 * `get_cards_in_deck`; `displayed_cards` is a pass-through of the already
 * filtered `all_cards`.
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
    emitSfx('nav.page-back')
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
