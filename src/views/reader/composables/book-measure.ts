import { computed, nextTick, onBeforeUnmount, ref, shallowRef, toValue, watch } from 'vue'
import type { ComputedRef, MaybeRefOrGetter, Ref, ShallowRef } from 'vue'
import type { SentenceWords } from '@/utils/transcript'
import type { MeasuredWord } from '@/utils/reader/pagination'
import type { BookGeometry, ParagraphGeometry, WordGeometry } from '@/utils/reader/measure'
import { bandHeights, stitchMeasuredWords } from '@/utils/reader/measure'

export type BookMeasureOptions = {
  measure_host: Readonly<ShallowRef<HTMLElement | null>>
  band_host: Readonly<ShallowRef<HTMLElement | null>>
  paragraphs: MaybeRefOrGetter<SentenceWords[]>
  width: MaybeRefOrGetter<number>
}

export type BookMeasure = {
  words: ComputedRef<MeasuredWord[]>
  render_paragraphs: ComputedRef<SentenceWords[]>
  measuring: Ref<boolean>
  bandHeightOf: (paragraph_index: number) => number
}

export function useBookMeasure(options: BookMeasureOptions): BookMeasure {
  const { measure_host, band_host, paragraphs, width } = options

  const cache = new Map<number, BookGeometry>()
  const geometry = shallowRef<BookGeometry | null>(null)
  const measuring = ref(false)

  let pass_token = 0
  let alive = true

  const words = computed(() => (geometry.value ? stitchMeasuredWords(geometry.value) : []))
  const band_map = computed(() =>
    geometry.value ? bandHeights(geometry.value) : new Map<number, number>()
  )
  const render_paragraphs = computed(() => (measuring.value ? toValue(paragraphs) : []))

  onBeforeUnmount(() => (alive = false))

  function sync() {
    const w = toValue(width)
    const paras = toValue(paragraphs)
    pass_token += 1

    if (w <= 0 || paras.length === 0) {
      measuring.value = false
      geometry.value = null
      return
    }

    const cached = cache.get(w)
    if (cached) {
      measuring.value = false
      geometry.value = cached
      return
    }

    startMeasure(w)
  }

  function startMeasure(w: number) {
    measuring.value = true

    const token = pass_token
    nextTick(() => {
      if (!alive || token !== pass_token) return
      measurePass(w)
    })
  }

  function measurePass(w: number) {
    const host = measure_host.value
    if (!host) return

    const book = readGeometry(host, band_host.value, toValue(paragraphs))
    cache.set(w, book)
    geometry.value = book
    measuring.value = false
  }

  function reset() {
    cache.clear()
    sync()
  }

  function bandHeightOf(paragraph_index: number): number {
    return band_map.value.get(paragraph_index) ?? 0
  }

  watch(() => toValue(paragraphs), reset)
  watch(() => toValue(width), sync)
  watch([measure_host, band_host], sync, { immediate: true })

  return { words, render_paragraphs, measuring, bandHeightOf }
}

function readGeometry(
  host: HTMLElement,
  band_host: HTMLElement | null,
  paragraphs: SentenceWords[]
): BookGeometry {
  const band_heights = readBandHeights(band_host)

  const geometries: ParagraphGeometry[] = []
  let gap = 0
  let last_bottom: number | null = null

  for (const paragraph of paragraphs) {
    const p_el = host.querySelector<HTMLElement>(`[data-paragraph="${paragraph.index}"]`)
    if (!p_el) continue

    const p_rect = p_el.getBoundingClientRect()
    if (last_bottom !== null && gap === 0) gap = Math.max(0, p_rect.top - last_bottom)
    last_bottom = p_rect.bottom

    geometries.push({
      paragraph_index: paragraph.index,
      height: p_rect.height,
      band_height: band_heights.get(paragraph.index) ?? 0,
      words: readWords(p_el, p_rect.top)
    })
  }

  return { paragraphs: geometries, gap }
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

function readBandHeights(band_host: HTMLElement | null): Map<number, number> {
  const heights = new Map<number, number>()
  if (!band_host) return heights

  for (const el of band_host.querySelectorAll<HTMLElement>('[data-band-index]')) {
    heights.set(Number(el.dataset.bandIndex), el.offsetHeight)
  }

  return heights
}
