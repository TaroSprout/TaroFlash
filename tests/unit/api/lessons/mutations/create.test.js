import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const {
  useMutationSpy,
  invalidateSpy,
  uploadLessonAudioMock,
  deleteLessonAudioMock,
  transcribeAudioMock,
  translateTranscriptMock,
  transliterateTranscriptMock,
  createLessonMock
} = vi.hoisted(() => ({
  useMutationSpy: vi.fn((cfg) => cfg),
  invalidateSpy: vi.fn(),
  uploadLessonAudioMock: vi.fn().mockResolvedValue(undefined),
  deleteLessonAudioMock: vi.fn().mockResolvedValue(undefined),
  transcribeAudioMock: vi.fn(),
  translateTranscriptMock: vi.fn(),
  transliterateTranscriptMock: vi.fn(),
  createLessonMock: vi.fn()
}))

vi.mock('@pinia/colada', () => ({
  useMutation: useMutationSpy,
  useQueryCache: () => ({ invalidateQueries: invalidateSpy })
}))

vi.mock('@/api/lessons/db/audio', () => ({
  uploadLessonAudio: uploadLessonAudioMock,
  deleteLessonAudio: deleteLessonAudioMock
}))

vi.mock('@/api/lessons/db/ai', () => ({
  transcribeAudio: transcribeAudioMock,
  translateTranscript: translateTranscriptMock,
  transliterateTranscript: transliterateTranscriptMock
}))

vi.mock('@/api/lessons/db/lessons', () => ({
  createLesson: createLessonMock
}))

vi.mock('@/stores/member', () => ({
  useMemberStore: () => ({ id: 'member-uuid-1' })
}))

vi.mock('@/utils/uid', () => ({ default: () => 'fixed-uid' }))

import { useCreateLessonMutation } from '@/api/lessons/mutations/create'

beforeEach(() => {
  useMutationSpy.mockClear()
  invalidateSpy.mockClear()
  uploadLessonAudioMock.mockClear()
  deleteLessonAudioMock.mockClear()
  transcribeAudioMock.mockReset()
  translateTranscriptMock.mockReset()
  transliterateTranscriptMock.mockReset()
  createLessonMock.mockReset()
})

function configFrom(hook) {
  hook()
  return useMutationSpy.mock.calls.at(-1)[0]
}

