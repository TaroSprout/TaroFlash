import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────
// Pagination and selection are unit-tested on their own — this file drives the
// orchestrator's own wiring: spread math, keyboard navigation, and the
// split-band reservation, none of which need real word measurement.

const { pagesRef, pageFootprintRef, pageIndexOfWordMock } = await vi.hoisted(async () => {
  const { ref: vueRef } = await import('vue')
  return {
    pagesRef: vueRef([]),
    pageFootprintRef: vueRef([]),
    pageIndexOfWordMock: vi.fn(() => 0)
  }
})

vi.mock('@/composables/audio-reader/pagination', () => ({
  usePagination: () => ({
    pages: pagesRef,
    pageIndexOfWord: pageIndexOfWordMock,
    pageFootprint: pageFootprintRef
  })
}))

const { selectAtPointMock, paintActiveWordMock, paintRangeMock } = vi.hoisted(() => ({
  selectAtPointMock: vi.fn(),
  paintActiveWordMock: vi.fn(),
  paintRangeMock: vi.fn()
}))

vi.mock('@/composables/audio-reader/paged-selection', () => ({
  usePagedSelection: () => ({
    selectAtPoint: selectAtPointMock,
    paintActiveWord: paintActiveWordMock,
    paintRange: paintRangeMock
  })
}))

const { displayModeRef } = await vi.hoisted(async () => {
  const { ref: vueRef } = await import('vue')
  return { displayModeRef: vueRef('inline') }
})

vi.mock('@/composables/audio-reader/reader-prefs', () => ({
  useReaderPrefs: () => ({ display_mode: displayModeRef })
}))

const { twoPageRef } = await vi.hoisted(async () => {
  const { ref: vueRef } = await import('vue')
  return { twoPageRef: vueRef(false) }
})

vi.mock('@/composables/ui/media-query', () => ({ useMatchMedia: () => twoPageRef }))

const {
  frostMotionSafeMock,
  primeFrostMock,
  resizeBandMock,
  scaleFrostMock,
  setBandMock,
  settleFrostMock,
  slidePageMock
} = vi.hoisted(() => ({
  frostMotionSafeMock: vi.fn(() => false),
  primeFrostMock: vi.fn(),
  resizeBandMock: vi.fn(),
  scaleFrostMock: vi.fn(),
  setBandMock: vi.fn(),
  settleFrostMock: vi.fn(() => Promise.resolve()),
  slidePageMock: vi.fn((_el, _to, onComplete) => onComplete())
}))

vi.mock('@/utils/animations/paged-reader', () => ({
  frostMotionSafe: frostMotionSafeMock,
  primeFrost: primeFrostMock,
  resizeBand: resizeBandMock,
  scaleFrost: scaleFrostMock,
  setBand: setBandMock,
  settleFrost: settleFrostMock,
  slidePage: slidePageMock
}))

vi.mock('gsap', () => ({
  gsap: {
    fromTo: vi.fn((_el, _from, to) => to?.onComplete?.()),
    to: vi.fn((_el, opts) => opts?.onComplete?.())
  }
}))

import PagedReader from '@/views/audio-reader/lesson/paged/index.vue'
import { lessonReaderKey } from '@/composables/audio-reader/lesson-reader'
import PagedPage from '@/views/audio-reader/lesson/paged/page.vue'

// ── Fixtures ────────────────────────────────────────────────────────────────────

function makeWord(index) {
  return { display: `w${index}`, start: index, index }
}

function makeSlice(paragraph_index, word_index) {
  return {
    paragraph_index,
    words: [makeWord(word_index)],
    translation: undefined,
    is_start: true,
    show_gloss: false
  }
}

function makeReader(overrides = {}) {
  return {
    paragraphs: ref([]),
    matches: ref(new Map()),
    active_word: ref(-1),
    selection: ref(null),
    popover_open: ref(false),
    target_lang: 'English',
    selected_term_decks: ref([]),
    openTerm: vi.fn(),
    closeTerm: vi.fn(),
    playFromHere: vi.fn(),
    playClip: vi.fn(),
    seekToWord: vi.fn(),
    player: {
      is_playing: ref(false),
      seek: vi.fn(),
      play: vi.fn(),
      pause: vi.fn(),
      skip: vi.fn()
    },
    ...overrides
  }
}

let mounted_wrapper = null

function mountPagedReader(reader = makeReader()) {
  mounted_wrapper = shallowMount(PagedReader, {
    global: { provide: { [lessonReaderKey]: reader } }
  })
  return { wrapper: mounted_wrapper, reader }
}

