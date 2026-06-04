import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const {
  useMutationSpy,
  invalidateSpy,
  uploadLessonAudioMock,
  deleteLessonAudioMock,
  transcribeAudioMock,
  createLessonMock
} = vi.hoisted(() => ({
  useMutationSpy: vi.fn((cfg) => cfg),
  invalidateSpy: vi.fn(),
  uploadLessonAudioMock: vi.fn().mockResolvedValue(undefined),
  deleteLessonAudioMock: vi.fn().mockResolvedValue(undefined),
  transcribeAudioMock: vi.fn(),
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
  transcribeAudio: transcribeAudioMock
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

  describe('mutation', () => {
    test('calls uploadLessonAudio first with the constructed path', async () => {
      transcribeAudioMock.mockResolvedValueOnce(transcribeResult)
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
      createLessonMock.mockImplementationOnce(async () => {
        callOrder.push('create')
        return lesson
      })

      const { mutation } = configFrom(useCreateLessonMutation)
      await mutation({ title: 'My Lesson', file })

      expect(callOrder).toEqual(['upload', 'transcribe', 'create'])
    })

    test('calls createLesson with transcript data and audio_path', async () => {
      transcribeAudioMock.mockResolvedValueOnce(transcribeResult)
      createLessonMock.mockResolvedValueOnce(lesson)

      const { mutation } = configFrom(useCreateLessonMutation)
      await mutation({ title: 'My Lesson', file })

      expect(createLessonMock).toHaveBeenCalledWith({
        title: 'My Lesson',
        audio_path: 'member-uuid-1/fixed-uid.mp3',
        transcript: {
          text: transcribeResult.text,
          segments: transcribeResult.segments,
          words: transcribeResult.words
        },
        lang: transcribeResult.lang
      })
    })

    test('returns the created lesson', async () => {
      transcribeAudioMock.mockResolvedValueOnce(transcribeResult)
      createLessonMock.mockResolvedValueOnce(lesson)

      const { mutation } = configFrom(useCreateLessonMutation)
      const result = await mutation({ title: 'My Lesson', file })

      expect(result).toEqual(lesson)
    })

    test('uses the file extension to build the storage path', async () => {
      const wavFile = new File(['audio'], 'lesson.wav', { type: 'audio/wav' })
      transcribeAudioMock.mockResolvedValueOnce(transcribeResult)
      createLessonMock.mockResolvedValueOnce(lesson)

      const { mutation } = configFrom(useCreateLessonMutation)
      await mutation({ title: 'My Lesson', file: wavFile })

      expect(uploadLessonAudioMock).toHaveBeenCalledWith('member-uuid-1/fixed-uid.wav', wavFile)
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
