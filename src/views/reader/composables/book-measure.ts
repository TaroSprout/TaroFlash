import { computed, onBeforeUnmount, ref, toValue, watch } from 'vue'
import type { ComputedRef, MaybeRefOrGetter, Ref, ShallowRef } from 'vue'
import type { SentenceWords } from '@/utils/transcript'
import type { MeasuredWord } from '@/utils/reader/pagination'

const WORDS_PER_FRAME = 200

export type BookMeasureOptions = {
  measure_host: Readonly<ShallowRef<HTMLElement | null>>
  band_host: Readonly<ShallowRef<HTMLElement | null>>
  paragraphs: MaybeRefOrGetter<SentenceWords[]>
  width: MaybeRefOrGetter<number>
}

export type BookMeasure = {
  words: Ref<MeasuredWord[]>
  band_heights: Ref<Map<number, number>>
  rendered_count: Ref<number>
  rendered_paragraphs: ComputedRef<SentenceWords[]>
  bandHeightOf: (paragraph_index: number) => number
}

export function useBookMeasure(options: BookMeasureOptions): BookMeasure {
  const { measure_host, band_host, paragraphs, width } = options

  const words = ref<MeasuredWord[]>([])
  const band_heights = ref<Map<number, number>>(new Map())
  const rendered_count = ref(0)

  const rendered_paragraphs = computed(() => toValue(paragraphs).slice(0, rendered_count.value))

  let raf = 0
  let accumulated: MeasuredWord[] = []
  let measured_through = 0

  onBeforeUnmount(() => cancelAnimationFrame(raf))

  function restart() {
    cancelAnimationFrame(raf)
    accumulated = []
    measured_through = 0
    rendered_count.value = 0
    raf = requestAnimationFrame(tick)
  }

  function tick() {
    const all = toValue(paragraphs)
    const total = all.length

    if (total === 0 || toValue(width) <= 0) {
      accumulated = []
      words.value = []
      band_heights.value = new Map()
      return
    }

    const chunk_end = chunkEnd(all, measured_through)
    const measure_to = Math.min(chunk_end, rendered_count.value, total)
    if (measure_to > measured_through) {
      measureRange(all, measured_through, measure_to)
      measured_through = measure_to
    }

    if (measured_through >= total) return finalize()

    if (rendered_count.value < total) {
      rendered_count.value = chunkEnd(all, rendered_count.value)
    }
    raf = requestAnimationFrame(tick)
  }

  function chunkEnd(all: SentenceWords[], from: number): number {
    let end = from
    let budget = 0

    while (end < all.length && budget < WORDS_PER_FRAME) {
      budget += all[end].words.length
      end++
    }

    return end
  }

  function measureRange(all: SentenceWords[], from: number, to: number) {
    const host = measure_host.value
    if (!host) return

    const base = host.getBoundingClientRect().top

    for (let p = from; p < to; p++) {
      const selector = `[data-paragraph="${all[p].index}"] [data-word-index]`
      for (const el of host.querySelectorAll<HTMLElement>(selector)) {
        const rect = el.getBoundingClientRect()
        accumulated.push({
          index: Number(el.dataset.wordIndex),
          paragraph_index: Number(el.dataset.paragraphIndex),
          top: rect.top - base,
          bottom: rect.bottom - base
        })
      }
    }
  }

  function measureBands(): Map<number, number> {
    const host = band_host.value
    if (!host) return new Map()

    const next = new Map<number, number>()
    for (const el of host.querySelectorAll<HTMLElement>('[data-band-index]')) {
      next.set(Number(el.dataset.bandIndex), el.offsetHeight)
    }
    return next
  }

  function finalize() {
    band_heights.value = measureBands()
    words.value = accumulated
    rendered_count.value = 0
  }

  function bandHeightOf(paragraph_index: number): number {
    return band_heights.value.get(paragraph_index) ?? 0
  }

  watch([() => toValue(paragraphs), () => toValue(width), measure_host, band_host], restart, {
    immediate: true
  })

  return { words, band_heights, rendered_count, rendered_paragraphs, bandHeightOf }
}
