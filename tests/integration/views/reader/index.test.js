import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import ReaderView from '@/views/reader/index.vue'
import ReaderControls from '@/views/reader/controls.vue'
import ReaderSettings from '@/views/reader/reader-settings.vue'
import PageStrip from '@/views/reader/page-strip.vue'
import BookMeasure from '@/views/reader/book-measure.vue'
import ReaderSkeleton from '@/views/reader/skeleton.vue'
import TermSheet from '@/views/reader/term-popover/term-sheet.vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const {
  mockUseLessonReader,
  mockUseReaderProgress,
  mockUsePagination,
  mockUsePageAudioSync,
  mockUseWordSelection
} = vi.hoisted(() => ({
  mockUseLessonReader: vi.fn(),
  mockUseReaderProgress: vi.fn(),
  mockUsePagination: vi.fn(),
  mockUsePageAudioSync: vi.fn(),
  mockUseWordSelection: vi.fn()
}))

vi.mock('@/views/reader/composables/lesson-reader', () => ({
  useLessonReader: mockUseLessonReader,
  lessonReaderKey: Symbol('lessonReader')
}))

vi.mock('@/views/reader/composables/reader-progress', () => ({
  useReaderProgress: mockUseReaderProgress
}))

vi.mock('@/views/reader/composables/pagination', () => ({
  usePagination: mockUsePagination
}))

vi.mock('@/views/reader/composables/reader-sync', () => ({
  usePageAudioSync: mockUsePageAudioSync
}))

vi.mock('@/views/reader/composables/resize-freeze', () => ({
  useResizeFreeze: () => ({
    viewport_width: ref(1000),
    viewport_height: ref(800),
    frozen: ref(false)
  })
}))

