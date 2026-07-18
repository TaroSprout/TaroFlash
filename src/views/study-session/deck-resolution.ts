import {
  computed,
  inject,
  provide,
  toValue,
  type ComputedRef,
  type InjectionKey,
  type MaybeRefOrGetter
} from 'vue'
import { FSRS, generatorParameters, type Steps } from 'ts-fsrs'
import { DEFAULT_LEECH_THRESHOLD, FSRS_MAX_INTERVAL } from '@/utils/review-pacing/defaults'

export type DeckAppearance = {
  cover_config?: DeckCover
  card_attributes?: DeckCardAttributes
}

/**
 * The single place that reads `SessionDeck` fields. The study session runs on a
 * flat, deck-blind card queue where every card carries its own `deck_id`; this
 * maps that id back to the deck's appearance, scheduler, flip default, and leech
 * threshold, so nothing downstream needs to know about `SessionDeck` at all.
 *
 * `schedulerFor` returns a per-deck FSRS instance built from that deck's
 * resolved pacing, cached so it's constructed once per deck. `covers`/`shuffle`
 * are reactive because the decks arrive asynchronously from the bootstrap.
 */
export type DeckResolution = {
  appearanceFor: (deck_id?: number) => DeckAppearance
  schedulerFor: (deck_id?: number) => FSRS
  flipFor: (deck_id?: number) => boolean
  thresholdFor: (deck_id?: number) => number
  covers: ComputedRef<DeckCover[]>
  shuffle: ComputedRef<boolean>
}

type ResolvedDeck = {
  appearance: DeckAppearance
  fsrs: FSRS
  flip: boolean
  threshold: number
}

// Used until a card's deck lands (or for a card whose deck somehow isn't in the
// session). The cover gates on loading, so this never schedules a real review.
const FALLBACK_FSRS = new FSRS(generatorParameters({ enable_fuzz: true }))

const DeckResolutionKey: InjectionKey<DeckResolution> = Symbol('study-session.deck-resolution')

function buildScheduler(deck: SessionDeck): FSRS {
  return new FSRS(
    generatorParameters({
      enable_fuzz: true,
      learning_steps: deck.learning_steps as Steps,
      relearning_steps: deck.relearning_steps as Steps,
      // desired_retention is a whole-number percent (90 = 90%).
      request_retention: deck.desired_retention / 100,
      // null = uncapped -> the FSRS default max interval.
      maximum_interval: deck.max_interval ?? FSRS_MAX_INTERVAL
    })
  )
}

function resolveDeck(deck: SessionDeck): ResolvedDeck {
  return {
    appearance: { cover_config: deck.cover_config, card_attributes: deck.card_attributes },
    fsrs: buildScheduler(deck),
    flip: deck.flip_cards,
    threshold: deck.leech_threshold
  }
}

/**
 * Builds the per-deck resolution from the session's decks. Accessor functions
 * are stable (they read an internal memoized map), so the session core can
 * capture them once; `covers`/`shuffle` stay reactive for the subtree.
 */
export function buildDeckResolution(decks: MaybeRefOrGetter<SessionDeck[]>): DeckResolution {
  const by_deck = computed(() => {
    const map = new Map<number, ResolvedDeck>()
    for (const deck of toValue(decks)) map.set(deck.id, resolveDeck(deck))
    return map
  })

  const covers = computed(() =>
    toValue(decks)
      .map((deck) => deck.cover_config)
      .filter((cover): cover is DeckCover => !!cover)
  )

  // Any deck opting into shuffle shuffles the merged queue.
  const shuffle = computed(() => toValue(decks).some((deck) => deck.shuffle))

  return {
    appearanceFor: (id) => (id != null && by_deck.value.get(id)?.appearance) || {},
    schedulerFor: (id) => (id != null && by_deck.value.get(id)?.fsrs) || FALLBACK_FSRS,
    flipFor: (id) => (id != null && by_deck.value.get(id)?.flip) || false,
    thresholdFor: (id) =>
      (id != null ? by_deck.value.get(id)?.threshold : undefined) ?? DEFAULT_LEECH_THRESHOLD,
    covers,
    shuffle
  }
}

export function provideDeckResolution(resolution: DeckResolution) {
  provide(DeckResolutionKey, resolution)
}

export function useDeckResolution(): DeckResolution {
  const resolution = inject(DeckResolutionKey)
  if (!resolution) throw new Error('No DeckResolution provided above this component')
  return resolution
}
