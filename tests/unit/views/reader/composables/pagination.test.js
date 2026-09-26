import { describe, test, expect } from 'vite-plus/test'
import { ref } from 'vue'
import { usePagination } from '@/views/reader/composables/pagination'

function word(index, paragraph_index, top, bottom) {
  return { index, paragraph_index, top, bottom }
}

function paginationOptions(overrides = {}) {
  return {
    words: ref([]),
    anchor_word: ref(0),
    bandHeightOf: () => 0,
    split_mode: ref(false),
    two_page: ref(false),
    reduced_height: ref(100),
    full_height: ref(100),
    split_cap: ref(0),
    ...overrides
  }
}

describe('usePagination', () => {
  test('is empty when there are no measured words', () => {
    const { pages, page_count, pageFootprints } = usePagination(paginationOptions())

    expect(pages.value).toEqual([])
    expect(page_count.value).toBe(0)
    expect(pageFootprints.value).toEqual([])
  })

  test('the pagination table is empty when full_height is not positive', () => {
    const words = ref([word(0, 0, 0, 10)])

    const { pages, page_count, pageFootprints } = usePagination(
      paginationOptions({ words, full_height: ref(0) })
    )

    expect(pages.value).toEqual([])
    expect(page_count.value).toBe(0)
    expect(pageFootprints.value).toEqual([])
  })

  test('derives page ranges with the first/last word index per page', () => {
    const words = ref([
      word(10, 0, 0, 18),
      word(11, 0, 20, 38),
      word(12, 0, 40, 58),
      word(13, 0, 60, 78),
      word(14, 0, 80, 98),
      word(15, 0, 100, 118)
    ])

    const { pages, page_count, pageFootprints } = usePagination(
      paginationOptions({ words, anchor_word: ref(10), full_height: ref(999) })
    )

    expect(page_count.value).toBe(2)
    expect(pages.value).toEqual([
      { index: 0, word_start_index: 10, word_end_index: 14, footprint: 0, empty: false },
      { index: 1, word_start_index: 15, word_end_index: 15, footprint: 0, empty: false }
    ])
    expect(pageFootprints.value).toEqual([0, 0])
  })

  test('anchor_page reports which page the fold assigned as the resume page', () => {
    const words = ref([
      word(0, 0, 0, 10),
      word(1, 0, 10, 20),
      word(2, 0, 20, 30),
      word(3, 0, 30, 40)
    ])

    const { anchor_page } = usePagination(
      paginationOptions({
        words,
        anchor_word: ref(2),
        reduced_height: ref(15),
        full_height: ref(15)
      })
    )

    expect(anchor_page.value).toBe(2)
  })

  test('pageIndexOfWord looks up the page a word landed on', () => {
    const words = ref([
      word(0, 0, 0, 10),
      word(1, 0, 10, 20),
      word(2, 0, 20, 30),
      word(3, 0, 30, 40),
      word(4, 0, 40, 50),
      word(5, 0, 50, 60)
    ])

    const { pageIndexOfWord } = usePagination(
      paginationOptions({ words, reduced_height: ref(35), full_height: ref(35) })
    )

    expect(pageIndexOfWord(0)).toBe(0)
    expect(pageIndexOfWord(4)).toBe(1)
  })

  test('an unmeasured word index is a miss — page -1', () => {
    const { pageIndexOfWord } = usePagination(
      paginationOptions({ words: ref([word(0, 0, 0, 10)]) })
    )

    expect(pageIndexOfWord(999)).toBe(-1)
  })

  test('reacts to a change in the words ref', () => {
    const words = ref([word(0, 0, 0, 10)])

    const { page_count } = usePagination(paginationOptions({ words }))

    expect(page_count.value).toBe(1)

    words.value = []

    expect(page_count.value).toBe(0)
  })
})