vi.mock('@/composables/audio-reader/word-selection', () => ({
  useWordSelection: mockUseWordSelection
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makePlayer(overrides = {}) {
  return {
    current_time: ref(0),
    duration: ref(120),
    is_playing: ref(false),
    playback_rate: ref(1),
    loaded: ref(true),
    play: vi.fn(),
    pause: vi.fn(),
    seek: vi.fn(),
    resumeAt: vi.fn(),
    skip: vi.fn(),
    setPlaybackRate: vi.fn(),
    playClip: vi.fn(),
    ...overrides
  }
}

function makeReader(overrides = {}) {
  return {
    lesson: ref({ id: 1 }),
    paragraphs: ref([]),
    matches: ref(new Map()),
    audio_url: ref('https://example.test/audio.mp3'),
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
    player: makePlayer(),
    ...overrides
  }
}

function mountReader({
  reader = makeReader(),
  restored = true,
  page_count = 3,
  pages = [],
  pageIndexOfWord = () => 0,
  onTurn = vi.fn()
} = {}) {
  mockUseLessonReader.mockReturnValue(reader)
  mockUseReaderProgress.mockReturnValue({ restored: ref(restored) })
  mockUsePagination.mockReturnValue({
    pages: ref(pages),
    page_count: ref(page_count),
    pageFootprints: ref([]),
    pageIndexOfWord
  })
  mockUsePageAudioSync.mockReturnValue({ desired_spread: ref(0), onTurn })
  mockUseWordSelection.mockReturnValue({
    onPointerDown: vi.fn(),
    onPointerMove: vi.fn(),
    onPointerUp: vi.fn(),
    onPointerLeave: vi.fn(),
    onPointerCancel: vi.fn()
  })

  return shallowMount(ReaderView, { props: { collectionId: '1', lessonId: '2' } })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ReaderView', () => {
  test('renders the reader root and viewport', () => {
    const wrapper = mountReader()

    expect(wrapper.find('[data-testid="reader"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="reader__viewport"]').exists()).toBe(true)
  })

  test('shows the skeleton while the lesson has not loaded', () => {
    const wrapper = mountReader({ reader: makeReader({ lesson: ref(null) }) })

    expect(wrapper.findComponent(ReaderSkeleton).exists()).toBe(true)
  })

  test('shows the skeleton while progress has not been restored yet', () => {
    const wrapper = mountReader({ restored: false })

    expect(wrapper.findComponent(ReaderSkeleton).exists()).toBe(true)
  })

  test('shows the skeleton while pagination has not produced any pages yet', () => {
    const wrapper = mountReader({ page_count: 0 })

    expect(wrapper.findComponent(ReaderSkeleton).exists()).toBe(true)
  })

  test('hides the skeleton once the lesson is loaded, restored, and paginated', () => {
    const wrapper = mountReader({ restored: true, page_count: 3 })

    expect(wrapper.findComponent(ReaderSkeleton).exists()).toBe(false)
  })

  test('binds the audio element src to the reader audio_url', () => {
    const reader = makeReader({ audio_url: ref('https://example.test/lesson.mp3') })
    const wrapper = mountReader({ reader })

    expect(wrapper.find('[data-testid="reader__audio"]').attributes('src')).toBe(
      'https://example.test/lesson.mp3'
    )
  })

  test('opening settings from the controls shows the settings sheet, closing it hides it', async () => {
    const wrapper = mountReader()

    expect(wrapper.find('[data-testid="reader__settings"]').exists()).toBe(false)

    await wrapper.findComponent(ReaderControls).vm.$emit('open-settings')
    expect(wrapper.find('[data-testid="reader__settings"]').exists()).toBe(true)

    await wrapper.findComponent(ReaderSettings).vm.$emit('close')
    expect(wrapper.find('[data-testid="reader__settings"]').exists()).toBe(false)
  })

  test('forwards a page-strip turn event to the composable-provided onTurn handler', async () => {
    const onTurn = vi.fn()
    const wrapper = mountReader({ onTurn })

    await wrapper.findComponent(PageStrip).vm.$emit('turn', 2)

    expect(onTurn).toHaveBeenCalledWith(2)
  })

  test('passes the lesson paragraphs through to book-measure', () => {
    const paragraphs = ref([{ index: 0, sentence: 'hi', start: 0, end: 1, words: [] }])
    const wrapper = mountReader({ reader: makeReader({ paragraphs }) })

    expect(wrapper.findComponent(BookMeasure).props('paragraphs')).toEqual(paragraphs.value)
  })

  test('passes the pagination page_count through to page-strip', () => {
    const wrapper = mountReader({ page_count: 5 })

    expect(wrapper.findComponent(PageStrip).props('pageCount')).toBe(5)
  })

  test('forwards the popover selection and open state to the term sheet', () => {
    const selection = ref({ term: 'hi', word_index: 0, word_end_index: 0 })
    const reader = makeReader({ selection, popover_open: ref(true) })
    const wrapper = mountReader({ reader })

    const sheet = wrapper.findComponent(TermSheet)
    expect(sheet.props('selection')).toEqual(selection.value)
    expect(sheet.props('open')).toBe(true)
  })

  test('closing the settings sheet via the backdrop hides it', async () => {
    const wrapper = mountReader()

    await wrapper.findComponent(ReaderControls).vm.$emit('open-settings')
    expect(wrapper.find('[data-testid="reader__settings"]').exists()).toBe(true)

    const backdrop = wrapper.find('[data-testid="reader__settings"] .absolute.inset-0')
    await backdrop.trigger('pointerdown')
    await flushPromises()

    expect(wrapper.find('[data-testid="reader__settings"]').exists()).toBe(false)
  })

  test('spreadOfWord resolves a negative word index to the current desired spread', () => {
    mountReader()

    const { spreadOfWord } = mockUsePageAudioSync.mock.calls.at(-1)[0]
    expect(spreadOfWord(-1)).toBe(0)
  })

  test('spreadOfWord maps a word to its page spread — two pages per spread at this viewport', () => {
    mountReader({ pageIndexOfWord: () => 2 })

    const { spreadOfWord } = mockUsePageAudioSync.mock.calls.at(-1)[0]
    expect(spreadOfWord(5)).toBe(1)
  })

  test("firstWordOfSpread reads the spread's primary page word_start_index — two pages per spread at this viewport", () => {
    mountReader({
      pages: [{ word_start_index: 0 }, { word_start_index: 6 }, { word_start_index: 12 }]
    })

    const { firstWordOfSpread } = mockUsePageAudioSync.mock.calls.at(-1)[0]
    expect(firstWordOfSpread(1)).toBe(12)
  })

  test('firstWordOfSpread is undefined past the last page', () => {
    mountReader({ pages: [{ word_start_index: 0 }] })

    const { firstWordOfSpread } = mockUsePageAudioSync.mock.calls.at(-1)[0]
    expect(firstWordOfSpread(5)).toBeUndefined()
  })

  test('matchRangeAt returns the matched span for a word carrying one', () => {
    const matches = new Map([[3, { lo: 3, hi: 4, deck_ids: [] }]])
    mountReader({ reader: makeReader({ matches: ref(matches) }) })

    const { matchRangeAt } = mockUseWordSelection.mock.calls.at(-1)[0]
    expect(matchRangeAt(3)).toEqual({ lo: 3, hi: 4 })
  })

  test('matchRangeAt is null for a word with no match', () => {
    mountReader({ reader: makeReader({ matches: ref(new Map()) }) })

    const { matchRangeAt } = mockUseWordSelection.mock.calls.at(-1)[0]
    expect(matchRangeAt(3)).toBeNull()
  })
})
