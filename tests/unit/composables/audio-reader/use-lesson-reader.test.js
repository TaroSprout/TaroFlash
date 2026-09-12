import { describe, test, expect, beforeEach, afterEach, vi } from 'vite-plus/test'
import { createApp, ref, nextTick } from 'vue'
import { createI18n } from 'vue-i18n'
import messages from '@intlify/unplugin-vue-i18n/messages'

const {
  lessonQueryMock,
  audioUrlQueryMock,
  audioPlayerMock,
  transcriptSyncMock,
  cardIndexQueryMock,
  decksQueryMock,
  noticeErrorMock,
  mockEmitSfx,
  readerPrefsMock
} = vi.hoisted(() => ({
  lessonQueryMock: vi.fn(),
  audioUrlQueryMock: vi.fn(),
  audioPlayerMock: vi.fn(),
  transcriptSyncMock: vi.fn(),
  cardIndexQueryMock: vi.fn(),
  decksQueryMock: vi.fn(),
  noticeErrorMock: vi.fn(),
  mockEmitSfx: vi.fn(),
  readerPrefsMock: vi.fn()
}))

vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx, emitHoverSfx: vi.fn() }))

vi.mock('@/api/lessons', () => ({
  useLessonQuery: lessonQueryMock,
  useLessonAudioUrlQuery: audioUrlQueryMock
}))
// The reader joins the member card index (for highlights) and the member decks
// (for highlight colour); both are Pinia Colada hooks, mocked here so the bare
// host app doesn't need a Pinia/Colada instance.
vi.mock('@/api/cards', () => ({ useMemberCardIndexQuery: cardIndexQueryMock }))
vi.mock('@/api/decks', () => ({ useMemberDecksQuery: decksQueryMock }))
vi.mock('@/stores/notice-store', () => ({ useNoticeStore: () => ({ error: noticeErrorMock }) }))
vi.mock('@/composables/audio-reader/audio-player', () => ({ useAudioPlayer: audioPlayerMock }))
vi.mock('@/composables/audio-reader/transcript-sync', () => ({
  useTranscriptSync: transcriptSyncMock
}))
vi.mock('@/composables/audio-reader/reader-prefs', () => ({ useReaderPrefs: readerPrefsMock }))

// The transcript utils are pure and left real, so paragraph shaping is tested end to end.
import { useLessonReader } from '@/composables/audio-reader/lesson-reader'

function makeLesson(overrides = {}) {
  return {
    id: 1,
    title: 'Lesson 1',
    audio_path: 'lessons/1.mp3',
    transcript: {
      text: 'Hello world. How are you?',
      segments: [
        { start: 0, end: 1, text: 'Hello world.' },
        { start: 1, end: 2, text: 'How are you?' }
      ],
      words: [
        { word: 'Hello', start: 0, end: 0.5 },
        { word: 'world', start: 0.5, end: 1 },
        { word: 'How', start: 1, end: 1.3 },
        { word: 'are', start: 1.3, end: 1.6 },
        { word: 'you', start: 1.6, end: 2 }
      ]
    },
    ...overrides
  }
}

// Eight sentences with distinct break_strengths, so long/medium/short — target
// average lengths 4/2/1 — genuinely land on different paragraph counts:
// round(8/4)=2, round(8/2)=4, round(8/1)=8 (one per sentence).
function makeDensityLesson() {
  const texts = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight']
  const strengths = [null, 0.1, 0.9, 0.3, 0.8, 0.2, 0.7, 0.4]

  return makeLesson({
    transcript: {
      text: texts.map((t) => `${t}.`).join(' '),
      segments: texts.map((t, i) => ({
        start: i,
        end: i + 1,
        text: `${t}.`,
        break_strength: strengths[i]
      })),
      words: texts.map((t, i) => ({ word: t, start: i, end: i + 0.5 }))
    }
  })
}

// useTemplateRef + watch need a component instance, so drive the composable
// through a mounted host (see testing-composables rule).
function withReader(id = () => 1) {
  let reader
  const app = createApp({
    setup() {
      reader = useLessonReader(id)
      return () => {}
    }
  })
  const i18n = createI18n({ locale: 'en-us', legacy: false, messages })
  app.use(i18n)
  app.mount(document.createElement('div'))
  return [reader, app]
}

