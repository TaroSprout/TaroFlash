import { generateKeyBetween, generateNKeysBetween } from 'fractional-indexing'

/**
 * The single key generator for card ordering — nothing else in the app, and
 * nothing in Postgres, mints a rank.
 *
 * A rank is a base62 string ordered by plain byte comparison, so a card's
 * position is decided entirely by its two neighbours: no server round-trip to
 * compute it, no shared counter, and no rebalance pass when a gap runs out of
 * room. That's what lets an offline insert carry a real, mergeable position
 * instead of a placeholder.
 *
 * The column is `text COLLATE "C"` for the same reason — the database's default
 * en_US collation reorders case, and these keys are case-sensitive.
 */

/** `null` on either side means "no neighbour": the head or tail of the deck. */
export type RankNeighbours = { prev: string | null; next: string | null }

/** A card carrying a rank, or a staged one that hasn't been given a key yet. */
export type Ranked = { rank?: string | null }

/**
 * A key that sorts strictly between `prev` and `next`.
 *
 * Both `null` yields the first key of an empty deck.
 *
 * @throws If `prev >= next` — a caller that resolved its neighbours from a
 *   stale list, which would otherwise write a silently mis-sorted card.
 */
export function rankBetween({ prev, next }: RankNeighbours): string {
  return generateKeyBetween(prev, next)
}

/** `count` keys ascending strictly between `prev` and `next`. */
export function ranksBetween({ prev, next }: RankNeighbours, count: number): string[] {
  return generateNKeysBetween(prev, next, count)
}

/**
 * The nearest ranked neighbours around `slot` in `cards`.
 *
 * `cards` must be in render order with the moving card already removed, and
 * `slot` is the index it should land at — so the same call serves a drag-drop
 * and a staged insert. Unranked entries (cards staged but not yet saved) are
 * skipped: they have no key to sit between.
 *
 * @param tail_rank - Key of the first card on the *next* unloaded page, when
 *   there is one. Without it, a card dropped at the bottom of the loaded window
 *   would resolve `next: null` and jump to the end of the whole deck.
 */
export function resolveRankNeighbours(
  cards: Ranked[],
  slot: number,
  tail_rank: string | null = null
): RankNeighbours {
  return {
    prev: rankAt(cards, slot - 1, -1),
    next: rankAt(cards, slot, 1) ?? tail_rank
  }
}

/** Walk `step`-wise from `start` for the first entry carrying a rank. */
function rankAt(cards: Ranked[], start: number, step: number): string | null {
  for (let i = start; i >= 0 && i < cards.length; i += step) {
    if (cards[i]?.rank) return cards[i]!.rank!
  }

  return null
}
