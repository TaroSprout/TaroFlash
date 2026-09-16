import { describe, test, expect, afterEach, vi } from 'vite-plus/test'
import { createApp, defineComponent, h, nextTick, shallowRef, ref } from 'vue'
import { usePagination } from '@/composables/audio-reader/pagination'

// ResizeObserver is not in jsdom — stub it globally so onMounted can construct
// one. The tests drive `paginate()` through the composable's own reactive
// watch (measure_host / revalidate / paragraphs / gloss_mode), never through
// this observer directly.
class FakeResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', FakeResizeObserver)

let app = null

afterEach(() => {
  app?.unmount()
  app = null
  vi.clearAllMocks()
})

/**
 * Mount usePagination in a host component so its lifecycle hooks (onMounted /
 * onBeforeUnmount) and its internal watch run for real. `measure_host` is an
 * externally-owned shallowRef the test assigns after the DOM fixture is
 * built, which is enough to retrigger the watch (`flush: 'post'`).
 */
function withPagination(overrides = {}) {
  const measure_host = shallowRef(null)
  const paragraphs = ref(overrides.paragraphs ?? [])
  const gloss_mode = ref(overrides.gloss_mode ?? false)
  const split_mode = ref(overrides.split_mode ?? false)
  const two_page = ref(overrides.two_page ?? false)
  const reduced_height = ref(overrides.reduced_height ?? 100)
  const full_height = ref(overrides.full_height ?? 100)
  const split_cap = ref(overrides.split_cap ?? 9999)
  const revalidate = ref(0)
  const bandHeightOf = overrides.bandHeightOf ?? (() => 0)

  let result

  const Host = defineComponent({
    setup() {
      result = usePagination({
        measure_host,
        paragraphs: () => paragraphs.value,
        gloss_mode: () => gloss_mode.value,
        split_mode: () => split_mode.value,
        two_page: () => two_page.value,
        reduced_height: () => reduced_height.value,
        full_height: () => full_height.value,
        bandHeightOf,
        split_cap: () => split_cap.value,
        revalidate: () => revalidate.value
      })
      return () => h('div')
    }
  })

  const container = document.createElement('div')
  document.body.appendChild(container)
  app = createApp(Host)
  app.mount(container)

  return {
    result,
    measure_host,
    paragraphs,
    gloss_mode,
    split_mode,
    two_page,
    reduced_height,
    full_height,
    split_cap,
    revalidate,
    container
  }
}

/** A word fixture the measure host reads back through `getBoundingClientRect`. */
function buildHost(words) {
  const host = document.createElement('div')
  host.getBoundingClientRect = () => new DOMRect(0, 0, 1000, 0)

  for (const w of words) {
    const el = document.createElement('span')
    el.setAttribute('data-word-index', String(w.index))
    el.setAttribute('data-paragraph-index', String(w.paragraph_index))
    if (w.lastInParagraph) el.setAttribute('data-last-in-paragraph', '')
    el.getBoundingClientRect = () => new DOMRect(0, w.top, 10, w.bottom - w.top)
    host.appendChild(el)
  }

  return host
}

/** A one-paragraph SentenceWords fixture spanning the given word indexes. */
function paragraphOf(index, word_indexes, translation) {
  return {
    index,
    sentence: 'sentence',
    translation,
    start: 0,
    end: 1,
    words: word_indexes.map((i) => ({ display: `w${i}`, start: 0, index: i }))
  }
}

