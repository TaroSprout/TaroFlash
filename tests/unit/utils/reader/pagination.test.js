import { describe, test, expect } from 'vite-plus/test'
import { computePagination, foldAnchored, pageIndexOfWord } from '@/utils/reader/pagination'

function word(index, paragraph_index, top, bottom) {
  return { index, paragraph_index, top, bottom }
}

describe('computePagination', () => {
  test('single-page mode cuts once the running footprint exceeds the page budget', () => {
    const words = [
      word(10, 0, 0, 18),
      word(11, 0, 20, 38),
      word(12, 0, 40, 58),
      word(13, 0, 60, 78),
      word(14, 0, 80, 98),
      word(15, 0, 100, 118),
      word(16, 0, 120, 138)
    ]

    const result = computePagination({
      words,
      split_mode: false,
      two_page: false,
      reduced_height: 100,
      full_height: 999,
      bandHeightOf: () => 0,
      split_cap: 0
    })

    expect(result.cuts).toEqual([5])
    expect(result.footprints).toEqual([0, 0])
    expect(pageIndexOfWord(result.word_page, 14)).toBe(0)
    expect(pageIndexOfWord(result.word_page, 15)).toBe(1)
    expect(pageIndexOfWord(result.word_page, 16)).toBe(1)
  })

  test('two-page mode respects the injected band reservation and the primary/secondary budgets', () => {
    const words = [
      word(0, 0, 0, 10),
      word(1, 0, 10, 20),
      word(2, 0, 20, 30),
      word(3, 0, 30, 40),
      word(4, 1, 40, 50),
      word(5, 1, 50, 70),
      word(6, 1, 70, 200)
    ]

    const bandHeightOf = (paragraph_index) => (paragraph_index === 0 ? 20 : 5)

    const result = computePagination({
      words,
      split_mode: true,
      two_page: true,
      reduced_height: 60,
      full_height: 120,
      bandHeightOf,
      split_cap: 15
    })

    expect(result.cuts).toEqual([4, 6])
    expect(result.footprints).toEqual([15, 0, 5])
    expect(pageIndexOfWord(result.word_page, 3)).toBe(0)
    expect(pageIndexOfWord(result.word_page, 4)).toBe(1)
    expect(pageIndexOfWord(result.word_page, 5)).toBe(1)
    expect(pageIndexOfWord(result.word_page, 6)).toBe(2)
  })

  test('an unmeasured word index is a miss — page -1', () => {
    const result = computePagination({
      words: [word(0, 0, 0, 10)],
      split_mode: false,
      two_page: false,
      reduced_height: 100,
      full_height: 100,
      bandHeightOf: () => 0,
      split_cap: 0
    })

    expect(pageIndexOfWord(result.word_page, 999)).toBe(-1)
  })
})

function paginationInput(overrides = {}) {
  return {
    words: [],
    split_mode: false,
    two_page: false,
    reduced_height: 100,
    full_height: 999,
    bandHeightOf: () => 0,
    split_cap: 0,
    ...overrides
  }
}

describe('foldAnchored', () => {
  test('is empty for an empty word list', () => {
    const result = foldAnchored({ ...paginationInput(), anchor_word: 0 })

    expect(result).toEqual({ pages: [], footprints: [], word_page: new Map(), anchor_page: 0 })
  })

  test('single-page spread has parity with computePagination when the anchor is the first word', () => {
    const words = [
      word(10, 0, 0, 18),
      word(11, 0, 20, 38),
      word(12, 0, 40, 58),
      word(13, 0, 60, 78),
      word(14, 0, 80, 98),
      word(15, 0, 100, 118),
      word(16, 0, 120, 138)
    ]

    const input = paginationInput({ words, reduced_height: 100 })
    const flat = computePagination(input)
    const anchored = foldAnchored({ ...input, anchor_word: 10 })

    expect(anchored.anchor_page).toBe(0)
    expect(anchored.footprints).toEqual(flat.footprints)
    for (const w of words) {
      expect(pageIndexOfWord(anchored.word_page, w.index)).toBe(
        pageIndexOfWord(flat.word_page, w.index)
      )
    }
  })

  test('two-page spread has parity with computePagination when the anchor is the first word', () => {
    const words = [
      word(0, 0, 0, 10),
      word(1, 0, 10, 20),
      word(2, 0, 20, 30),
      word(3, 0, 30, 40),
      word(4, 1, 40, 50),
      word(5, 1, 50, 70),
      word(6, 1, 70, 200)
    ]

    const bandHeightOf = (paragraph_index) => (paragraph_index === 0 ? 20 : 5)

    const input = paginationInput({
      words,
      split_mode: true,
      two_page: true,
      reduced_height: 60,
      full_height: 120,
      bandHeightOf,
      split_cap: 15
    })
    const flat = computePagination(input)
    const anchored = foldAnchored({ ...input, anchor_word: 0 })

    expect(anchored.anchor_page).toBe(0)
    expect(anchored.footprints).toEqual(flat.footprints)
    for (const w of words) {
      expect(pageIndexOfWord(anchored.word_page, w.index)).toBe(
        pageIndexOfWord(flat.word_page, w.index)
      )
    }
  })

  test('the anchor page word range is invariant to earlier pages being added ahead of it', () => {
    const words = [
      word(10, 0, 0, 18),
      word(11, 0, 20, 38),
      word(12, 0, 40, 58),
      word(13, 0, 60, 78)
    ]

    const input = paginationInput({ words, reduced_height: 40 })

    const withoutEarlier = foldAnchored({ ...input, anchor_word: 12 })
    const anchorRangeWithout = withoutEarlier.pages[withoutEarlier.anchor_page]

    const earlierWords = [word(8, 0, -40, -22), word(9, 0, -20, -2), ...words]
    const withEarlier = foldAnchored({ ...input, words: earlierWords, anchor_word: 12 })
    const anchorRangeWith = withEarlier.pages[withEarlier.anchor_page]

    expect(anchorRangeWith.start - anchorRangeWithout.start).not.toBe(0)
    expect(pageIndexOfWord(withEarlier.word_page, 12)).toBe(withEarlier.anchor_page)
    expect(anchorRangeWith.end - anchorRangeWith.start).toBe(
      anchorRangeWithout.end - anchorRangeWithout.start
    )
  })

  test('a two-page layout with an odd backward-count pads a blank leading page', () => {
    const words = [word(0, 0, 0, 18), word(1, 0, 20, 38), word(2, 0, 40, 58), word(3, 0, 60, 78)]

    const input = paginationInput({ words, two_page: true, reduced_height: 20, full_height: 20 })
    const result = foldAnchored({ ...input, anchor_word: 3 })

    expect(result.pages[0]).toMatchObject({ empty: true, start: 0, end: 0 })
  })
})
