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
 * maps that id back to the deck's appearance, scheduler, starting side, and
 * leech threshold, so nothing downstream needs to know about `SessionDeck` at
 * all.
 *
 * `schedulerFor` returns a per-deck FSRS instance built from that deck's
 * resolved pacing, cached so it's constructed once per deck. `covers` is
 * reactive because the decks arrive asynchronously from the bootstrap.
 * `orderCards` builds the merged session queue (see below).
 */
export type DeckResolution = {
  appearanceFor: (deck_id?: number) => DeckAppearance
  schedulerFor: (deck_id?: number) => FSRS
  startingSideFor: (deck_id?: number) => CardStartingSide
  thresholdFor: (deck_id?: number) => number
  covers: ComputedRef<DeckCover[]>
  orderCards: (cards: Card[]) => Card[]
}

type ResolvedDeck = {
  appearance: DeckAppearance
  fsrs: FSRS
  starting_side: CardStartingSide
  threshold: number
  shuffle: boolean
}

/** Used until a card's deck lands; the cover gates on loading, so this never schedules a real review. */
const FALLBACK_FSRS = new FSRS(generatorParameters({ enable_fuzz: true }))

const DeckResolutionKey: InjectionKey<DeckResolution> = Symbol('study-session.deck-resolution')

// Trap: the client owns the schedule →[K:client-owns-the-schedule]
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
    starting_side: deck.starting_side,
    threshold: deck.leech_threshold,
    shuffle: deck.shuffle
  }
}

/** Fisher-Yates — a uniform shuffle (comparator-sort shuffles are biased). */
function fisherYates<T>(items: T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/** Split a merged queue into per-deck slices, preserving first-seen deck order. */
function groupByDeck(cards: Card[]): Card[][] {
  const groups = new Map<number | undefined, Card[]>()
  for (const card of cards) {
    const group = groups.get(card.deck_id)
    if (group) group.push(card)
    else groups.set(card.deck_id, [card])
  }
  return [...groups.values()]
}

/**
 * Proportional interleave: each card gets a key in (0, 1) from its position
 * within its own deck, so sorting by that key spreads every deck evenly across
 * the whole queue instead of finishing the short decks up front (round-robin's
 * flaw). Preserves each deck's internal order; ties keep first-seen deck order.
 */
function evenSpread(groups: Card[][]): Card[] {
  return groups
    .flatMap((group) => group.map((card, i) => ({ card, key: (i + 0.5) / group.length })))
    .sort((a, b) => a.key - b.key)
    .map((entry) => entry.card)
}

/**
 * Uniform random merge: one token per card (its deck index), shuffled, then each
 * deck drawn from in token order — so which deck contributes next is random but
 * every deck keeps its own internal order.
 */
function randomMerge(groups: Card[][]): Card[] {
  const tokens = fisherYates(groups.flatMap((group, index) => group.map(() => index)))
  const pointers = groups.map(() => 0)
  return tokens.map((index) => groups[index][pointers[index]++])
}

/**
 * Builds the per-deck resolution from the session's decks. Accessor functions
 * are stable (they read an internal memoized map), so the session core can
 * capture them once; `covers` stays reactive for the subtree.
 */
export function buildDeckResolution(
  decks: MaybeRefOrGetter<SessionDeck[]>,
  ordering: MaybeRefOrGetter<MultiDeckOrdering>
): DeckResolution {
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

  function shuffleFor(deck_id?: number): boolean {
    return (deck_id != null && by_deck.value.get(deck_id)?.shuffle) || false
  }

  /**
   * Build the session's study queue. Two orthogonal axes: each deck's own
   * `shuffle` flag sets its internal order (Fisher-Yates vs the server's due
   * order), then the session `ordering` pref merges the per-deck slices —
   * `sequential` (deck-by-deck), `even_spread` (each deck distributed evenly),
   * or `random` (a random merge that still preserves each deck's own order).
   * Runs once at session start; the engine stays deck-blind.
   */
  function orderCards(cards: Card[]): Card[] {
    const groups = groupByDeck(cards).map((group) =>
      shuffleFor(group[0]?.deck_id) ? fisherYates(group) : group
    )

    const strategy = toValue(ordering)
    if (strategy === 'sequential') return groups.flat()
    if (strategy === 'even_spread') return evenSpread(groups)
    return randomMerge(groups)
  }

  return {
    appearanceFor: (id) => (id != null && by_deck.value.get(id)?.appearance) || {},
    schedulerFor: (id) => (id != null && by_deck.value.get(id)?.fsrs) || FALLBACK_FSRS,
    startingSideFor: (id) => (id != null && by_deck.value.get(id)?.starting_side) || 'front',
    thresholdFor: (id) =>
      (id != null ? by_deck.value.get(id)?.threshold : undefined) ?? DEFAULT_LEECH_THRESHOLD,
    covers,
    orderCards
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
