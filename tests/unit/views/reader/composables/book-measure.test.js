import { describe, test, expect, afterEach, vi } from 'vite-plus/test'
import { createApp, nextTick, ref, shallowRef } from 'vue'
import { useBookMeasure } from '@/views/reader/composables/book-measure'
import { computePagination } from '@/utils/reader/pagination'

vi.useFakeTimers()

let app = null

afterEach(() => {
  app?.unmount()
  app = null
  vi.clearAllTimers()
})

function paragraph(index, word_count) {
  return {
    index,
    sentence: '',
    start: 0,
    end: 0,
    words: Array.from({ length: word_count }, (_, i) => ({ display: `w${i}`, start: i, index: i }))
  }
}

function buildMeasureHost(paragraphs) {
  const host = document.createElement('div')
  for (const p of paragraphs) {
    const p_el = document.createElement('div')
    p_el.setAttribute('data-paragraph', String(p.index))
    p_el.getBoundingClientRect = () => new DOMRect(0, p.index * 200, 0, p.words.length * 10)
    for (const w of p.words) {
      const w_el = document.createElement('span')
      w_el.dataset.wordIndex = String(w.index)
      w_el.dataset.paragraphIndex = String(p.index)
      w_el.getBoundingClientRect = () =>
        new DOMRect(0, p.index * 200 + w.index * 10, 10, 10 + (w.index * 10 + 10))
      p_el.appendChild(w_el)
    }
    host.appendChild(p_el)
  }
  return host
}

function buildBandHost(bands) {
  const host = document.createElement('div')
  for (const [index, height] of bands) {
    const el = document.createElement('div')
    el.dataset.bandIndex = String(index)
    Object.defineProperty(el, 'offsetHeight', { value: height, configurable: true })
    host.appendChild(el)
  }
  return host
}

function withBookMeasure({ paragraphs, width, measure_host, band_host, anchor_paragraph }) {
  let result

  const paragraphs_ref = paragraphs
  const width_ref = width
  const anchor_ref = anchor_paragraph ?? ref(0)

  const host = createApp({
    setup() {
      result = useBookMeasure({
        measure_host: measure_host ?? shallowRef(null),
        band_host: band_host ?? shallowRef(null),
        paragraphs: () => paragraphs_ref.value,
        width: () => width_ref.value,
        anchor_paragraph: () => anchor_ref.value
      })
      return () => null
    }
  })

  host.mount(document.createElement('div'))
  app = host

  return { ...result, paragraphs: paragraphs_ref, width: width_ref, anchor_paragraph: anchor_ref }
}

/** Fully drain the idle-tick queue — one paragraph measures per fallback tick. */
async function drain(steps = 10) {
  for (let i = 0; i < steps; i++) {
    vi.advanceTimersByTime(16)
    await nextTick()
  }
}