describe('useCreateLessonMutation', () => {
  const file = new File(['audio'], 'lesson.mp3', { type: 'audio/mpeg' })
  const transcribeResult = {
    text: 'Hello world',
    segments: [{ start: 0, end: 1, text: 'Hello world' }],
    words: [],
    lang: 'en'
  }
  const lesson = { id: 1, title: 'My Lesson', audio_path: 'member-uuid-1/fixed-uid.mp3' }
  // Default translation response used by tests that don't care about translation details
  const translateResult = { translations: ['こんにちは世界'] }

  describe('mutation', () => {
    test('calls uploadLessonAudio first with the constructed path', async () => {
      transcribeAudioMock.mockResolvedValueOnce(transcribeResult)
      translateTranscriptMock.mockResolvedValueOnce(translateResult)
      createLessonMock.mockResolvedValueOnce(lesson)

      const { mutation } = configFrom(useCreateLessonMutation)
      await mutation({ title: 'My Lesson', file })

      expect(uploadLessonAudioMock).toHaveBeenCalledWith('member-uuid-1/fixed-uid.mp3', file)
    })

    test('calls transcribeAudio after upload succeeds', async () => {
      const callOrder = []
      uploadLessonAudioMock.mockImplementationOnce(async () => {
        callOrder.push('upload')
      })
      transcribeAudioMock.mockImplementationOnce(async () => {
        callOrder.push('transcribe')
        return transcribeResult
      })
      translateTranscriptMock.mockImplementationOnce(async () => {
        callOrder.push('translate')
        return translateResult
      })
      createLessonMock.mockImplementationOnce(async () => {
        callOrder.push('create')
        return lesson
      })

      const { mutation } = configFrom(useCreateLessonMutation)
      await mutation({ title: 'My Lesson', file })

      expect(callOrder).toEqual(['upload', 'transcribe', 'translate', 'create'])
    })

    test('calls translateTranscript with each segment text after transcribing', async () => {
      const multiSegmentTranscribe = {
        text: 'Hello world. How are you?',
        segments: [
          { start: 0, end: 1, text: 'Hello world.' },
          { start: 1, end: 2, text: 'How are you?' }
        ],
        words: [],
        lang: 'en'
      }
      transcribeAudioMock.mockResolvedValueOnce(multiSegmentTranscribe)
      translateTranscriptMock.mockResolvedValueOnce({
        translations: ['こんにちは世界。', 'お元気ですか？']
      })
      createLessonMock.mockResolvedValueOnce(lesson)

      const { mutation } = configFrom(useCreateLessonMutation)
      await mutation({ title: 'My Lesson', file })

      expect(translateTranscriptMock).toHaveBeenCalledWith({
        sentences: ['Hello world.', 'How are you?'],
        target_lang: 'English'
      })
    })

    test('merges translations onto segments before calling createLesson', async () => {
      const multiSegmentTranscribe = {
        text: 'Hello world. How are you?',
        segments: [
          { start: 0, end: 1, text: 'Hello world.' },
          { start: 1, end: 2, text: 'How are you?' }
        ],
        words: [],
        lang: 'en'
      }
      transcribeAudioMock.mockResolvedValueOnce(multiSegmentTranscribe)
      translateTranscriptMock.mockResolvedValueOnce({
        translations: ['こんにちは世界。', 'お元気ですか？']
      })
      createLessonMock.mockResolvedValueOnce(lesson)

      const { mutation } = configFrom(useCreateLessonMutation)
      await mutation({ title: 'My Lesson', file })

      const call = createLessonMock.mock.calls[0][0]
      expect(call.transcript.segments[0].translation).toBe('こんにちは世界。')
      expect(call.transcript.segments[1].translation).toBe('お元気ですか？')
    })

    test('calls createLesson with transcript data and audio_path', async () => {
      transcribeAudioMock.mockResolvedValueOnce(transcribeResult)
      translateTranscriptMock.mockResolvedValueOnce(translateResult)
      createLessonMock.mockResolvedValueOnce(lesson)

      const { mutation } = configFrom(useCreateLessonMutation)
      await mutation({ title: 'My Lesson', file })

      const call = createLessonMock.mock.calls[0][0]
      expect(call.title).toBe('My Lesson')
      expect(call.audio_path).toBe('member-uuid-1/fixed-uid.mp3')
      expect(call.transcript.text).toBe(transcribeResult.text)
      expect(call.transcript.words).toEqual(transcribeResult.words)
      expect(call.lang).toBe(transcribeResult.lang)
    })

    test('returns the created lesson', async () => {
      transcribeAudioMock.mockResolvedValueOnce(transcribeResult)
      translateTranscriptMock.mockResolvedValueOnce(translateResult)
      createLessonMock.mockResolvedValueOnce(lesson)

      const { mutation } = configFrom(useCreateLessonMutation)
      const result = await mutation({ title: 'My Lesson', file })

      expect(result).toEqual(lesson)
    })

    test('uses the file extension to build the storage path', async () => {
      const wavFile = new File(['audio'], 'lesson.wav', { type: 'audio/wav' })
      transcribeAudioMock.mockResolvedValueOnce(transcribeResult)
      translateTranscriptMock.mockResolvedValueOnce(translateResult)
      createLessonMock.mockResolvedValueOnce(lesson)

      const { mutation } = configFrom(useCreateLessonMutation)
      await mutation({ title: 'My Lesson', file: wavFile })

      expect(uploadLessonAudioMock).toHaveBeenCalledWith('member-uuid-1/fixed-uid.wav', wavFile)
    })
  })

  describe('translation best-effort guard', () => {
    test('still creates the lesson when translateTranscript rejects', async () => {
      transcribeAudioMock.mockResolvedValueOnce(transcribeResult)
      translateTranscriptMock.mockRejectedValueOnce(new Error('AI unavailable'))
      createLessonMock.mockResolvedValueOnce(lesson)

      const { mutation } = configFrom(useCreateLessonMutation)
      const result = await mutation({ title: 'My Lesson', file })

      expect(createLessonMock).toHaveBeenCalledTimes(1)
      expect(result).toEqual(lesson)
    })

    test('passes segments WITHOUT translation to createLesson when translateTranscript rejects', async () => {
      transcribeAudioMock.mockResolvedValueOnce(transcribeResult)
      translateTranscriptMock.mockRejectedValueOnce(new Error('AI unavailable'))
      createLessonMock.mockResolvedValueOnce(lesson)

      const { mutation } = configFrom(useCreateLessonMutation)
      await mutation({ title: 'My Lesson', file })

      const call = createLessonMock.mock.calls[0][0]
      expect(call.transcript.segments[0].translation).toBeUndefined()
    })

    test('does NOT delete the audio when translateTranscript rejects', async () => {
      transcribeAudioMock.mockResolvedValueOnce(transcribeResult)
      translateTranscriptMock.mockRejectedValueOnce(new Error('AI unavailable'))
      createLessonMock.mockResolvedValueOnce(lesson)

      const { mutation } = configFrom(useCreateLessonMutation)
      await mutation({ title: 'My Lesson', file })

      expect(deleteLessonAudioMock).not.toHaveBeenCalled()
    })

    test('does NOT throw when translateTranscript rejects', async () => {
      transcribeAudioMock.mockResolvedValueOnce(transcribeResult)
      translateTranscriptMock.mockRejectedValueOnce(new Error('AI unavailable'))
      createLessonMock.mockResolvedValueOnce(lesson)

      const { mutation } = configFrom(useCreateLessonMutation)
      await expect(mutation({ title: 'My Lesson', file })).resolves.not.toThrow()
    })
  })

  describe('transliteration', () => {
    const wordedTranscribe = {
      text: '猫が好き',
      segments: [{ start: 0, end: 1, text: '猫が好き' }],
      words: [
        { word: '猫', start: 0, end: 0.3 },
        { word: 'が', start: 0.3, end: 0.6 },
        { word: '好き', start: 0.6, end: 0.9 }
      ],
      lang: 'ja'
    }

    test('calls transliterateTranscript with the word tokens and lang', async () => {
      transcribeAudioMock.mockResolvedValueOnce(wordedTranscribe)
      translateTranscriptMock.mockResolvedValueOnce({ translations: ['I like cats'] })
      transliterateTranscriptMock.mockResolvedValueOnce({ readings: ['ねこ', '', 'すき'] })
      createLessonMock.mockResolvedValueOnce(lesson)

      const { mutation } = configFrom(useCreateLessonMutation)
      await mutation({ title: 'My Lesson', file })

      expect(transliterateTranscriptMock).toHaveBeenCalledWith({
        words: ['猫', 'が', '好き'],
        lang: 'ja'
      })
    })

    test('merges readings onto words and drops empty ones before createLesson', async () => {
      transcribeAudioMock.mockResolvedValueOnce(wordedTranscribe)
      translateTranscriptMock.mockResolvedValueOnce({ translations: ['I like cats'] })
      transliterateTranscriptMock.mockResolvedValueOnce({ readings: ['ねこ', '', 'すき'] })
      createLessonMock.mockResolvedValueOnce(lesson)

      const { mutation } = configFrom(useCreateLessonMutation)
      await mutation({ title: 'My Lesson', file })

      const words = createLessonMock.mock.calls[0][0].transcript.words
      expect(words[0].reading).toBe('ねこ')
      expect(words[1].reading).toBeUndefined()
      expect(words[2].reading).toBe('すき')
    })

    test('skips transliteration when there are no words', async () => {
      transcribeAudioMock.mockResolvedValueOnce(transcribeResult)
      translateTranscriptMock.mockResolvedValueOnce(translateResult)
      createLessonMock.mockResolvedValueOnce(lesson)

      const { mutation } = configFrom(useCreateLessonMutation)
      await mutation({ title: 'My Lesson', file })

      expect(transliterateTranscriptMock).not.toHaveBeenCalled()
    })

    test('still creates the lesson with unread words when transliterateTranscript rejects', async () => {
      transcribeAudioMock.mockResolvedValueOnce(wordedTranscribe)
      translateTranscriptMock.mockResolvedValueOnce({ translations: ['I like cats'] })
      transliterateTranscriptMock.mockRejectedValueOnce(new Error('AI unavailable'))
      createLessonMock.mockResolvedValueOnce(lesson)

      const { mutation } = configFrom(useCreateLessonMutation)
      const result = await mutation({ title: 'My Lesson', file })

      expect(result).toEqual(lesson)
      expect(deleteLessonAudioMock).not.toHaveBeenCalled()
      const words = createLessonMock.mock.calls[0][0].transcript.words
      expect(words.every((w) => w.reading === undefined)).toBe(true)
    })
  })

  describe('error cleanup', () => {
    test('calls deleteLessonAudio when transcribeAudio throws', async () => {
      const transcribeError = new Error('transcribe failed')
      transcribeAudioMock.mockRejectedValueOnce(transcribeError)

      const { mutation } = configFrom(useCreateLessonMutation)
      await expect(mutation({ title: 'My Lesson', file })).rejects.toThrow('transcribe failed')

      expect(deleteLessonAudioMock).toHaveBeenCalledWith('member-uuid-1/fixed-uid.mp3')
    })

    test('calls deleteLessonAudio when createLesson throws', async () => {
      transcribeAudioMock.mockResolvedValueOnce(transcribeResult)
      translateTranscriptMock.mockResolvedValueOnce(translateResult)
      createLessonMock.mockRejectedValueOnce(new Error('db error'))

      const { mutation } = configFrom(useCreateLessonMutation)
      await expect(mutation({ title: 'My Lesson', file })).rejects.toThrow('db error')

      expect(deleteLessonAudioMock).toHaveBeenCalledWith('member-uuid-1/fixed-uid.mp3')
    })

    test('rethrows the original error after cleanup', async () => {
      const transcribeError = new Error('edge function bombed')
      transcribeAudioMock.mockRejectedValueOnce(transcribeError)

      const { mutation } = configFrom(useCreateLessonMutation)
      await expect(mutation({ title: 'My Lesson', file })).rejects.toBe(transcribeError)
    })

    test('does not call createLesson when transcribeAudio fails', async () => {
      transcribeAudioMock.mockRejectedValueOnce(new Error('fail'))

      const { mutation } = configFrom(useCreateLessonMutation)
      await expect(mutation({ title: 'My Lesson', file })).rejects.toThrow()

      expect(createLessonMock).not.toHaveBeenCalled()
    })
  })

  describe('onSettled', () => {
    test('invalidates ["lessons"] query on success', () => {
      const { onSettled } = configFrom(useCreateLessonMutation)
      onSettled(lesson, undefined, { title: 'My Lesson', file })
      expect(invalidateSpy).toHaveBeenCalledWith({ key: ['lessons'] })
    })

    test('invalidates ["lessons"] query on error', () => {
      const { onSettled } = configFrom(useCreateLessonMutation)
      onSettled(undefined, new Error('boom'), { title: 'My Lesson', file })
      expect(invalidateSpy).toHaveBeenCalledWith({ key: ['lessons'] })
    })
  })
})
