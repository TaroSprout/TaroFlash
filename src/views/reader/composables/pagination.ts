import { computed, toValue } from 'vue'
import type { ComputedRef, MaybeRefOrGetter } from 'vue'
import type { MeasuredWord } from '@/utils/reader/pagination'
import { foldAnchored, pageIndexOfWord as pageIndexIn } from '@/utils/reader/pagination'

export type PaginationOptions = {
  words: MaybeRefOrGetter<MeasuredWord[]>
  anchor_word: MaybeRefOrGetter<number>
  bandHeightOf: (paragraph_index: number) => number
  split_mode: MaybeRefOrGetter<boolean>
  two_page: MaybeRefOrGetter<boolean>
  reduced_height: MaybeRefOrGetter<number>
  full_height: MaybeRefOrGetter<number>
  split_cap: MaybeRefOrGetter<number>
}

export type ReaderPage = {
  index: number
  word_start_index: number
  word_end_index: number
  footprint: number
  empty: boolean
}

export type Pagination = {
  pages: ComputedRef<ReaderPage[]>
  page_count: ComputedRef<number>
  anchor_page: ComputedRef<number>
  pageFootprints: ComputedRef<number[]>
  pageIndexOfWord: (word_index: number) => number
}

export function usePagination(options: PaginationOptions): Pagination {
  const {
    words,
    anchor_word,
    bandHeightOf,
    split_mode,
    two_page,
    reduced_height,
    full_height,
    split_cap
  } = options

  const table = computed(() => {
    const measured = toValue(words)

    if (measured.length === 0 || toValue(full_height) <= 0) {
      return { pages: [], footprints: [], word_page: new Map<number, number>(), anchor_page: 0 }
    }

    return foldAnchored({
      words: measured,
      anchor_word: toValue(anchor_word),
      split_mode: toValue(split_mode),
      two_page: toValue(two_page),
      reduced_height: toValue(reduced_height),
      full_height: toValue(full_height),
      bandHeightOf,
      split_cap: toValue(split_cap)
    })
  })

  const pages = computed<ReaderPage[]>(() => {
    const measured = toValue(words)

    return table.value.pages.map((range, index) => ({
      index,
      word_start_index: range.empty ? 0 : measured[range.start].index,
      word_end_index: range.empty ? -1 : measured[range.end - 1].index,
      footprint: range.footprint,
      empty: range.empty
    }))
  })

  const page_count = computed(() => pages.value.length)
  const anchor_page = computed(() => table.value.anchor_page)
  const pageFootprints = computed(() => table.value.footprints)

  function pageIndexOfWord(word_index: number): number {
    return pageIndexIn(table.value.word_page, word_index)
  }

  return { pages, page_count, anchor_page, pageFootprints, pageIndexOfWord }
}
