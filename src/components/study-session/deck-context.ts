import {
  computed,
  inject,
  provide,
  ref,
  toValue,
  type InjectionKey,
  type MaybeRefOrGetter,
  type Ref
} from 'vue'

export type DeckAppearance = {
  cover_config?: DeckCover
  card_attributes?: DeckCardAttributes
}

/**
 * Per-card → deck appearance lookup for the study session. The session operates
 * on a flat card queue where each card carries its own `deck_id`; this is the
 * single place that maps a card's deck back to its cover/attributes, so the
 * resolution never gets duplicated across the cards that render it. Single-deck
 * sessions are just a one-entry map; `covers` drives the multi-deck splash.
 */
export type DeckContext = {
  appearanceFor: (deck_id?: number) => DeckAppearance
  covers: DeckCover[]
}

const EMPTY_CONTEXT: DeckContext = { appearanceFor: () => ({}), covers: [] }

const DeckContextKey: InjectionKey<Ref<DeckContext>> = Symbol('study-session.deck-context')

/**
 * Builds the deck-appearance lookup from the session's decks and provides it to
 * the card subtree. The map is keyed by `deck_id` so each card resolves its own
 * deck's cover/attributes; `covers` is the ordered cover list the splash cycles.
 */
export function useProvideDeckContext(decks: MaybeRefOrGetter<Deck[]>) {
  const appearance_by_deck = computed(() => {
    const map = new Map<number, DeckAppearance>()
    for (const deck of toValue(decks))
      map.set(deck.id, { cover_config: deck.cover_config, card_attributes: deck.card_attributes })
    return map
  })

  const covers = computed(() =>
    toValue(decks)
      .map((deck) => deck.cover_config)
      .filter((cover): cover is DeckCover => !!cover)
  )

  provide(
    DeckContextKey,
    computed(() => ({
      appearanceFor: (deck_id?: number) =>
        (deck_id !== undefined && appearance_by_deck.value.get(deck_id)) || {},
      covers: covers.value
    }))
  )
}

export function useDeckContext(): Ref<DeckContext> {
  return inject(DeckContextKey, ref<DeckContext>(EMPTY_CONTEXT))
}
