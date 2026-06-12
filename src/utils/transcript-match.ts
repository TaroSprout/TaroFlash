import type { CardIndexEntry } from '@/api/cards'
import { cleanTerm, type DisplayWord } from '@/utils/transcript'

// A run of transcript words whose joined text matches a card front. `lo`/`hi`
// are global word indices (the same space as WordRange), so a match drops
// straight into the selection machinery. `deck_ids` are the decks already
// holding this term, which drive the term panel's add-button state. `theme` /
// `theme_dark` colour the highlight after the reader joins the owning deck's
// cover — the matcher itself leaves them unset.
export type CardMatch = {
  lo: number
  hi: number
  term: string
  deck_ids: number[]
  theme?: Theme
  theme_dark?: Theme
}

// Normalized card front → the decks holding it. Built once per index, then
// shared by the matcher, the per-word lookup, and term→deck queries.
export type CardTermMap = Map<string, number[]>

// No real card front spans more words than this, so the inner scan never grows a
// candidate span unbounded — a safety cap on the worst case, not a content rule.
const MAX_SPAN_WORDS = 16

/**
 * Collapse the raw index to normalized-term → decks, merging case/punctuation
 * variants ("Cat" + "cat") into one entry so every consumer keys off one form.
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
 * Find every card front that appears verbatim as a run of transcript words,
 * resolved leftmost-longest and non-overlapping. Word-spans and the map's keys
 * are normalized the same way (see `normalizeForMatch`) so casing and
 * surrounding punctuation never block a match.
 *
 * @example
 * const matches = matchCardsInWords(flatWords, buildCardTermMap(cardIndex))
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
 * Index matches by every word they cover, so a word component (or a tap handler)
 * can resolve "is this word in a match, and which one" in O(1).
 */
export function matchesByWord(matches: CardMatch[]): Map<number, CardMatch> {
  const map = new Map<number, CardMatch>()
  for (const match of matches) {
    for (let i = match.lo; i <= match.hi; i++) map.set(i, match)
  }
  return map
}

/**
 * Reduce a card front or a joined word-span to its comparable form: surrounding
 * punctuation stripped (matching `cleanTerm`), inner whitespace collapsed, and
 * case folded. Returns '' for punctuation-only input.
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

// From word `start`, grow the span one word at a time and keep the longest span
// whose normalized text is a known term. Stops once the span outgrows the
// longest term (no longer one can match) or hits the span-word cap.
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
