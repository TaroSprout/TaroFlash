import { describe, test, expect } from 'vite-plus/test'
import { computePagination, pageIndexOfWord } from '@/utils/reader/pagination'

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

  test('an unmeasured word index falls back to page 0', () => {
    const result = computePagination({
      words: [word(0, 0, 0, 10)],
      split_mode: false,
      two_page: false,
      reduced_height: 100,
      full_height: 100,
      bandHeightOf: () => 0,
      split_cap: 0
    })

    expect(pageIndexOfWord(result.word_page, 999)).toBe(0)
  })
})
