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

export type AnchoredPaginationInput = PaginationInput & {
  anchor_word: number
}

export type PageRange = {
  start: number
  end: number
  footprint: number
  empty: boolean
}

export type PaginationResult = {
  cuts: number[]
  footprints: number[]
  word_page: Map<number, number>
}

export type AnchoredPaginationResult = {
  pages: PageRange[]
  footprints: number[]
  word_page: Map<number, number>
  anchor_page: number
}

type Budgets = {
  bandFor: (primary: boolean, paragraph_index: number) => number
  baseBudget: (primary: boolean) => number
}

function budgetsOf(input: PaginationInput): Budgets {
  const { split_mode, reduced_height, full_height, bandHeightOf, split_cap } = input

  const bandFor = (primary: boolean, paragraph_index: number) => {
    if (!split_mode || !primary) return 0
    return Math.min(split_cap, bandHeightOf(paragraph_index))
  }

  const baseBudget = (primary: boolean) => (primary ? reduced_height : full_height)

  return { bandFor, baseBudget }
}

// Walk forward from `from`, closing a page each time the next word overflows the
// running budget. `primaryAt` reports whether the page at a given zero-based
// offset within this walk is a primary (dock-bearing) page.
function walkForward(
  input: PaginationInput,
  from: number,
  primaryAt: (offset: number) => boolean
): PageRange[] {
  const { words } = input
  const { bandFor, baseBudget } = budgetsOf(input)

  const pages: PageRange[] = []

  let start = from
  let offset = 0
  let primary = primaryAt(0)
  let page_top = words[from].top
  let page_band = bandFor(primary, words[from].paragraph_index)

  for (let i = from; i < words.length; i++) {
    const word = words[i]
    const band = bandFor(primary, word.paragraph_index)
    const prospective = Math.max(page_band, band)
    const budget = baseBudget(primary) - prospective

    if (i > start && word.bottom - page_top > budget) {
      pages.push({ start, end: i, footprint: page_band, empty: false })
      offset += 1
      start = i
      primary = primaryAt(offset)
      page_top = word.top
      page_band = bandFor(primary, word.paragraph_index)
    } else {
      page_band = prospective
    }
  }

  pages.push({ start, end: words.length, footprint: page_band, empty: false })

  return pages
}

// Fill one page upward from `last`, taking earlier words while the page fits its
// parity's budget. Returns the page's start position and reserved band height.
function packBackwardPage(
  input: PaginationInput,
  budgets: Budgets,
  last: number,
  primary: boolean
): { start: number; band: number } {
  const { words } = input
  const page_bottom = words[last].bottom

  let start = last
  let band = budgets.bandFor(primary, words[last].paragraph_index)

  for (let j = last - 1; j >= 0; j--) {
    const candidate = Math.max(band, budgets.bandFor(primary, words[j].paragraph_index))
    if (page_bottom - words[j].top > budgets.baseBudget(primary) - candidate) break

    start = j
    band = candidate
  }

  return { start, band }
}

// Pack the words before `before` into pages from the bottom up, nearest page to
// the anchor first. `primaryAt` reports parity by distance from the anchor (1 is
// the page immediately before it). Returns the pages in ascending reading order.
function walkBackward(
  input: PaginationInput,
  before: number,
  primaryAt: (distance: number) => boolean
): PageRange[] {
  const budgets = budgetsOf(input)

  const reversed: PageRange[] = []

  let end = before
  let distance = 1

  while (end > 0) {
    const primary = primaryAt(distance)
    const { start, band } = packBackwardPage(input, budgets, end - 1, primary)

    reversed.push({ start, end, footprint: band, empty: false })
    end = start
    distance += 1
  }

  return reversed.reverse()
}

function anchorPosition(words: MeasuredWord[], anchor_word: number): number {
  if (words.length === 0) return 0

  const found = words.findIndex((w) => w.index >= anchor_word)
  if (found < 0) return 0

  return found
}

function indexPages(
  words: MeasuredWord[],
  pages: PageRange[]
): { footprints: number[]; word_page: Map<number, number> } {
  const footprints: number[] = []
  const word_page = new Map<number, number>()

  pages.forEach((page, page_index) => {
    footprints[page_index] = page.footprint

    for (let i = page.start; i < page.end; i++) {
      word_page.set(words[i].index, page_index)
    }
  })

  return { footprints, word_page }
}

// Assemble pages outward from the reading position rather than front-to-back:
// the anchor word begins a fresh primary page (the resume page), pages fill
// forward against the height budget, and earlier pages pack backward. The anchor
// page keeps a fixed primary parity so its budget — and therefore its word range
// — never shifts as earlier pages arrive, which is what lets the strip reveal it
// once and never reflow it. In two-page mode an odd backward count pads a blank
// leading page so the anchor still renders as a left page.
export function foldAnchored(input: AnchoredPaginationInput): AnchoredPaginationResult {
  const { words, two_page, anchor_word } = input

  if (words.length === 0) {
    return { pages: [], footprints: [], word_page: new Map(), anchor_page: 0 }
  }

  const anchor = anchorPosition(words, anchor_word)

  const forward = walkForward(input, anchor, (offset) => !two_page || offset % 2 === 0)
  const backward = walkBackward(input, anchor, (distance) => !two_page || distance % 2 === 0)

  const pages = [...backward, ...forward]
  let anchor_page = backward.length

  if (two_page && backward.length % 2 === 1) {
    pages.unshift({ start: 0, end: 0, footprint: 0, empty: true })
    anchor_page += 1
  }

  const { footprints, word_page } = indexPages(words, pages)

  return { pages, footprints, word_page, anchor_page }
}

export function computePagination(input: PaginationInput): PaginationResult {
  const { words, two_page } = input

  if (words.length === 0) {
    return { cuts: [], footprints: [], word_page: new Map() }
  }

  const pages = walkForward(input, 0, (offset) => !two_page || offset % 2 === 0)

  const cuts = pages.slice(1).map((page) => page.start)
  const { footprints, word_page } = indexPages(words, pages)

  return { cuts, footprints, word_page }
}

export function pageIndexOfWord(word_page: Map<number, number>, word_index: number): number {
  return word_page.get(word_index) ?? -1
}