describe('usePagination', () => {
  test('empty transcript yields no pages and no footprint', async () => {
    const { result, measure_host } = withPagination()

    measure_host.value = buildHost([])
    await nextTick()

    expect(result.pages.value).toEqual([])
    expect(result.pageFootprint.value).toEqual([])
  })

  test('full_height <= 0 leaves pages untouched', async () => {
    const { result, measure_host } = withPagination({ full_height: 0 })

    measure_host.value = buildHost([{ index: 0, paragraph_index: 0, top: 0, bottom: 10 }])
    await nextTick()

    expect(result.pages.value).toEqual([])
  })

  test('a single page holds every word when nothing exceeds the budget', async () => {
    const { result, measure_host } = withPagination({
      reduced_height: 200,
      paragraphs: [paragraphOf(0, [0, 1, 2])]
    })

    measure_host.value = buildHost([
      { index: 0, paragraph_index: 0, top: 0, bottom: 40 },
      { index: 1, paragraph_index: 0, top: 40, bottom: 80 },
      { index: 2, paragraph_index: 0, top: 80, bottom: 120 }
    ])
    await nextTick()

    expect(result.pages.value).toHaveLength(1)
    expect(result.pages.value[0][0].words.map((w) => w.index)).toEqual([0, 1, 2])
    expect(result.pageIndexOfWord(0)).toBe(0)
    expect(result.pageIndexOfWord(2)).toBe(0)
  })

  test('cuts a page once a word bottom exceeds the reduced-height budget', async () => {
    const { result, measure_host } = withPagination({
      reduced_height: 100,
      paragraphs: [paragraphOf(0, [0, 1, 2])]
    })

    measure_host.value = buildHost([
      { index: 0, paragraph_index: 0, top: 0, bottom: 40 },
      { index: 1, paragraph_index: 0, top: 40, bottom: 80 },
      { index: 2, paragraph_index: 0, top: 80, bottom: 120 }
    ])
    await nextTick()

    expect(result.pages.value).toHaveLength(2)
    expect(result.pages.value[0][0].words.map((w) => w.index)).toEqual([0, 1])
    expect(result.pages.value[1][0].words.map((w) => w.index)).toEqual([2])
    expect(result.pageIndexOfWord(0)).toBe(0)
    expect(result.pageIndexOfWord(1)).toBe(0)
    expect(result.pageIndexOfWord(2)).toBe(1)
  })

  test('the closing slice of a paragraph gets show_gloss when gloss mode is on', async () => {
    const { result, measure_host } = withPagination({
      gloss_mode: true,
      reduced_height: 100,
      paragraphs: [paragraphOf(0, [0, 1, 2], 'the translation')]
    })

    measure_host.value = buildHost([
      { index: 0, paragraph_index: 0, top: 0, bottom: 40 },
      { index: 1, paragraph_index: 0, top: 40, bottom: 80 },
      { index: 2, paragraph_index: 0, top: 80, bottom: 120 }
    ])
    await nextTick()

    // Page 0 holds words 0-1 — not the paragraph's last word, so no gloss yet.
    expect(result.pages.value[0][0].show_gloss).toBe(false)
    // Page 1 holds word 2, the paragraph's last word — gloss renders here.
    expect(result.pages.value[1][0].show_gloss).toBe(true)
    expect(result.pages.value[1][0].translation).toBe('the translation')
  })

  test('a paragraph split across pages keeps is_start true only on the page that opens it', async () => {
    const { result, measure_host } = withPagination({
      reduced_height: 100,
      paragraphs: [paragraphOf(0, [0, 1, 2])]
    })

    measure_host.value = buildHost([
      { index: 0, paragraph_index: 0, top: 0, bottom: 40 },
      { index: 1, paragraph_index: 0, top: 40, bottom: 80 },
      { index: 2, paragraph_index: 0, top: 80, bottom: 120 }
    ])
    await nextTick()

    expect(result.pages.value[0][0].is_start).toBe(true)
    expect(result.pages.value[1][0].is_start).toBe(false)
  })

  test('the split band is capped at split_cap even when the measured band is taller', async () => {
    const { result, measure_host } = withPagination({
      split_mode: true,
      reduced_height: 100,
      split_cap: 30,
      bandHeightOf: () => 50,
      paragraphs: [paragraphOf(0, [0])]
    })

    measure_host.value = buildHost([{ index: 0, paragraph_index: 0, top: 0, bottom: 10 }])
    await nextTick()

    expect(result.pageFootprint.value[0]).toBe(30)
  })

  test('the split band footprint is 0 when split mode is off', async () => {
    const { result, measure_host } = withPagination({
      split_mode: false,
      reduced_height: 100,
      bandHeightOf: () => 50,
      paragraphs: [paragraphOf(0, [0])]
    })

    measure_host.value = buildHost([{ index: 0, paragraph_index: 0, top: 0, bottom: 10 }])
    await nextTick()

    expect(result.pageFootprint.value[0]).toBe(0)
  })

  test('a reserved band shrinks the budget, cutting a page earlier than an unbanded run', async () => {
    const { result, measure_host } = withPagination({
      split_mode: true,
      reduced_height: 100,
      split_cap: 30,
      bandHeightOf: () => 30,
      paragraphs: [paragraphOf(0, [0, 1])]
    })

    // Budget is reduced_height(100) - band(30) = 70. Word 1's bottom (80)
    // exceeds it, so the page cuts before word 1 even though 80 < 100.
    measure_host.value = buildHost([
      { index: 0, paragraph_index: 0, top: 0, bottom: 40 },
      { index: 1, paragraph_index: 0, top: 40, bottom: 80 }
    ])
    await nextTick()

    expect(result.pages.value).toHaveLength(2)
  })

  test('two-page mode reserves the band on the primary (even) page only', async () => {
    const { result, measure_host } = withPagination({
      split_mode: true,
      two_page: true,
      reduced_height: 100,
      full_height: 100,
      split_cap: 30,
      bandHeightOf: () => 30,
      paragraphs: [paragraphOf(0, [0])]
    })

    measure_host.value = buildHost([{ index: 0, paragraph_index: 0, top: 0, bottom: 10 }])
    await nextTick()

    // Page 0 (primary/even) reserves the capped band; a second page never
    // measures here, so only index 0's footprint is asserted.
    expect(result.pageFootprint.value[0]).toBe(30)
  })

  test('pageIndexOfWord defaults to 0 for a word that has never been paginated', () => {
    const { result } = withPagination()

    expect(result.pageIndexOfWord(999)).toBe(0)
  })

  test('revalidate re-runs paginate with a changed bandHeightOf result', async () => {
    let band = 10
    const { result, measure_host, revalidate } = withPagination({
      split_mode: true,
      reduced_height: 100,
      split_cap: 999,
      bandHeightOf: () => band,
      paragraphs: [paragraphOf(0, [0])]
    })

    measure_host.value = buildHost([{ index: 0, paragraph_index: 0, top: 0, bottom: 10 }])
    await nextTick()
    expect(result.pageFootprint.value[0]).toBe(10)

    band = 25
    revalidate.value++
    await nextTick()

    expect(result.pageFootprint.value[0]).toBe(25)
  })

  test('a word ending its paragraph measures through its gloss atom, not its own rect', async () => {
    // Word 1's own rect (bottom 30) fits the 35px budget, but it carries
    // data-last-in-paragraph, so its measured bottom comes from the
    // paragraph's [data-gloss] element (bottom 50) instead — enough to force
    // an earlier cut than the bare word rect would.
    const { result, measure_host } = withPagination({
      reduced_height: 35,
      paragraphs: [paragraphOf(0, [0, 1])]
    })

    const host = buildHost([
      { index: 0, paragraph_index: 0, top: 0, bottom: 20 },
      { index: 1, paragraph_index: 0, top: 20, bottom: 30, lastInParagraph: true }
    ])

    const block = document.createElement('div')
    block.setAttribute('data-paragraph-index', '0')
    for (const el of [...host.children]) block.appendChild(el)
    host.appendChild(block)

    const gloss = document.createElement('div')
    gloss.setAttribute('data-gloss', '')
    gloss.getBoundingClientRect = () => new DOMRect(0, 20, 10, 30) // bottom = 50
    block.appendChild(gloss)

    measure_host.value = host
    await nextTick()

    expect(result.pages.value).toHaveLength(2)
    expect(result.pages.value[0][0].words.map((w) => w.index)).toEqual([0])
    expect(result.pages.value[1][0].words.map((w) => w.index)).toEqual([1])
  })
})
