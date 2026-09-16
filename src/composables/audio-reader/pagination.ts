import { onBeforeUnmount, onMounted, ref, toValue, watch } from 'vue'
import type { MaybeRefOrGetter, Ref, ShallowRef } from 'vue'
import type { DisplayWord, SentenceWords } from '@/utils/transcript'

export type PageSlice = {
  paragraph_index: number
  words: DisplayWord[]
  translation?: string
  is_start: boolean
  show_gloss: boolean
}

export type Page = PageSlice[]

export type PaginationOptions = {
  measure_host: Readonly<ShallowRef<HTMLElement | null>>
  paragraphs: MaybeRefOrGetter<SentenceWords[]>
  gloss_mode: MaybeRefOrGetter<boolean>
  split_mode: MaybeRefOrGetter<boolean>
  two_page: MaybeRefOrGetter<boolean>
  reduced_height: MaybeRefOrGetter<number>
  full_height: MaybeRefOrGetter<number>
  bandHeightOf: (paragraph_index: number) => number
  split_cap: MaybeRefOrGetter<number>
  revalidate: MaybeRefOrGetter<unknown>
}

export type Pagination = {
  pages: Ref<Page[]>
  pageIndexOfWord: (word_index: number) => number
  pageFootprint: Ref<number[]>
}

export function usePagination(options: PaginationOptions): Pagination {
  const {
    measure_host,
    paragraphs,
    gloss_mode,
    split_mode,
    two_page,
    reduced_height,
    full_height,
    bandHeightOf,
    split_cap,
    revalidate
  } = options

  const pages = ref<Page[]>([])
  const pageFootprint = ref<number[]>([])

  let word_page = new Map<number, number>()
  let resize_observer: ResizeObserver | undefined

  onMounted(() => {
    resize_observer = new ResizeObserver(paginate)
    if (measure_host.value) resize_observer.observe(measure_host.value)
  })

  onBeforeUnmount(() => resize_observer?.disconnect())

  function paragraphMap(): Map<number, SentenceWords> {
    const map = new Map<number, SentenceWords>()
    for (const p of toValue(paragraphs)) map.set(p.index, p)
    return map
  }

  function atomBottom(el: HTMLElement, base: number): number {
    const gloss = el.hasAttribute('data-last-in-paragraph') ? glossAfter(el) : null
    const rect = (gloss ?? el).getBoundingClientRect()
    return rect.bottom - base
  }

  function glossAfter(word_el: HTMLElement): HTMLElement | null {
    const block = word_el.parentElement?.closest('[data-paragraph-index]')
    return block?.querySelector<HTMLElement>('[data-gloss]') ?? null
  }

  function computeLayout(
    word_els: HTMLElement[],
    base: number
  ): { cuts: number[]; footprints: number[] } {
    const split = toValue(split_mode)
    const two = toValue(two_page)
    const reduced = toValue(reduced_height)
    const full = toValue(full_height)
    const cap = toValue(split_cap)

    const isPrimary = (page: number) => !two || page % 2 === 0
    const baseBudget = (page: number) => (isPrimary(page) ? reduced : full)
    const bandFor = (page: number, p: number) =>
      split && isPrimary(page) ? Math.min(cap, bandHeightOf(p)) : 0

    const cuts: number[] = []
    const footprints: number[] = []
    let page_top = 0
    let page_index = 0
    let page_band = 0

    word_els.forEach((el, i) => {
      const top = el.getBoundingClientRect().top - base
      const bottom = atomBottom(el, base)
      const p = Number(el.dataset.paragraphIndex)

      const band = bandFor(page_index, p)
      const prospective = Math.max(page_band, band)
      const budget = baseBudget(page_index) - prospective

      if (i > 0 && bottom - page_top > budget) {
        footprints[page_index] = page_band
        cuts.push(i)
        page_top = top
        page_index++
        page_band = bandFor(page_index, p)
        return
      }

      page_band = prospective
    })

    footprints[page_index] = page_band
    return { cuts, footprints }
  }

  function buildPage(
    run: HTMLElement[],
    para_map: Map<number, SentenceWords>,
    gloss: boolean
  ): Page {
    const slices: PageSlice[] = []

    for (const el of run) {
      const p_index = Number(el.dataset.paragraphIndex)
      const w_index = Number(el.dataset.wordIndex)
      const paragraph = para_map.get(p_index)
      const word = paragraph?.words.find((w) => w.index === w_index)
      if (!paragraph || !word) continue

      const last = slices[slices.length - 1]
      if (last && last.paragraph_index === p_index) {
        last.words.push(word)
        continue
      }

      slices.push({
        paragraph_index: p_index,
        words: [word],
        translation: paragraph.translation,
        is_start: paragraph.words[0]?.index === w_index,
        show_gloss: false
      })
    }

    for (const slice of slices) {
      const paragraph = para_map.get(slice.paragraph_index)
      const ends = paragraph?.words.at(-1)?.index === slice.words.at(-1)?.index
      slice.show_gloss = gloss && ends && !!slice.translation
    }

    return slices
  }

  function paginate() {
    const host = measure_host.value
    if (!host || toValue(full_height) <= 0) return

    const base = host.getBoundingClientRect().top
    const word_els = [...host.querySelectorAll<HTMLElement>('[data-word-index]')]
    if (word_els.length === 0) {
      pages.value = []
      pageFootprint.value = []
      return
    }

    const { cuts, footprints } = computeLayout(word_els, base)
    const para_map = paragraphMap()
    const gloss = toValue(gloss_mode)

    const bounds = [0, ...cuts, word_els.length]
    const next_pages: Page[] = []
    const next_word_page = new Map<number, number>()

    for (let k = 0; k < bounds.length - 1; k++) {
      const run = word_els.slice(bounds[k], bounds[k + 1])
      for (const el of run) next_word_page.set(Number(el.dataset.wordIndex), k)
      next_pages.push(buildPage(run, para_map, gloss))
    }

    pages.value = next_pages
    pageFootprint.value = footprints
    word_page = next_word_page
  }

  function pageIndexOfWord(word_index: number): number {
    return word_page.get(word_index) ?? 0
  }

  watch(
    [() => toValue(revalidate), () => toValue(paragraphs), () => toValue(gloss_mode), measure_host],
    paginate,
    { flush: 'post' }
  )

  return { pages, pageIndexOfWord, pageFootprint }
}
