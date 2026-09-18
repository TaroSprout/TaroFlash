import { describe, test, expect, afterEach, vi } from 'vite-plus/test'
import { createApp, nextTick, ref, shallowRef } from 'vue'
import { useBookMeasure } from '@/views/reader/composables/book-measure'

let raf_queue = []
let raf_id = 0

vi.stubGlobal(
  'requestAnimationFrame',
  vi.fn((cb) => {
    raf_id += 1
    raf_queue.push({ id: raf_id, cb })
    return raf_id
  })
)
vi.stubGlobal(
  'cancelAnimationFrame',
  vi.fn((id) => {
    raf_queue = raf_queue.filter((entry) => entry.id !== id)
  })
)

function flushRaf() {
  const entry = raf_queue.shift()
  if (!entry) throw new Error('no pending rAF tick to flush')
  entry.cb()
}

let app = null

afterEach(() => {
  app?.unmount()
  app = null
  raf_queue = []
  raf_id = 0
  vi.clearAllMocks()
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
    for (const w of p.words) {
      const w_el = document.createElement('span')
      w_el.dataset.wordIndex = String(w.index)
      w_el.dataset.paragraphIndex = String(p.index)
      w_el.getBoundingClientRect = () => new DOMRect(0, w.index * 10, 10, 10)
      p_el.appendChild(w_el)
    }
    host.appendChild(p_el)
  }
  host.getBoundingClientRect = () => new DOMRect(0, 0, 0, 0)
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

function withBookMeasure({ paragraphs, width = 300, measure_host, band_host }) {
  let result

  const host = createApp({
    setup() {
      result = useBookMeasure({
        measure_host: measure_host ?? shallowRef(null),
        band_host: band_host ?? shallowRef(null),
        paragraphs: () => paragraphs.value,
        width: () => width
      })
      return () => null
    }
  })

  host.mount(document.createElement('div'))
  app = host

  return result
}

describe('useBookMeasure', () => {
  test('chunks the measure across rAF ticks by word budget, not all at once', () => {
    const paragraphs = ref([paragraph(0, 150), paragraph(1, 100), paragraph(2, 100)])
    const measure_dom = buildMeasureHost(paragraphs.value)
    const measure_host = shallowRef(measure_dom)

    const { rendered_count, words } = withBookMeasure({ paragraphs, measure_host })

    expect(rendered_count.value).toBe(0)

    flushRaf()
    expect(rendered_count.value).toBe(2)
    expect(words.value).toEqual([])

    flushRaf()
    expect(rendered_count.value).toBe(3)

    flushRaf()
    expect(words.value.length).toBe(350)
  })

  test('rendered_paragraphs tracks the slice up to rendered_count', () => {
    const paragraphs = ref([paragraph(0, 150), paragraph(1, 100), paragraph(2, 100)])
    const measure_host = shallowRef(buildMeasureHost(paragraphs.value))

    const { rendered_paragraphs } = withBookMeasure({ paragraphs, measure_host })

    expect(rendered_paragraphs.value).toEqual([])

    flushRaf()
    expect(rendered_paragraphs.value.map((p) => p.index)).toEqual([0, 1])
  })

  test('finalize resets rendered_count to 0 once every paragraph is measured', () => {
    const paragraphs = ref([paragraph(0, 10), paragraph(1, 10)])
    const measure_host = shallowRef(buildMeasureHost(paragraphs.value))

    const { rendered_count } = withBookMeasure({ paragraphs, measure_host })

    flushRaf()
    expect(rendered_count.value).toBe(2)

    flushRaf()
    expect(rendered_count.value).toBe(0)
  })

  test('bandHeightOf reads the measured band heights after finalize', () => {
    const paragraphs = ref([paragraph(0, 5)])
    const measure_host = shallowRef(buildMeasureHost(paragraphs.value))
    const band_host = shallowRef(
      buildBandHost([
        [0, 42],
        [1, 18]
      ])
    )

    const { bandHeightOf } = withBookMeasure({ paragraphs, measure_host, band_host })

    expect(bandHeightOf(0)).toBe(0)

    flushRaf()
    flushRaf()

    expect(bandHeightOf(0)).toBe(42)
    expect(bandHeightOf(1)).toBe(18)
  })

  test('bandHeightOf falls back to 0 for a paragraph with no measured band', () => {
    const paragraphs = ref([paragraph(0, 5)])
    const measure_host = shallowRef(buildMeasureHost(paragraphs.value))

    const { bandHeightOf } = withBookMeasure({ paragraphs, measure_host })

    flushRaf()
    flushRaf()

    expect(bandHeightOf(99)).toBe(0)
  })

  test('is empty and stops immediately when width is not positive', () => {
    const paragraphs = ref([paragraph(0, 10)])
    const measure_host = shallowRef(buildMeasureHost(paragraphs.value))

    const { words, band_heights } = withBookMeasure({ paragraphs, measure_host, width: 0 })

    flushRaf()

    expect(words.value).toEqual([])
    expect(band_heights.value.size).toBe(0)
    expect(raf_queue.length).toBe(0)
  })

  test('restarts the measure when paragraphs change', async () => {
    const paragraphs = ref([paragraph(0, 10)])
    const measure_host = shallowRef(buildMeasureHost(paragraphs.value))

    const { rendered_count } = withBookMeasure({ paragraphs, measure_host })

    flushRaf()
    flushRaf()
    expect(rendered_count.value).toBe(0)

    const next_paragraphs = [paragraph(0, 10), paragraph(1, 10)]
    measure_host.value = buildMeasureHost(next_paragraphs)
    paragraphs.value = next_paragraphs
    await nextTick()

    expect(rendered_count.value).toBe(0)
    expect(raf_queue.length).toBeGreaterThan(0)
  })

  test('onBeforeUnmount cancels the pending rAF tick', () => {
    const paragraphs = ref([paragraph(0, 10)])
    const measure_host = shallowRef(buildMeasureHost(paragraphs.value))

    withBookMeasure({ paragraphs, measure_host })
    expect(raf_queue.length).toBe(1)

    app.unmount()

    expect(raf_queue.length).toBe(0)
  })
})
