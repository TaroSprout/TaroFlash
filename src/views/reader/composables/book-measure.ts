import { computed, onBeforeUnmount, ref, shallowRef, toValue, watch } from 'vue'
import type { ComputedRef, MaybeRefOrGetter, ShallowRef } from 'vue'
import type { SentenceWords } from '@/utils/transcript'
import type { MeasuredWord } from '@/utils/reader/pagination'
import type { BookGeometry, ParagraphGeometry, WordGeometry } from '@/utils/reader/measure'
import { stitchMeasuredWords } from '@/utils/reader/measure'

export type BookMeasureOptions = {
  measure_host: Readonly<ShallowRef<HTMLElement | null>>
  band_host: Readonly<ShallowRef<HTMLElement | null>>
  paragraphs: MaybeRefOrGetter<SentenceWords[]>
  width: MaybeRefOrGetter<number>
  anchor_paragraph: MaybeRefOrGetter<number>
}

export type BookMeasure = {
  words: ComputedRef<MeasuredWord[]>
  render_paragraphs: ComputedRef<SentenceWords[]>
  fully_measured: ComputedRef<boolean>
  bandHeightOf: (paragraph_index: number) => number
}

type IdleDeadline = { timeRemaining: () => number }

const MIN_SLICE_MS = 3

function scheduleIdle(run: (deadline: IdleDeadline) => void): () => void {
  const ric = (globalThis as { requestIdleCallback?: typeof requestIdleCallback })
    .requestIdleCallback
  if (ric) {
    const handle = ric(run, { timeout: 500 })
    const cic = (globalThis as { cancelIdleCallback?: typeof cancelIdleCallback })
      .cancelIdleCallback
    return () => cic?.(handle)
  }

  const timer = setTimeout(() => run({ timeRemaining: () => MIN_SLICE_MS }), 16)
  return () => clearTimeout(timer)
}

/**
 * Measure the book one paragraph at a time on idle, rippling outward from the
 * reading position, and cache each paragraph's geometry per column width. The
 * reading page can be laid out the instant its own paragraph is measured, while
 * the rest of the book fills in behind playback; a width already fully measured
 * reloads from cache with no re-measure. `words` stitches the contiguous run of
 * measured paragraphs around the anchor into one coordinate space for the fold.
 */