describe('useBookMeasure', () => {
  test('words is empty before anything has measured', () => {
    const paragraphs = ref([paragraph(0, 3)])
    const width = ref(300)
    const measure_host = shallowRef(buildMeasureHost(paragraphs.value))

    const { words } = withBookMeasure({ paragraphs, width, measure_host })

    expect(words.value).toEqual([])
  })

  test('render_paragraphs exposes every paragraph while measurement is incomplete', () => {
    const paragraphs = ref([paragraph(0, 3), paragraph(1, 2)])
    const width = ref(300)
    const measure_host = shallowRef(buildMeasureHost(paragraphs.value))

    const { render_paragraphs } = withBookMeasure({ paragraphs, width, measure_host })

    expect(render_paragraphs.value.map((p) => p.index)).toEqual([0, 1])
  })

  test('render_paragraphs empties once every paragraph is measured', async () => {
    const paragraphs = ref([paragraph(0, 2), paragraph(1, 2)])
    const width = ref(300)
    const measure_host = shallowRef(buildMeasureHost(paragraphs.value))

    const { render_paragraphs, fully_measured } = withBookMeasure({
      paragraphs,
      width,
      measure_host
    })

    await drain()

    expect(fully_measured.value).toBe(true)
    expect(render_paragraphs.value).toEqual([])
  })

  test('fully_measured stays false while paragraphs remain unmeasured', async () => {
    const paragraphs = ref([paragraph(0, 2), paragraph(1, 2)])
    const width = ref(300)
    const measure_host = shallowRef(buildMeasureHost(paragraphs.value))

    const { fully_measured } = withBookMeasure({ paragraphs, width, measure_host })

    vi.advanceTimersByTime(16)
    await nextTick()

    expect(fully_measured.value).toBe(false)
  })

  test('words stitches the measured paragraphs once fully measured', async () => {
    const paragraphs = ref([paragraph(0, 2), paragraph(1, 2)])
    const width = ref(300)
    const measure_host = shallowRef(buildMeasureHost(paragraphs.value))

    const { words } = withBookMeasure({ paragraphs, width, measure_host })

    await drain()

    expect(words.value).toHaveLength(4)
    expect(words.value.map((w) => w.index)).toEqual([0, 1, 0, 1])
  })

  test('bandHeightOf reads the measured band heights after finalize', async () => {
    const paragraphs = ref([paragraph(0, 2)])
    const width = ref(300)
    const measure_host = shallowRef(buildMeasureHost(paragraphs.value))
    const band_host = shallowRef(buildBandHost([[0, 42]]))

    const { bandHeightOf } = withBookMeasure({ paragraphs, width, measure_host, band_host })

    expect(bandHeightOf(0)).toBe(0)

    await drain()

    expect(bandHeightOf(0)).toBe(42)
  })

  test('bandHeightOf falls back to 0 for a paragraph with no measured band', async () => {
    const paragraphs = ref([paragraph(0, 2)])
    const width = ref(300)
    const measure_host = shallowRef(buildMeasureHost(paragraphs.value))

    const { bandHeightOf } = withBookMeasure({ paragraphs, width, measure_host })

    await drain()

    expect(bandHeightOf(99)).toBe(0)
  })

  test('is empty and schedules nothing when width is not positive', async () => {
    const paragraphs = ref([paragraph(0, 2)])
    const width = ref(0)
    const measure_host = shallowRef(buildMeasureHost(paragraphs.value))

    const { words, fully_measured } = withBookMeasure({ paragraphs, width, measure_host })

    await drain(2)

    expect(words.value).toEqual([])
    expect(fully_measured.value).toBe(false)
  })

  test('ripples measurement outward from the anchor paragraph first', async () => {
    const paragraphs = ref([paragraph(0, 1), paragraph(1, 1), paragraph(2, 1)])
    const width = ref(300)
    const measure_host = shallowRef(buildMeasureHost(paragraphs.value))
    const anchor_paragraph = ref(2)

    const { render_paragraphs } = withBookMeasure({
      paragraphs,
      width,
      measure_host,
      anchor_paragraph
    })

    vi.advanceTimersByTime(16)
    await nextTick()

    expect(render_paragraphs.value.map((p) => p.index)).toContain(2)
  })

  test('coalesces a NaN anchor paragraph to 0 and still completes measurement', async () => {
    const paragraphs = ref([paragraph(0, 1), paragraph(1, 1), paragraph(2, 1)])
    const width = ref(300)
    const measure_host = shallowRef(buildMeasureHost(paragraphs.value))
    const anchor_paragraph = ref(NaN)

    const { render_paragraphs, fully_measured } = withBookMeasure({
      paragraphs,
      width,
      measure_host,
      anchor_paragraph
    })

    vi.advanceTimersByTime(16)
    await nextTick()

    expect(render_paragraphs.value.map((p) => p.index)).toContain(0)

    await drain()

    expect(fully_measured.value).toBe(true)
  })

  test('coalesces an undefined anchor paragraph to 0 and still completes measurement', async () => {
    const paragraphs = ref([paragraph(0, 1), paragraph(1, 1), paragraph(2, 1)])
    const width = ref(300)
    const measure_host = shallowRef(buildMeasureHost(paragraphs.value))
    const anchor_paragraph = ref(undefined)

    const { render_paragraphs, fully_measured } = withBookMeasure({
      paragraphs,
      width,
      measure_host,
      anchor_paragraph
    })

    vi.advanceTimersByTime(16)
    await nextTick()

    expect(render_paragraphs.value.map((p) => p.index)).toContain(0)

    await drain()

    expect(fully_measured.value).toBe(true)
  })

  test('a valid numeric anchor paragraph still completes measurement, unchanged by the NaN guard', async () => {
    const paragraphs = ref([paragraph(0, 1), paragraph(1, 1), paragraph(2, 1)])
    const width = ref(300)
    const measure_host = shallowRef(buildMeasureHost(paragraphs.value))
    const anchor_paragraph = ref(2)

    const { render_paragraphs, fully_measured } = withBookMeasure({
      paragraphs,
      width,
      measure_host,
      anchor_paragraph
    })

    vi.advanceTimersByTime(16)
    await nextTick()

    expect(render_paragraphs.value.map((p) => p.index)).toContain(2)

    await drain()

    expect(fully_measured.value).toBe(true)
  })

  test('stitches from the nearest already-measured paragraph when the anchor moves past it', async () => {
    const paragraphs = ref([paragraph(0, 1), paragraph(1, 1), paragraph(2, 1)])
    const width = ref(300)
    const measure_host = shallowRef(buildMeasureHost(paragraphs.value))
    const anchor_paragraph = ref(0)

    const { words } = withBookMeasure({ paragraphs, width, measure_host, anchor_paragraph })

    vi.advanceTimersByTime(16)
    await nextTick()

    anchor_paragraph.value = 2
    await nextTick()

    expect(words.value.map((w) => w.paragraph_index)).toEqual([0])
  })

  test('onBeforeUnmount cancels the pending idle tick', async () => {
    const paragraphs = ref([paragraph(0, 2)])
    const width = ref(300)
    const measure_host = shallowRef(buildMeasureHost(paragraphs.value))

    withBookMeasure({ paragraphs, width, measure_host })

    const cleared = vi.getTimerCount()
    expect(cleared).toBeGreaterThan(0)

    app.unmount()
    app = null

    expect(vi.getTimerCount()).toBe(0)
  })

  describe('cache behaviour', () => {
    test('a repeat at the same column width measures nothing — restores from cache', async () => {
      const paragraphs = ref([paragraph(0, 2), paragraph(1, 2)])
      const width = ref(300)
      const measure_host = shallowRef(buildMeasureHost(paragraphs.value))

      const { fully_measured, words } = withBookMeasure({ paragraphs, width, measure_host })
      await drain()
      expect(fully_measured.value).toBe(true)
      const first_pass_words = words.value

      width.value = 400
      await nextTick()
      await drain()
      expect(fully_measured.value).toBe(true)

      width.value = 300
      await nextTick()

      expect(fully_measured.value).toBe(true)
      expect(vi.getTimerCount()).toBe(0)
      expect(words.value).toEqual(first_pass_words)
    })

    test('a change unrelated to column width reuses the cache — no re-measure is scheduled', async () => {
      const paragraphs = ref([paragraph(0, 2), paragraph(1, 2)])
      const width = ref(300)
      const measure_host = shallowRef(buildMeasureHost(paragraphs.value))
      const anchor_paragraph = ref(0)

      const { fully_measured } = withBookMeasure({
        paragraphs,
        width,
        measure_host,
        anchor_paragraph
      })
      await drain()
      expect(fully_measured.value).toBe(true)

      anchor_paragraph.value = 1
      await nextTick()

      expect(fully_measured.value).toBe(true)
      expect(vi.getTimerCount()).toBe(0)
    })

    test('a paragraphs change (density or lesson switch) clears the cache and re-measures', async () => {
      const paragraphs = ref([paragraph(0, 2), paragraph(1, 2)])
      const width = ref(300)
      const measure_host = shallowRef(buildMeasureHost(paragraphs.value))

      const { fully_measured } = withBookMeasure({ paragraphs, width, measure_host })
      await drain()
      expect(fully_measured.value).toBe(true)

      const next_paragraphs = [paragraph(0, 3), paragraph(1, 3)]
      measure_host.value = buildMeasureHost(next_paragraphs)
      paragraphs.value = next_paragraphs
      await nextTick()

      expect(fully_measured.value).toBe(false)
      expect(vi.getTimerCount()).toBeGreaterThan(0)
    })
  })

  describe('parity with the flat-measure baseline', () => {
    test('words fed through computePagination matches computePagination fed the same stitched geometry directly', async () => {
      const paragraphs = ref([paragraph(0, 3), paragraph(1, 3)])
      const width = ref(300)
      const measure_host = shallowRef(buildMeasureHost(paragraphs.value))

      const { words } = withBookMeasure({ paragraphs, width, measure_host })
      await drain()

      const adapter_result = computePagination({
        words: words.value,
        split_mode: false,
        two_page: false,
        reduced_height: 999,
        full_height: 999,
        bandHeightOf: () => 0,
        split_cap: 0
      })

      const flat_words = words.value.map((w) => ({ ...w }))
      const flat_result = computePagination({
        words: flat_words,
        split_mode: false,
        two_page: false,
        reduced_height: 999,
        full_height: 999,
        bandHeightOf: () => 0,
        split_cap: 0
      })

      expect(adapter_result.cuts).toEqual(flat_result.cuts)
      expect(adapter_result.footprints).toEqual(flat_result.footprints)
    })
  })
})