describe('PagedReader (paged/index.vue)', () => {
  beforeEach(() => {
    mounted_wrapper?.unmount()
    mounted_wrapper = null
    pagesRef.value = []
    pageFootprintRef.value = []
    pageIndexOfWordMock.mockClear()
    displayModeRef.value = 'inline'
    twoPageRef.value = false
    selectAtPointMock.mockClear()
    paintActiveWordMock.mockClear()
    paintRangeMock.mockClear()
    setBandMock.mockClear()
    resizeBandMock.mockClear()
    slidePageMock.mockClear()
  })

  afterEach(() => {
    mounted_wrapper?.unmount()
    mounted_wrapper = null
  })

  test('renders the reader shell', () => {
    const { wrapper } = mountPagedReader()

    expect(wrapper.find('[data-testid="paged-reader"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="paged-reader__viewport"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="paged-reader__scroller"]').exists()).toBe(true)
  })

  describe('spread math', () => {
    test('one page per spread when two_page is off', async () => {
      pagesRef.value = [[makeSlice(0, 0)], [makeSlice(0, 5)]]
      const { wrapper } = mountPagedReader()
      await flushPromises()

      const pages = wrapper.findAllComponents(PagedPage)
      // slots render current-1, current, current+1 — only the valid indexes
      // (0 and 1) produce a page; index -1 and 2 are out of range.
      expect(pages).toHaveLength(2)
    })

    test('two pages per spread when two_page is on', async () => {
      twoPageRef.value = true
      pagesRef.value = [[makeSlice(0, 0)], [makeSlice(0, 5)]]
      const { wrapper } = mountPagedReader()
      await flushPromises()

      // Two-page mode packs pages[0] and pages[1] into a single spread — both
      // pages render as the current spread's left/right pair.
      const pages = wrapper.findAllComponents(PagedPage)
      expect(pages).toHaveLength(2)
    })
  })

  describe('keyboard navigation', () => {
    test('ArrowRight advances to the next spread and seeks to its first word', async () => {
      pagesRef.value = [[makeSlice(0, 0)], [makeSlice(0, 5)]]
      const { reader } = mountPagedReader()
      await flushPromises()

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
      await flushPromises()

      expect(slidePageMock).toHaveBeenCalledTimes(1)
      expect(reader.seekToWord).toHaveBeenCalledWith(5)
    })

    test('ArrowLeft at the first spread does not seek — clamped at 0', async () => {
      pagesRef.value = [[makeSlice(0, 0)], [makeSlice(0, 5)]]
      const { reader } = mountPagedReader()
      await flushPromises()

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
      await flushPromises()

      expect(reader.seekToWord).not.toHaveBeenCalled()
      expect(slidePageMock).not.toHaveBeenCalled()
    })

    test('ArrowRight is ignored while the popover is open', async () => {
      pagesRef.value = [[makeSlice(0, 0)], [makeSlice(0, 5)]]
      const reader = makeReader({ popover_open: ref(true) })
      mountPagedReader(reader)
      await flushPromises()

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
      await flushPromises()

      expect(reader.seekToWord).not.toHaveBeenCalled()
    })
  })

  describe('split-band reservation', () => {
    test('reserves the band via setBand on first measure, then resizeBand on a change', async () => {
      displayModeRef.value = 'fixed'
      const { wrapper } = mountPagedReader()
      await flushPromises()
      expect(wrapper.find('[data-testid="paged-reader__split"]').exists()).toBe(true)

      // The watcher only fires on a *change* — the footprint must move after
      // mount, not just start non-zero, to exercise the first-measure branch.
      pageFootprintRef.value = [40]
      await flushPromises()

      expect(setBandMock).toHaveBeenCalledTimes(1)
      expect(setBandMock.mock.calls[0][1]).toBe(40)

      pageFootprintRef.value = [60]
      await flushPromises()

      expect(resizeBandMock).toHaveBeenCalledTimes(1)
      expect(resizeBandMock.mock.calls[0][1]).toBe(60)
    })

    test('no split dock renders and no band call happens outside fixed mode', async () => {
      displayModeRef.value = 'inline'
      const { wrapper } = mountPagedReader()
      await flushPromises()

      pageFootprintRef.value = [40]
      await flushPromises()

      expect(wrapper.find('[data-testid="paged-reader__split"]').exists()).toBe(false)
      expect(setBandMock).not.toHaveBeenCalled()
    })
  })
})
