import { computed, toValue } from 'vue'
import type { ComputedRef, MaybeRefOrGetter } from 'vue'
import type { MeasuredWord } from '@/utils/reader/pagination'
import { computePagination, pageIndexOfWord as pageIndexIn } from '@/utils/reader/pagination'

export type PaginationOptions = {
  words: MaybeRefOrGetter<MeasuredWord[]>
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
}

export type Pagination = {
  pages: ComputedRef<ReaderPage[]>
  page_count: ComputedRef<number>
  pageFootprints: ComputedRef<number[]>
  pageIndexOfWord: (word_index: number) => number
}

export function usePagination(options: PaginationOptions): Pagination {
  const { words, bandHeightOf, split_mode, two_page, reduced_height, full_height, split_cap } =
    options

  const table = computed(() => {
    const measured = toValue(words)

    if (measured.length === 0 || toValue(full_height) <= 0) {
      return { cuts: [], footprints: [], word_page: new Map<number, number>() }
    }

    return computePagination({
      words: measured,
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

    if (measured.length === 0 || toValue(full_height) <= 0) return []

    const { cuts, footprints } = table.value

    return pageRanges(cuts, measured.length).map((range, index) => ({
      index,
      word_start_index: measured[range.start].index,
      word_end_index: measured[range.end - 1].index,
      footprint: footprints[index] ?? 0
    }))
  })

  const page_count = computed(() => pages.value.length)
  const pageFootprints = computed(() => table.value.footprints)

  function pageIndexOfWord(word_index: number): number {
    return pageIndexIn(table.value.word_page, word_index)
  }

  return { pages, page_count, pageFootprints, pageIndexOfWord }
}

function pageRanges(cuts: number[], length: number): { start: number; end: number }[] {
  if (length === 0) return []

  const bounds = [0, ...cuts, length]
  const ranges: { start: number; end: number }[] = []

  for (let i = 0; i < bounds.length - 1; i++) {
    ranges.push({ start: bounds[i], end: bounds[i + 1] })
  }

  return ranges
}
