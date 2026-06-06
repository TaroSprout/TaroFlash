import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const {
  useMutationSpy,
  invalidateSpy,
  uploadLessonAudioMock,
  deleteLessonAudioMock,
  startLessonTranscriptionMock
} = vi.hoisted(() => ({
  useMutationSpy: vi.fn((cfg) => cfg),
  invalidateSpy: vi.fn(),
  uploadLessonAudioMock: vi.fn().mockResolvedValue(undefined),
  deleteLessonAudioMock: vi.fn().mockResolvedValue(undefined),
  startLessonTranscriptionMock: vi.fn()
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
  startLessonTranscription: startLessonTranscriptionMock
}))

vi.mock('@/stores/member', () => ({
  useMemberStore: () => ({ id: 'member-uuid-1' })
}))

vi.mock('@/utils/uid', () => ({ default: () => 'fixed-uid' }))

import { useStartLessonMutation } from '@/api/lessons/mutations/create'

beforeEach(() => {
  useMutationSpy.mockClear()
  invalidateSpy.mockClear()
  uploadLessonAudioMock.mockClear()
  uploadLessonAudioMock.mockResolvedValue(undefined)
  deleteLessonAudioMock.mockClear()
  startLessonTranscriptionMock.mockReset()
})

function configFrom(hook) {
  hook()
  return useMutationSpy.mock.calls.at(-1)[0]
}

describe('useStartLessonMutation', () => {
  const file = new File(['audio'], 'lesson.mp3', { type: 'audio/mpeg' })
  const lesson = { id: 1, title: 'My Lesson', status: 'processing' }
  const vars = { collection_id: 7, title: 'My Lesson', file, script: 'simplified' }

  describe('mutation', () => {
    test('uploads the audio first, to the constructed path', async () => {
      startLessonTranscriptionMock.mockResolvedValueOnce(lesson)

      const { mutation } = configFrom(useStartLessonMutation)
      await mutation(vars)

      expect(uploadLessonAudioMock).toHaveBeenCalledWith('member-uuid-1/fixed-uid.mp3', file)
    })

    test('starts transcription after upload with the path and script', async () => {
      const callOrder = []
      uploadLessonAudioMock.mockImplementationOnce(async () => void callOrder.push('upload'))
      startLessonTranscriptionMock.mockImplementationOnce(async () => {
        callOrder.push('start')
        return lesson
      })

      const { mutation } = configFrom(useStartLessonMutation)
      await mutation(vars)

      expect(callOrder).toEqual(['upload', 'start'])
      expect(startLessonTranscriptionMock).toHaveBeenCalledWith({
        collection_id: 7,
        title: 'My Lesson',
        audio_path: 'member-uuid-1/fixed-uid.mp3',
        script: 'simplified'
      })
    })

    test("defaults script to 'original' when omitted", async () => {
      startLessonTranscriptionMock.mockResolvedValueOnce(lesson)

      const { mutation } = configFrom(useStartLessonMutation)
      await mutation({ collection_id: 7, title: 'My Lesson', file })

      expect(startLessonTranscriptionMock).toHaveBeenCalledWith(
        expect.objectContaining({ script: 'original' })
      )
    })

    test('returns the pending lesson from startLessonTranscription', async () => {
      startLessonTranscriptionMock.mockResolvedValueOnce(lesson)

      const { mutation } = configFrom(useStartLessonMutation)
      const result = await mutation(vars)

      expect(result).toEqual(lesson)
    })

    test('builds the storage path from the file extension', async () => {
      const wavFile = new File(['audio'], 'lesson.wav', { type: 'audio/wav' })
      startLessonTranscriptionMock.mockResolvedValueOnce(lesson)

      const { mutation } = configFrom(useStartLessonMutation)
      await mutation({ collection_id: 7, title: 'My Lesson', file: wavFile })

      expect(uploadLessonAudioMock).toHaveBeenCalledWith('member-uuid-1/fixed-uid.wav', wavFile)
    })
  })

  describe('error cleanup', () => {
    test('deletes the orphan audio when start fails, then rethrows', async () => {
      const startError = new Error('create_failed')
      startLessonTranscriptionMock.mockRejectedValueOnce(startError)

      const { mutation } = configFrom(useStartLessonMutation)
      await expect(mutation(vars)).rejects.toBe(startError)

      expect(deleteLessonAudioMock).toHaveBeenCalledWith('member-uuid-1/fixed-uid.mp3')
    })

    test('does not start or delete when the upload itself fails', async () => {
      uploadLessonAudioMock.mockRejectedValueOnce(new Error('upload failed'))

      const { mutation } = configFrom(useStartLessonMutation)
      await expect(mutation(vars)).rejects.toThrow('upload failed')

      expect(startLessonTranscriptionMock).not.toHaveBeenCalled()
      expect(deleteLessonAudioMock).not.toHaveBeenCalled()
    })
  })

  describe('onSettled', () => {
    test('invalidates the collection lesson list on success', () => {
      const { onSettled } = configFrom(useStartLessonMutation)
      onSettled(lesson, undefined, vars)
      expect(invalidateSpy).toHaveBeenCalledWith({ key: ['lessons', 7] })
    })

    test('invalidates ["lesson-collections"] so the dashboard count refreshes', () => {
      const { onSettled } = configFrom(useStartLessonMutation)
      onSettled(lesson, undefined, vars)
      expect(invalidateSpy).toHaveBeenCalledWith({ key: ['lesson-collections'] })
    })

    test('invalidates the collection lesson list on error', () => {
      const { onSettled } = configFrom(useStartLessonMutation)
      onSettled(undefined, new Error('boom'), vars)
      expect(invalidateSpy).toHaveBeenCalledWith({ key: ['lessons', 7] })
    })
  })
})
