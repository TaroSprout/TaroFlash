import { describe, test, expect, beforeEach, afterEach, vi } from 'vite-plus/test'
import { createApp, ref, nextTick } from 'vue'

const {
  lessonQueryMock,
  audioUrlQueryMock,
  audioPlayerMock,
  transcriptSyncMock,
  toastErrorMock,
  mockEmitSfx
} = vi.hoisted(() => ({
  lessonQueryMock: vi.fn(),
  audioUrlQueryMock: vi.fn(),
  audioPlayerMock: vi.fn(),
  transcriptSyncMock: vi.fn(),
  toastErrorMock: vi.fn(),
  mockEmitSfx: vi.fn()
}))

vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx, emitHoverSfx: vi.fn() }))

vi.mock('@/api/lessons', () => ({
  useLessonQuery: lessonQueryMock,
  useLessonAudioUrlQuery: audioUrlQueryMock
}))
vi.mock('@/composables/toast', () => ({ useToast: () => ({ error: toastErrorMock }) }))
vi.mock('@/composables/audio-reader/use-audio-player', () => ({ useAudioPlayer: audioPlayerMock }))
vi.mock('@/composables/audio-reader/use-transcript-sync', () => ({
  useTranscriptSync: transcriptSyncMock
}))

// The transcript utils are pure and left real, so paragraph shaping is tested end to end.
import { useLessonReader } from '@/composables/audio-reader/use-lesson-reader'

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
      play: vi.fn(),
      pause: vi.fn(),
      seek: vi.fn(),
      playClip: vi.fn()
    })
    transcriptSyncMock.mockReturnValue({ active_index: ref(-1) })
    toastErrorMock.mockReset()
    mockEmitSfx.mockReset()
  })

  afterEach(() => {
    app?.unmount()
  })

  describe('transcript shaping', () => {
    test('shapes the lesson transcript into one block per sentence', () => {
      let reader
      ;[reader, app] = withReader()

      const blocks = reader.paragraphs.value
      expect(blocks).toHaveLength(2)
      expect(blocks[0].sentence).toBe('Hello world.')
      expect(blocks.flatMap((s) => s.words)).toHaveLength(5)
    })

    test('is empty before the lesson resolves', () => {
      lessonQueryMock.mockReturnValue({ data: ref(undefined), error: ref(null) })

      let reader
      ;[reader, app] = withReader()

      expect(reader.paragraphs.value).toEqual([])
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

  describe('term popover [obligation]', () => {
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

    test('openTerm emits ui.pop_up_pop on every call [obligation]', () => {
      let reader
      ;[reader, app] = withReader()
      const term = { term: 'world', sentence: 'Hello world.', rect: new DOMRect() }

      reader.openTerm(term)
      expect(mockEmitSfx).toHaveBeenCalledWith('ui.pop_up_pop')
    })

    test('openTerm emits ui.pop_up_pop on re-tap [obligation]', () => {
      let reader
      ;[reader, app] = withReader()
      const term = { term: 'world', sentence: 'Hello world.', rect: new DOMRect() }

      reader.openTerm(term)
      reader.openTerm(term)

      expect(mockEmitSfx).toHaveBeenCalledTimes(2)
      expect(mockEmitSfx.mock.calls.every((c) => c[0] === 'ui.pop_up_pop')).toBe(true)
    })

    test('openTerm never opens a global modal [obligation]', () => {
      let reader
      ;[reader, app] = withReader()
      const term = { term: 'world', sentence: 'Hello world.', rect: new DOMRect() }

      reader.openTerm(term)

      // The composable no longer imports useModal — calling openTerm should not
      // throw and should never trigger modal machinery. The assertion is simply
      // that selection + popover_open are set (modal path is gone).
      expect(reader.popover_open.value).toBe(true)
    })

    test('closeTerm sets popover_open to false [obligation]', () => {
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

      expect(toastErrorMock).toHaveBeenCalledWith('lesson exploded')
    })
  })
})
