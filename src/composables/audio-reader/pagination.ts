import { onBeforeUnmount, onMounted, ref, toValue, watch } from 'vue'
import type { MaybeRefOrGetter, Ref, ShallowRef } from 'vue'
import type { DisplayWord, SentenceWords } from '@/utils/transcript'

// One paragraph's worth of words that fell on a single page. A paragraph that
// spans a page break yields one slice per page it touches; `is_start` marks the
// slice that opens the paragraph (so spacing/heading render once) and `show_gloss`
// the slice that closes it (so the interlinear gloss renders once, at the end).
export type PageSlice = {
  paragraph_index: number
  words: DisplayWord[]
  translation?: string
  is_start: boolean
  show_gloss: boolean
}

export type Page = PageSlice[]

// A word whose gloss overflows the page bottom would render clipped, so the whole
// paragraph tail (last word + its gloss) is measured as one atom and moved
// together to the next page. This is the extra height a gloss adds past its last
// word, read live from the measure layer, so no constant to keep in sync.

/**
 * Split the transcript into static, non-overflowing pages for the paged reader.
 *
 * Measurement, not math: the caller renders the whole transcript once into a
 * hidden `measure_host` sized to the exact page text column, and this composable
 * reads each word's laid-out rect to decide where a page fills. Pages break
 * greedily at whichever word first crosses the available height — mid-paragraph
 * when needed — so every page is packed and none overflows. Re-runs whenever the
 * column width, available height, or the paragraphs themselves change.
 *
 * The measure host must render each word as `[data-word-index]` inside a
 * `[data-paragraph-index]` block, and — in gloss mode — the paragraph's gloss as
 * `[data-gloss]`, so the tail atom's true height is measured.
 *
 * @param measure_host - the hidden full-transcript render, sized to page width.
 * @param available_height - the page text box height in px (0 until laid out).
 * @param paragraphs - the shaped transcript paragraphs.
 * @param gloss_mode - whether inline glosses render (and so consume page height).
 */
export function usePagination(
  measure_host: Readonly<ShallowRef<HTMLElement | null>>,
  available_height: MaybeRefOrGetter<number>,
  paragraphs: MaybeRefOrGetter<SentenceWords[]>,
  gloss_mode: MaybeRefOrGetter<boolean>
): { pages: Ref<Page[]>; pageIndexOfWord: (word_index: number) => number } {
  const pages = ref<Page[]>([])

  // word index -> page index, rebuilt on every paginate so a seek/resume can jump
  // straight to the page holding the playing word.
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

  // The word's bottom for page-fit purposes: normally its own, but the last word
  // of a paragraph in gloss mode carries its gloss with it, so its atom bottom is
  // the gloss's bottom — keeping word and gloss on the same page.
  function atomBottom(el: HTMLElement, base: number): number {
    const gloss = el.dataset.lastInParagraph ? glossAfter(el) : null
    const rect = (gloss ?? el).getBoundingClientRect()
    return rect.bottom - base
  }

  function glossAfter(word_el: HTMLElement): HTMLElement | null {
    const block = word_el.closest('[data-paragraph-index]')
    return block?.querySelector<HTMLElement>('[data-gloss]') ?? null
  }

  function computeCuts(word_els: HTMLElement[], base: number, avail: number): number[] {
    const cuts: number[] = []
    let page_top = 0

    word_els.forEach((el, i) => {
      const top = el.getBoundingClientRect().top - base
      const bottom = atomBottom(el, base)
      if (i > 0 && bottom - page_top > avail) {
        cuts.push(i)
        page_top = top
      }
    })

    return cuts
  }

  // Group one page's word elements (a contiguous run of the transcript) into
  // per-paragraph slices, carrying each paragraph's translation and marking which
  // slice opens it and which closes it.
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
    const avail = toValue(available_height)
    if (!host || avail <= 0) return

    const base = host.getBoundingClientRect().top
    const word_els = [...host.querySelectorAll<HTMLElement>('[data-word-index]')]
    if (word_els.length === 0) {
      pages.value = []
      return
    }

    const cuts = computeCuts(word_els, base, avail)
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
    word_page = next_word_page
  }

  function pageIndexOfWord(word_index: number): number {
    return word_page.get(word_index) ?? 0
  }

  // Re-paginate on any layout-shifting input; flush 'post' so the measure host has re-rendered before we read rects.
  watch(
    [
      () => toValue(available_height),
      () => toValue(paragraphs),
      () => toValue(gloss_mode),
      measure_host
    ],
    paginate,
    { flush: 'post' }
  )

  return { pages, pageIndexOfWord }
}
