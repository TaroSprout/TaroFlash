export type MeasuredWord = {
  index: number
  paragraph_index: number
  top: number
  bottom: number
}

export type PaginationInput = {
  words: MeasuredWord[]
  split_mode: boolean
  two_page: boolean
  reduced_height: number
  full_height: number
  bandHeightOf: (paragraph_index: number) => number
  split_cap: number
}

export type PaginationResult = {
  cuts: number[]
  footprints: number[]
  word_page: Map<number, number>
}

export function computePagination(input: PaginationInput): PaginationResult {
  const { words, split_mode, two_page, reduced_height, full_height, bandHeightOf, split_cap } =
    input

  const isPrimary = (page: number) => !two_page || page % 2 === 0
  const baseBudget = (page: number) => (isPrimary(page) ? reduced_height : full_height)
  const bandFor = (page: number, paragraph_index: number) => {
    if (!split_mode || !isPrimary(page)) return 0

    const band_height = bandHeightOf(paragraph_index)
    return Math.min(split_cap, band_height)
  }

  const cuts: number[] = []
  const footprints: number[] = []
  const word_page = new Map<number, number>()

  let page_top = 0
  let page_index = 0
  let page_band = 0

  words.forEach((word, i) => {
    const { top, bottom, paragraph_index } = word

    const band = bandFor(page_index, paragraph_index)
    const prospective = Math.max(page_band, band)
    const budget = baseBudget(page_index) - prospective

    if (i > 0 && bottom - page_top > budget) {
      footprints[page_index] = page_band
      cuts.push(i)
      page_top = top
      page_index++
      page_band = bandFor(page_index, paragraph_index)
    } else {
      page_band = prospective
    }

    word_page.set(word.index, page_index)
  })

  footprints[page_index] = page_band

  return { cuts, footprints, word_page }
}

export function pageIndexOfWord(word_page: Map<number, number>, word_index: number): number {
  return word_page.get(word_index) ?? 0
}
