import { describe, test, expect } from 'vite-plus/test'
import {
  normalizeForMatch,
  buildCardTermMap,
  decksForTerm,
  matchCardsInWords,
  matchesByWord
} from '@/utils/transcript-match'

// ── Helpers ───────────────────────────────────────────────────────────────────

// Build a DisplayWord whose .index differs from its array position so tests
// exercise global-index vs array-position separately.
function word(display, index) {
  return { display, index }
}

function entry(term, deck_ids) {
  return { term, deck_ids }
}

// ── normalizeForMatch [obligation] ────────────────────────────────────────────

describe('normalizeForMatch [obligation]', () => {
  test('lowercases the input', () => {
    expect(normalizeForMatch('Hello')).toBe('hello')
    expect(normalizeForMatch('WORLD')).toBe('world')
  })

  test('strips leading and trailing punctuation (cleanTerm behaviour)', () => {
    expect(normalizeForMatch('world. ')).toBe('world')
    expect(normalizeForMatch('"Hello"')).toBe('hello')
    expect(normalizeForMatch('you?')).toBe('you')
  })

  test('collapses inner whitespace to a single space — does NOT drop it [obligation]', () => {
    // "good morning" with two spaces collapses to one
    expect(normalizeForMatch('good  morning')).toBe('good morning')
    // A plain two-word term stays as two words separated by one space
    expect(normalizeForMatch('new york')).toBe('new york')
  })

  test('strips CJK surrounding punctuation', () => {
    expect(normalizeForMatch('你好，')).toBe('你好')
    expect(normalizeForMatch('吗？')).toBe('吗')
  })

  test('keeps INTERNAL punctuation intact [obligation]', () => {
    // The comma is internal to the term — cleanTerm only strips edges
    expect(normalizeForMatch('说,真')).toBe('说,真')
    // Hyphen inside a word
    expect(normalizeForMatch("don't")).toBe("don't")
    expect(normalizeForMatch('well-being,')).toBe('well-being')
  })

  test('returns "" for punctuation-only input [obligation]', () => {
    expect(normalizeForMatch('…')).toBe('')
    expect(normalizeForMatch('  ')).toBe('')
    expect(normalizeForMatch('.')).toBe('')
  })

  test('internal comma is KEPT so "说,真" does NOT equal a "说" card [obligation]', () => {
    // "说,真" normalises to "说,真", not "说" — the comma is internal, not edge
    const normalised = normalizeForMatch('说,真')
    expect(normalised).not.toBe('说')
    expect(normalised).toBe('说,真')
  })
})

// ── buildCardTermMap [obligation] ─────────────────────────────────────────────

describe('buildCardTermMap [obligation]', () => {
  test('maps each term to its deck_ids', () => {
    const map = buildCardTermMap([entry('Cat', [1]), entry('dog', [2])])
    expect(map.get('cat')).toEqual([1])
    expect(map.get('dog')).toEqual([2])
  })

  test('merges deck_ids across case/punctuation variants ("Cat"→[1] + "cat"→[2] → "cat"→[1,2]) [obligation]', () => {
    const map = buildCardTermMap([entry('Cat', [1]), entry('cat', [2])])
    const ids = map.get('cat')
    expect(ids).toContain(1)
    expect(ids).toContain(2)
    expect(ids).toHaveLength(2)
  })

  test('merges deck_ids across punctuation variants', () => {
    const map = buildCardTermMap([entry('Hello,', [3]), entry('hello', [4])])
    const ids = map.get('hello')
    expect(ids).toContain(3)
    expect(ids).toContain(4)
  })

  test('skips blank/punctuation-only fronts [obligation]', () => {
    const map = buildCardTermMap([entry('', [1]), entry('…', [2]), entry('cat', [3])])
    // Only 'cat' should be in the map — blank/punct fronts are skipped
    expect(map.size).toBe(1)
    expect(map.has('cat')).toBe(true)
  })

  test('dedups deck_ids when merging so no id appears twice', () => {
    const map = buildCardTermMap([entry('cat', [1, 2]), entry('Cat', [2, 3])])
    const ids = map.get('cat')
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
    expect(ids).toContain(1)
    expect(ids).toContain(2)
    expect(ids).toContain(3)
  })

  test('returns an empty map for an empty index', () => {
    expect(buildCardTermMap([])).toEqual(new Map())
  })
})

// ── decksForTerm [obligation] ─────────────────────────────────────────────────

describe('decksForTerm [obligation]', () => {
  test('returns deck_ids for a known term (case-insensitive lookup)', () => {
    const map = buildCardTermMap([entry('Cat', [1])])
    expect(decksForTerm(map, 'cat')).toEqual([1])
    expect(decksForTerm(map, 'Cat')).toEqual([1])
    expect(decksForTerm(map, 'CAT')).toEqual([1])
  })

  test('returns [] for an unknown term [obligation]', () => {
    const map = buildCardTermMap([entry('cat', [1])])
    expect(decksForTerm(map, 'dog')).toEqual([])
  })

  test('returns [] when the map is empty', () => {
    expect(decksForTerm(new Map(), 'anything')).toEqual([])
  })
})

// ── matchCardsInWords [obligation] ────────────────────────────────────────────

