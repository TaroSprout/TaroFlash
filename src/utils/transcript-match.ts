import type { CardIndexEntry } from '@/api/cards'
import { cleanTerm, type DisplayWord } from '@/utils/transcript'

// A stretch of the transcript that says one of the member's cards. `lo`/`hi`
// share the numbering `WordRange` uses, so a match is a selection as it
// stands. The matcher leaves `palette` unset — the reader fills it in from the
// owning deck's cover.
export type CardMatch = {
  lo: number
  hi: number
  term: string
  deck_ids: number[]
  palette?: PaletteName
}

// Build this once and share it — the matcher, the per-word lookup, and the
// term panel all read the same map.
export type CardTermMap = Map<string, number[]>

// A ceiling on the scan, not a limit on what a card may say — no real card
// front runs this long.
const MAX_SPAN_WORDS = 16

/**
 * Folds the card index down to one entry per term, so "Cat" and "cat," are the
 * same card as far as everything downstream is concerned.
 */
export function buildCardTermMap(index: CardIndexEntry[]): CardTermMap {
  const map: CardTermMap = new Map()

  for (const entry of index) {
    const key = normalizeForMatch(entry.term)
    if (!key) continue
    const existing = map.get(key)
    map.set(key, existing ? unionDecks(existing, entry.deck_ids) : [...entry.deck_ids])
  }

  return map
}

/** The decks already holding `term` (normalized), or [] when no card matches. */
export function decksForTerm(terms: CardTermMap, term: string): number[] {
  return terms.get(normalizeForMatch(term)) ?? []
}

/**
 * Finds every card front spoken in the transcript, preferring the longest
 * phrase at each point and never overlapping two matches.
 */
export function matchCardsInWords(words: DisplayWord[], terms: CardTermMap): CardMatch[] {
  if (terms.size === 0) return []

  const max_chars = maxKeyLength(terms)
  const matches: CardMatch[] = []

  let i = 0
  while (i < words.length) {
    const hit = longestMatchFrom(words, i, terms, max_chars)
    if (!hit) {
      i++
      continue
    }
    matches.push({
      lo: words[i].index,
      hi: words[hit.end].index,
      term: hit.term,
      deck_ids: hit.deck_ids
    })
    i = hit.end + 1
  }

  return matches
}

/**
 * Indexes matches by each word they cover, so a tapped word can name its match
 * without searching.
 */
export function matchesByWord(matches: CardMatch[]): Map<number, CardMatch> {
  const map = new Map<number, CardMatch>()
  for (const match of matches) {
    for (let i = match.lo; i <= match.hi; i++) map.set(i, match)
  }
  return map
}

/**
 * Reduces a card front or a run of spoken words to the form the two are
 * compared in. Both sides must come through here, or casing and stray
 * punctuation block matches that should land. Punctuation alone yields `''`.
 */
export function normalizeForMatch(text: string): string {
  return cleanTerm(text).replace(/\s+/g, ' ').toLowerCase()
}

function unionDecks(a: number[], b: number[]): number[] {
  return [...new Set([...a, ...b])]
}

function maxKeyLength(terms: CardTermMap): number {
  let max = 0
  for (const key of terms.keys()) max = Math.max(max, key.length)
  return max
}

// Grows the span a word at a time, keeping the longest that names a card.
function longestMatchFrom(
  words: DisplayWord[],
  start: number,
  terms: CardTermMap,
  max_chars: number
): { end: number; term: string; deck_ids: number[] } | null {
  const end_cap = Math.min(words.length, start + MAX_SPAN_WORDS)
  let acc = ''
  let best: { end: number; term: string; deck_ids: number[] } | null = null

  for (let j = start; j < end_cap; j++) {
    acc += words[j].display
    const key = normalizeForMatch(acc)
    if (key.length > max_chars) break
    const deck_ids = terms.get(key)
    if (!deck_ids) continue
    best = { end: j, term: key, deck_ids }
  }

  return best
}