export function useBookMeasure(options: BookMeasureOptions): BookMeasure {
  const { measure_host, band_host, paragraphs, width, anchor_paragraph } = options

  const cache = new Map<number, Map<number, ParagraphGeometry>>()
  const gap_cache = new Map<number, number>()

  const measured = shallowRef<Map<number, ParagraphGeometry>>(new Map())
  const gap = ref(0)

  let alive = true
  let cancel: (() => void) | undefined

  const paragraph_count = computed(() => toValue(paragraphs).length)
  const fully_measured = computed(
    () => paragraph_count.value > 0 && measured.value.size >= paragraph_count.value
  )

  // Band heights keyed by the paragraph's own sparse `.index` — what the fold asks
  // for — rather than the array position `measured` is keyed by.
  const band_by_index = computed(() => {
    const map = new Map<number, number>()
    for (const geometry of measured.value.values()) {
      map.set(geometry.paragraph_index, geometry.band_height)
    }
    return map
  })

  // Render every paragraph into the hidden host while any remain unmeasured — the
  // scheduler can only read a paragraph's rects once it's in the DOM.
  const render_paragraphs = computed(() =>
    toValue(width) > 0 && !fully_measured.value ? toValue(paragraphs) : []
  )

  const words = computed(() => {
    const run = contiguousRun()
    if (run.length === 0) return []

    const book: BookGeometry = { paragraphs: run, gap: gap.value }
    return stitchMeasuredWords(book)
  })

  onBeforeUnmount(() => {
    alive = false
    cancel?.()
  })

  // The maximal block of already-measured paragraphs whose indices are contiguous
  // and contain the anchor — the only run whose stitched coordinates are sound.
  function contiguousRun(): ParagraphGeometry[] {
    const map = measured.value
    if (map.size === 0) return []

    const anchor = nearestMeasured()
    if (anchor === null) return []

    const run: ParagraphGeometry[] = []

    let lo = anchor
    while (map.has(lo - 1)) lo -= 1

    let hi = anchor
    while (map.has(hi + 1)) hi += 1

    for (let i = lo; i <= hi; i++) {
      const geometry = map.get(i)
      if (geometry) run.push(geometry)
    }

    return run
  }

  function nearestMeasured(): number | null {
    const map = measured.value
    const anchor = clampParagraph(toValue(anchor_paragraph))
    if (map.has(anchor)) return anchor

    const total = paragraph_count.value
    for (let r = 1; r < total; r++) {
      if (map.has(anchor + r)) return anchor + r
      if (map.has(anchor - r)) return anchor - r
    }

    return null
  }

  // The nearest paragraph to the anchor that this width hasn't measured yet —
  // scanning outward so measurement always ripples from the reading position,
  // re-prioritising around a new anchor after a seek.
  function nextTarget(): number | null {
    const map = measured.value
    const total = paragraph_count.value
    const anchor = clampParagraph(toValue(anchor_paragraph))

    if (!map.has(anchor)) return anchor

    for (let r = 1; r < total; r++) {
      const ahead = anchor + r
      if (ahead < total && !map.has(ahead)) return ahead

      const behind = anchor - r
      if (behind >= 0 && !map.has(behind)) return behind
    }

    return null
  }

  function clampParagraph(index: number): number {
    const total = paragraph_count.value
    if (total === 0) return 0
    return Math.min(Math.max(index, 0), total - 1)
  }

  function restart() {
    cancel?.()

    const w = toValue(width)
    if (w <= 0 || paragraph_count.value === 0) {
      measured.value = new Map()
      gap.value = 0
      return
    }

    const cached = cache.get(w)
    measured.value = cached ? new Map(cached) : new Map()
    gap.value = gap_cache.get(w) ?? 0

    if (fully_measured.value) return
    pump()
  }

  function pump() {
    cancel = scheduleIdle(step)
  }

  function step(deadline: IdleDeadline) {
    if (!alive) return

    const host = measure_host.value
    const w = toValue(width)
    if (!host || w <= 0) return

    // At least one paragraph per tick — the idle deadline forced by the timeout
    // can be near zero, and progress must not stall behind a busy main thread.
    let target = nextTarget()
    while (target !== null) {
      if (!measureParagraph(host, w, target)) break
      if (deadline.timeRemaining() <= MIN_SLICE_MS) break
      target = nextTarget()
    }

    if (!fully_measured.value) pump()
  }

  function measureParagraph(host: HTMLElement, w: number, paragraph_index: number): boolean {
    const paragraph = toValue(paragraphs)[paragraph_index]
    if (!paragraph) return false

    const geometry = readParagraphGeometry(host, band_host.value, paragraph)
    if (!geometry) return false

    const store = cache.get(w) ?? new Map<number, ParagraphGeometry>()
    store.set(paragraph_index, geometry)
    cache.set(w, store)

    if (gap.value === 0) seedGap(host, w)

    if (toValue(width) === w) {
      const next = new Map(measured.value)
      next.set(paragraph_index, geometry)
      measured.value = next
    }

    return true
  }

  function seedGap(host: HTMLElement, w: number) {
    const value = readGap(host)
    if (value === null) return
    gap.value = value
    gap_cache.set(w, value)
  }

  function bandHeightOf(paragraph_index: number): number {
    return band_by_index.value.get(paragraph_index) ?? 0
  }

  watch(() => toValue(paragraphs), reset)
  watch(() => toValue(width), restart)
  watch([measure_host, band_host], restart, { immediate: true })

  function reset() {
    cache.clear()
    gap_cache.clear()
    restart()
  }

  return { words, render_paragraphs, fully_measured, bandHeightOf }
}

function readParagraphGeometry(
  host: HTMLElement,
  band_host: HTMLElement | null,
  paragraph: SentenceWords
): ParagraphGeometry | null {
  const p_el = host.querySelector<HTMLElement>(`[data-paragraph="${paragraph.index}"]`)
  if (!p_el) return null

  const p_rect = p_el.getBoundingClientRect()
  const band_el = band_host?.querySelector<HTMLElement>(`[data-band-index="${paragraph.index}"]`)

  return {
    paragraph_index: paragraph.index,
    height: p_rect.height,
    band_height: band_el?.offsetHeight ?? 0,
    words: readWords(p_el, p_rect.top)
  }
}

function readWords(paragraph_el: HTMLElement, paragraph_top: number): WordGeometry[] {
  const words: WordGeometry[] = []

  for (const el of paragraph_el.querySelectorAll<HTMLElement>('[data-word-index]')) {
    const rect = el.getBoundingClientRect()
    words.push({
      index: Number(el.dataset.wordIndex),
      paragraph_index: Number(el.dataset.paragraphIndex),
      top: rect.top - paragraph_top,
      bottom: rect.bottom - paragraph_top
    })
  }

  return words
}

function readGap(host: HTMLElement): number | null {
  const paragraphs = host.querySelectorAll<HTMLElement>('[data-paragraph]')
  if (paragraphs.length < 2) return null

  const first = paragraphs[0].getBoundingClientRect()
  const second = paragraphs[1].getBoundingClientRect()

  return Math.max(0, second.top - first.bottom)
}