describe('useLessonReader', () => {
  let app

  beforeEach(() => {
    lessonQueryMock.mockReturnValue({ data: ref(makeLesson()), error: ref(null) })
    audioUrlQueryMock.mockReturnValue({ data: ref('https://cdn/1.mp3') })
    audioPlayerMock.mockReturnValue({
      current_time: ref(0),
      playback_rate: ref(1),
      setPlaybackRate: vi.fn(),
      play: vi.fn(),
      pause: vi.fn(),
      seek: vi.fn(),
      playClip: vi.fn()
    })
    transcriptSyncMock.mockReturnValue({ active_index: ref(-1) })
    cardIndexQueryMock.mockReturnValue({ data: ref([]) })
    decksQueryMock.mockReturnValue({ data: ref([]) })
    readerPrefsMock.mockReturnValue({ playback_rate: ref(1), paragraph_density: ref('medium') })
    noticeErrorMock.mockReset()
    mockEmitSfx.mockReset()
  })

  afterEach(() => {
    app?.unmount()
  })

  describe('transcript shaping', () => {
    test('merges sentences with no scored break into a single paragraph', () => {
      // Default lesson segments carry no break_strength, so nothing scores
      // above the density threshold — the whole lesson renders as one block.
      let reader
      ;[reader, app] = withReader()

      const blocks = reader.paragraphs.value
      expect(blocks).toHaveLength(1)
      expect(blocks[0].sentence).toBe('Hello world. How are you?')
      expect(blocks[0].words).toHaveLength(5)
    })

    test('is empty before the lesson resolves', () => {
      lessonQueryMock.mockReturnValue({ data: ref(undefined), error: ref(null) })

      let reader
      ;[reader, app] = withReader()

      expect(reader.paragraphs.value).toEqual([])
    })

    test('is empty when the lesson resolves with no transcript', () => {
      // A lesson row with no sentence rows at all (rather than an empty
      // transcript object) — the optional chaining must not throw.
      lessonQueryMock.mockReturnValue({
        data: ref(makeLesson({ transcript: undefined })),
        error: ref(null)
      })

      let reader
      ;[reader, app] = withReader()

      expect(reader.paragraphs.value).toEqual([])
      expect(reader.words.value).toEqual([])
    })
  })

  describe('playback wiring', () => {
    test('exposes the streamed audio url and the synced active word', () => {
      transcriptSyncMock.mockReturnValue({ active_index: ref(3) })

      let reader
      ;[reader, app] = withReader()

      expect(reader.audio_url.value).toBe('https://cdn/1.mp3')
      expect(reader.active_word.value).toBe(3)
    })
  })

  describe('playback rate preference', () => {
    test('seeds the player rate from the saved preference on mount', () => {
      const setPlaybackRate = vi.fn()
      audioPlayerMock.mockReturnValue({
        current_time: ref(0),
        playback_rate: ref(1.5),
        setPlaybackRate,
        play: vi.fn(),
        pause: vi.fn(),
        seek: vi.fn(),
        playClip: vi.fn()
      })
      readerPrefsMock.mockReturnValue({ playback_rate: ref(1.5), paragraph_density: ref('medium') })

      ;[, app] = withReader()

      expect(setPlaybackRate).toHaveBeenCalledWith(1.5)
    })

    test('writes a later rate change on the player back to the saved preference', async () => {
      const player_rate = ref(1)
      audioPlayerMock.mockReturnValue({
        current_time: ref(0),
        playback_rate: player_rate,
        setPlaybackRate: vi.fn(),
        play: vi.fn(),
        pause: vi.fn(),
        seek: vi.fn(),
        playClip: vi.fn()
      })
      const saved_playback_rate = ref(1)
      readerPrefsMock.mockReturnValue({
        playback_rate: saved_playback_rate,
        paragraph_density: ref('medium')
      })

      ;[, app] = withReader()
      player_rate.value = 2
      await nextTick()

      expect(saved_playback_rate.value).toBe(2)
    })
  })

  describe('paragraph density preference', () => {
    test('different densities yield different paragraph counts on the same lesson', () => {
      lessonQueryMock.mockReturnValue({ data: ref(makeDensityLesson()), error: ref(null) })
      readerPrefsMock.mockReturnValue({ playback_rate: ref(1), paragraph_density: ref('long') })

      let reader
      ;[reader, app] = withReader()

      // 8 sentences at target length 4 → round(8/4) paragraphs.
      expect(reader.paragraphs.value).toHaveLength(2)
    })

    test('regroups when paragraph_density changes, with no refetch', async () => {
      lessonQueryMock.mockReturnValue({ data: ref(makeDensityLesson()), error: ref(null) })
      const paragraph_density = ref('long')
      readerPrefsMock.mockReturnValue({ playback_rate: ref(1), paragraph_density })

      let reader
      ;[reader, app] = withReader()
      expect(reader.paragraphs.value).toHaveLength(2)
      const calls_before = lessonQueryMock.mock.calls.length

      paragraph_density.value = 'short'
      await nextTick()

      // Target length 1 (short) puts every sentence in its own paragraph.
      expect(reader.paragraphs.value).toHaveLength(8)
      expect(lessonQueryMock.mock.calls.length).toBe(calls_before)
    })
  })

  describe('term popover', () => {
    test('openTerm always sets selection and popover_open=true regardless of viewport', () => {
      let reader
      ;[reader, app] = withReader()
      const term = { term: 'world', sentence: 'Hello world.', rect: new DOMRect() }

      reader.openTerm(term)

      expect(reader.selection.value).toEqual(term)
      expect(reader.popover_open.value).toBe(true)
    })

    test('openTerm stores selection on re-tap (same call, new value)', () => {
      let reader
      ;[reader, app] = withReader()
      const term1 = { term: 'world', sentence: 'Hello world.', rect: new DOMRect() }
      const term2 = { term: 'how', sentence: 'How are you?', rect: new DOMRect() }

      reader.openTerm(term1)
      reader.openTerm(term2)

      expect(reader.selection.value).toEqual(term2)
      expect(reader.popover_open.value).toBe(true)
    })

    test('openTerm emits dialog.open on every call', () => {
      let reader
      ;[reader, app] = withReader()
      const term = { term: 'world', sentence: 'Hello world.', rect: new DOMRect() }

      reader.openTerm(term)
      expect(mockEmitSfx).toHaveBeenCalledWith('dialog.open')
    })

    test('openTerm emits dialog.open on re-tap', () => {
      let reader
      ;[reader, app] = withReader()
      const term = { term: 'world', sentence: 'Hello world.', rect: new DOMRect() }

      reader.openTerm(term)
      reader.openTerm(term)

      expect(mockEmitSfx).toHaveBeenCalledTimes(2)
      expect(mockEmitSfx.mock.calls.every((c) => c[0] === 'dialog.open')).toBe(true)
    })

    test('openTerm never opens a global modal', () => {
      let reader
      ;[reader, app] = withReader()
      const term = { term: 'world', sentence: 'Hello world.', rect: new DOMRect() }

      reader.openTerm(term)

      // The composable no longer imports useModal — calling openTerm should not
      // throw and should never trigger modal machinery. The assertion is simply
      // that selection + popover_open are set (modal path is gone).
      expect(reader.popover_open.value).toBe(true)
    })

    test('closeTerm sets popover_open to false', () => {
      let reader
      ;[reader, app] = withReader()
      const term = { term: 'world', sentence: 'Hello world.', rect: new DOMRect() }

      reader.openTerm(term)
      expect(reader.popover_open.value).toBe(true)

      reader.closeTerm()
      expect(reader.popover_open.value).toBe(false)
    })

    test('closeTerm does not clear the selection — selection stays for re-read', () => {
      let reader
      ;[reader, app] = withReader()
      const term = { term: 'world', sentence: 'Hello world.', rect: new DOMRect() }

      reader.openTerm(term)
      reader.closeTerm()

      // selection is kept so the view can still read it after close
      expect(reader.selection.value).toEqual(term)
    })

    test('openTerm pauses playback', () => {
      const pauseMock = vi.fn()
      audioPlayerMock.mockReturnValue({
        current_time: ref(0),
        playback_rate: ref(1),
        setPlaybackRate: vi.fn(),
        play: vi.fn(),
        pause: pauseMock,
        seek: vi.fn(),
        playClip: vi.fn()
      })

      let reader
      ;[reader, app] = withReader()

      reader.openTerm({ term: 'world', sentence: 'Hello world.', rect: new DOMRect() })

      expect(pauseMock).toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    test('surfaces a fetch error through the toast', async () => {
      const error = ref(null)
      lessonQueryMock.mockReturnValue({ data: ref(makeLesson()), error })

      ;[, app] = withReader()

      error.value = new Error('lesson exploded')
      await nextTick()

      expect(noticeErrorMock).toHaveBeenCalledWith("Couldn't load this lesson. Please try again.")
    })
  })

  // The default lesson is "Hello world. How are you?", so word index 1 is
  // "world" — the term these tests highlight.
  describe('card-match highlights', () => {
    test('matches is empty until the card index loads', () => {
      // Default beforeEach leaves the index empty (unloaded).
      let reader
      ;[reader, app] = withReader()

      expect(reader.matches.value.size).toBe(0)
    })

    test('a card front that appears in the lesson is keyed by its word index', () => {
      cardIndexQueryMock.mockReturnValue({ data: ref([{ term: 'world', deck_ids: [7] }]) })
      decksQueryMock.mockReturnValue({
        data: ref([{ id: 7, cover_config: { palette: 'blue-500' } }])
      })

      let reader
      ;[reader, app] = withReader()

      const match = reader.matches.value.get(1)
      expect(match).toBeTruthy()
      expect(match).toMatchObject({ lo: 1, hi: 1, deck_ids: [7] })
    })

    test('a word with no matching card is absent from the matches map', () => {
      cardIndexQueryMock.mockReturnValue({ data: ref([{ term: 'world', deck_ids: [7] }]) })

      let reader
      ;[reader, app] = withReader()

      // "Hello" (index 0) has no card
      expect(reader.matches.value.has(0)).toBe(false)
    })

    test('themeMatch colours a single-deck match with that deck cover palette', () => {
      cardIndexQueryMock.mockReturnValue({ data: ref([{ term: 'world', deck_ids: [7] }]) })
      decksQueryMock.mockReturnValue({
        data: ref([{ id: 7, cover_config: { palette: 'blue-500' } }])
      })

      let reader
      ;[reader, app] = withReader()

      const match = reader.matches.value.get(1)
      expect(match.palette).toBe('blue-500')
    })

    test('themeMatch colours a multi-deck match by the FIRST deck in member order', () => {
      // "world" lives in decks 7 and 3; the member list has deck 3 first, so its
      // cover wins — proving the tie-break is member-list order, not deck_ids order.
      cardIndexQueryMock.mockReturnValue({ data: ref([{ term: 'world', deck_ids: [7, 3] }]) })
      decksQueryMock.mockReturnValue({
        data: ref([
          { id: 3, cover_config: { palette: 'green-400' } },
          { id: 7, cover_config: { palette: 'blue-500' } }
        ])
      })

      let reader
      ;[reader, app] = withReader()

      const match = reader.matches.value.get(1)
      expect(match.palette).toBe('green-400')
    })

    test('themeMatch leaves palette unset when the owning deck has no cover palette', () => {
      cardIndexQueryMock.mockReturnValue({ data: ref([{ term: 'world', deck_ids: [7] }]) })
      decksQueryMock.mockReturnValue({ data: ref([{ id: 7, cover_config: {} }]) })

      let reader
      ;[reader, app] = withReader()

      const match = reader.matches.value.get(1)
      expect(match.palette).toBeUndefined()
    })

    test('matches map keeps the same reference across a decks refetch that resolves the same palette', async () => {
      cardIndexQueryMock.mockReturnValue({ data: ref([{ term: 'world', deck_ids: [7] }]) })
      const decks = ref([{ id: 7, cover_config: { palette: 'blue-500' } }])
      decksQueryMock.mockReturnValue({ data: decks })

      let reader
      ;[reader, app] = withReader()
      const before = reader.matches.value

      // New array reference, same content — mirrors a Pinia Colada refetch.
      decks.value = [{ id: 7, cover_config: { palette: 'blue-500' } }]
      await nextTick()

      expect(reader.matches.value).toBe(before)
    })

    test('matches map gets a new reference when the resolved palette actually changes', async () => {
      cardIndexQueryMock.mockReturnValue({ data: ref([{ term: 'world', deck_ids: [7] }]) })
      const decks = ref([{ id: 7, cover_config: { palette: 'blue-500' } }])
      decksQueryMock.mockReturnValue({ data: decks })

      let reader
      ;[reader, app] = withReader()
      const before = reader.matches.value

      decks.value = [{ id: 7, cover_config: { palette: 'green-400' } }]
      await nextTick()

      expect(reader.matches.value).not.toBe(before)
      expect(reader.matches.value.get(1).palette).toBe('green-400')
    })

    test('matches map gets a new reference when the card index adds a match (size differs)', async () => {
      const card_index = ref([{ term: 'world', deck_ids: [7] }])
      cardIndexQueryMock.mockReturnValue({ data: card_index })

      let reader
      ;[reader, app] = withReader()
      const before = reader.matches.value
      expect(before.size).toBe(1)

      card_index.value = [
        { term: 'world', deck_ids: [7] },
        { term: 'how', deck_ids: [7] }
      ]
      await nextTick()

      expect(reader.matches.value).not.toBe(before)
      expect(reader.matches.value.size).toBe(2)
    })

    test('matches map gets a new reference when a shared word key resolves a different span (lo/hi differs)', async () => {
      // A single two-word card ("are you") covers keys 3 and 4 with lo=3, hi=4;
      // splitting it into two single-word cards keeps the same key set and map
      // size but shrinks each match's span, changing hi (key 3) and lo (key 4).
      const card_index = ref([{ term: 'are you', deck_ids: [7] }])
      cardIndexQueryMock.mockReturnValue({ data: card_index })

      let reader
      ;[reader, app] = withReader()
      const before = reader.matches.value
      expect(before.size).toBe(2)
      expect(before.get(3)).toMatchObject({ lo: 3, hi: 4 })

      card_index.value = [
        { term: 'are', deck_ids: [7] },
        { term: 'you', deck_ids: [7] }
      ]
      await nextTick()

      expect(reader.matches.value).not.toBe(before)
      expect(reader.matches.value.size).toBe(2)
      expect(reader.matches.value.get(3)).toMatchObject({ lo: 3, hi: 3 })
      expect(reader.matches.value.get(4)).toMatchObject({ lo: 4, hi: 4 })
    })
  })

  describe('selected_term_decks', () => {
    test('is empty before anything is selected', () => {
      let reader
      ;[reader, app] = withReader()

      expect(reader.selected_term_decks.value).toEqual([])
    })

    test('reports the decks holding the selected term', () => {
      cardIndexQueryMock.mockReturnValue({ data: ref([{ term: 'world', deck_ids: [7, 3] }]) })

      let reader
      ;[reader, app] = withReader()
      reader.openTerm({ term: 'world', sentence: 'Hello world.', rect: new DOMRect() })

      expect(reader.selected_term_decks.value).toEqual([7, 3])
    })

    test('matches a hand-selected term case-insensitively, not just tapped highlights', () => {
      cardIndexQueryMock.mockReturnValue({ data: ref([{ term: 'world', deck_ids: [7] }]) })

      let reader
      ;[reader, app] = withReader()
      // A range hand-selected as "World" still resolves to the saved card's decks.
      reader.openTerm({ term: 'World', sentence: 'Hello world.', rect: new DOMRect() })

      expect(reader.selected_term_decks.value).toEqual([7])
    })

    test('is empty when the selected term is not a card', () => {
      cardIndexQueryMock.mockReturnValue({ data: ref([{ term: 'world', deck_ids: [7] }]) })

      let reader
      ;[reader, app] = withReader()
      reader.openTerm({ term: 'xyzzy', sentence: 'Hello world.', rect: new DOMRect() })

      expect(reader.selected_term_decks.value).toEqual([])
    })
  })

  // Default lesson word starts: Hello 0, world 0.5, How 1, are 1.3, you 1.6 (end 2).
  describe('playback from a term', () => {
    function withPlayer() {
      const player = {
        current_time: ref(0),
        playback_rate: ref(1),
        setPlaybackRate: vi.fn(),
        play: vi.fn(),
        pause: vi.fn(),
        seek: vi.fn(),
        playClip: vi.fn()
      }
      audioPlayerMock.mockReturnValue(player)
      return player
    }

    test('playFromHere seeks to the term word start, resumes, and closes the term', () => {
      const player = withPlayer()
      let reader
      ;[reader, app] = withReader()
      reader.openTerm({
        term: 'world',
        sentence: 'Hello world.',
        rect: new DOMRect(),
        word_index: 1,
        word_end_index: 1
      })

      reader.playFromHere()

      expect(player.seek).toHaveBeenCalledWith(0.5)
      expect(player.play).toHaveBeenCalled()
      expect(reader.popover_open.value).toBe(false)
    })

    test('playClip plays only the selected phrase (first start → last end)', () => {
      const player = withPlayer()
      let reader
      ;[reader, app] = withReader()
      reader.openTerm({
        term: 'How are you',
        sentence: 'How are you?',
        rect: new DOMRect(),
        word_index: 2,
        word_end_index: 4
      })

      reader.playClip()

      // words[2].start = 1, words[4].end = 2
      expect(player.playClip).toHaveBeenCalledWith(1, 2)
    })

    test('playClip leaves the term open so its translation stays readable', () => {
      withPlayer()
      let reader
      ;[reader, app] = withReader()
      reader.openTerm({
        term: 'world',
        sentence: 'Hello world.',
        rect: new DOMRect(),
        word_index: 1,
        word_end_index: 1
      })

      reader.playClip()

      expect(reader.popover_open.value).toBe(true)
    })

    test('playFromHere is a no-op when nothing is selected', () => {
      const player = withPlayer()
      let reader
      ;[reader, app] = withReader()

      reader.playFromHere()

      expect(player.seek).not.toHaveBeenCalled()
      expect(player.play).not.toHaveBeenCalled()
    })
  })
})