describe('matchCardsInWords [obligation]', () => {
  test('returns [] when terms map is empty', () => {
    const words = [word('cat ', 0), word('dog ', 1)]
    expect(matchCardsInWords(words, new Map())).toEqual([])
  })

  test('single-word exact match — lo and hi are the global word .index, not array position [obligation]', () => {
    // Words start at index 10 to prove global index is used, not array pos
    const words = [word('cat ', 10), word('dog ', 11)]
    const map = buildCardTermMap([entry('cat', [1])])
    const matches = matchCardsInWords(words, map)
    expect(matches).toHaveLength(1)
    expect(matches[0].lo).toBe(10)
    expect(matches[0].hi).toBe(10)
    expect(matches[0].deck_ids).toEqual([1])
  })

  test('multi-word match — "new york" card matches the two-word span [obligation]', () => {
    const words = [word('good ', 5), word('morning ', 6)]
    const map = buildCardTermMap([entry('good morning', [2])])
    const matches = matchCardsInWords(words, map)
    expect(matches).toHaveLength(1)
    expect(matches[0].lo).toBe(5)
    expect(matches[0].hi).toBe(6)
    expect(matches[0].term).toBe('good morning')
  })

  test('leftmost-longest wins — "new york" beats "new" when both are cards [obligation]', () => {
    // 'new' at index 20, 'york' at index 21; with cards for both 'new' and 'new york',
    // the longer 'new york' span should win.
    const words = [word('new ', 20), word('york ', 21), word('city ', 22)]
    const map = buildCardTermMap([entry('new', [1]), entry('new york', [2])])
    const matches = matchCardsInWords(words, map)
    expect(matches).toHaveLength(1)
    expect(matches[0].lo).toBe(20)
    expect(matches[0].hi).toBe(21)
    expect(matches[0].deck_ids).toEqual([2])
    // 'city' is not matched
    expect(matches[0].hi).toBe(21)
  })

  test('non-overlapping — words consumed by a match are not re-used [obligation]', () => {
    // 'new york' is consumed; the next match starts at 'city'
    const words = [word('new ', 20), word('york ', 21), word('city ', 22)]
    const map = buildCardTermMap([entry('new york', [1]), entry('city', [2])])
    const matches = matchCardsInWords(words, map)
    expect(matches).toHaveLength(2)
    expect(matches[0].lo).toBe(20)
    expect(matches[0].hi).toBe(21)
    expect(matches[1].lo).toBe(22)
    expect(matches[1].hi).toBe(22)
  })

  test('EXACT word-span equality — substring-only match is NOT a hit [obligation]', () => {
    // 'cat' is a card but 'catfish' should not match even if it contains 'cat'
    const words = [word('catfish ', 0)]
    const map = buildCardTermMap([entry('cat', [1])])
    const matches = matchCardsInWords(words, map)
    expect(matches).toHaveLength(0)
  })

  test('punctuation on the edge of a word does not block matching', () => {
    // display = 'good, ' — normalise strips leading/trailing punct, so 'good' still matches
    const words = [word('good, ', 0)]
    const map = buildCardTermMap([entry('good', [3])])
    const matches = matchCardsInWords(words, map)
    expect(matches).toHaveLength(1)
    expect(matches[0].lo).toBe(0)
  })

  test('multi-word phrase: "good" + "morning" (separate words) matches "good morning" card', () => {
    // display words are 'good ' and 'morning' — joined they normalize to 'good morning'
    const words = [word('good ', 0), word('morning', 1)]
    const map = buildCardTermMap([entry('good morning', [7])])
    const matches = matchCardsInWords(words, map)
    expect(matches).toHaveLength(1)
    expect(matches[0].lo).toBe(0)
    expect(matches[0].hi).toBe(1)
  })

  test('no match when words do not form any card front', () => {
    const words = [word('the ', 0), word('quick ', 1), word('fox', 2)]
    const map = buildCardTermMap([entry('cat', [1])])
    expect(matchCardsInWords(words, map)).toEqual([])
  })

  test('returns the term in its normalised form on the match object', () => {
    const words = [word('Cat ', 0)]
    const map = buildCardTermMap([entry('cat', [1])])
    const [m] = matchCardsInWords(words, map)
    expect(m.term).toBe('cat')
  })

  test('deck_ids on the match reflect the map lookup (not the raw entry)', () => {
    const words = [word('Cat ', 5)]
    const map = buildCardTermMap([entry('Cat', [1]), entry('cat', [2])])
    const [m] = matchCardsInWords(words, map)
    expect(m.deck_ids).toContain(1)
    expect(m.deck_ids).toContain(2)
  })
})

// ── matchesByWord [obligation] ────────────────────────────────────────────────

describe('matchesByWord [obligation]', () => {
  test('maps EVERY index in [lo, hi] to the same match object [obligation]', () => {
    const match = { lo: 10, hi: 12, term: 'new york city', deck_ids: [1] }
    const byWord = matchesByWord([match])
    expect(byWord.get(10)).toBe(match)
    expect(byWord.get(11)).toBe(match)
    expect(byWord.get(12)).toBe(match)
  })

  test('uses the global word .index values (lo/hi), not array positions [obligation]', () => {
    // lo=10, hi=10 — index 10 should be in the map; adjacent indices 9/11 should not
    const match = { lo: 10, hi: 10, term: 'cat', deck_ids: [1] }
    const byWord = matchesByWord([match])
    expect(byWord.has(10)).toBe(true)
    expect(byWord.has(9)).toBe(false)
    expect(byWord.has(11)).toBe(false)
  })

  test('handles multiple non-overlapping matches', () => {
    const m1 = { lo: 0, hi: 1, term: 'new york', deck_ids: [1] }
    const m2 = { lo: 5, hi: 5, term: 'cat', deck_ids: [2] }
    const byWord = matchesByWord([m1, m2])
    expect(byWord.get(0)).toBe(m1)
    expect(byWord.get(1)).toBe(m1)
    expect(byWord.get(5)).toBe(m2)
    // Gaps are absent
    expect(byWord.has(2)).toBe(false)
    expect(byWord.has(4)).toBe(false)
  })

  test('returns an empty map for no matches', () => {
    expect(matchesByWord([])).toEqual(new Map())
  })
})
