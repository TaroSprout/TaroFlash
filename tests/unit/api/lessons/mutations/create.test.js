import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const {
  useMutationSpy,
  invalidateSpy,
  uploadLessonAudioMock,
  deleteLessonAudioPathsMock,
  startLessonTranscriptionMock,
  chunkAudioMock,
  playbackBlob,
  fullBlob
} = vi.hoisted(() => {
  const playbackBlob = new Blob(['playback'], { type: 'audio/mpeg' })
  const fullBlob = new Blob(['full'], { type: 'audio/mpeg' })
  return {
    useMutationSpy: vi.fn((cfg) => cfg),
    invalidateSpy: vi.fn(),
    uploadLessonAudioMock: vi.fn().mockResolvedValue(undefined),
    deleteLessonAudioPathsMock: vi.fn().mockResolvedValue(undefined),
    startLessonTranscriptionMock: vi.fn(),
    chunkAudioMock: vi
      .fn()
      .mockResolvedValue({ playback: playbackBlob, full: fullBlob, ext: 'mp3', chunks: [] }),
    playbackBlob,
    fullBlob
  }
})

vi.mock('@pinia/colada', () => ({
  useMutation: useMutationSpy,
  useQueryCache: () => ({ invalidateQueries: invalidateSpy })
}))

vi.mock('@/composables/audio-reader/audio-chunker', () => ({
  chunkAudio: chunkAudioMock
}))

vi.mock('@/api/lessons/db/audio', () => ({
  uploadLessonAudio: uploadLessonAudioMock,
  deleteLessonAudioPaths: deleteLessonAudioPathsMock
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
  deleteLessonAudioPathsMock.mockClear()
  startLessonTranscriptionMock.mockReset()
  chunkAudioMock.mockClear()
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

      // First upload is the playback blob (CBR transcode), not the raw source file
      expect(uploadLessonAudioMock).toHaveBeenNthCalledWith(
        1,
        'member-uuid-1/fixed-uid.mp3',
        playbackBlob
      )
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
      expect(startLessonTranscriptionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          collection_id: 7,
          title: 'My Lesson',
          audio_path: 'member-uuid-1/fixed-uid.mp3',
          script: 'simplified',
          chunks: expect.any(Array)
        })
      )
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

    test("uses the transcode extension, not the source file's", async () => {
      // chunkAudio always returns ext: 'mp3' (the transcoded format), regardless of
      // the source file's extension — a .wav source still produces a .mp3 audio_path.
      const wavFile = new File(['audio'], 'lesson.wav', { type: 'audio/wav' })
      startLessonTranscriptionMock.mockResolvedValueOnce(lesson)

      const { mutation } = configFrom(useStartLessonMutation)
      await mutation({ collection_id: 7, title: 'My Lesson', file: wavFile })

      expect(uploadLessonAudioMock).toHaveBeenNthCalledWith(
        1,
        'member-uuid-1/fixed-uid.mp3',
        playbackBlob
      )
    })
  })

  describe('error cleanup', () => {
    test('deletes the orphan audio when start fails, then rethrows', async () => {
      const startError = new Error('create_failed')
      startLessonTranscriptionMock.mockRejectedValueOnce(startError)

      const { mutation } = configFrom(useStartLessonMutation)
      await expect(mutation(vars)).rejects.toBe(startError)

      expect(deleteLessonAudioPathsMock).toHaveBeenCalledWith(
        expect.arrayContaining(['member-uuid-1/fixed-uid.mp3'])
      )
    })

    test('does not start or delete when the upload itself fails', async () => {
      uploadLessonAudioMock.mockRejectedValueOnce(new Error('upload failed'))

      const { mutation } = configFrom(useStartLessonMutation)
      await expect(mutation(vars)).rejects.toThrow('upload failed')

      expect(startLessonTranscriptionMock).not.toHaveBeenCalled()
      // uploaded is empty when the first upload throws, so no real paths passed to delete
      const hasNonEmptyPaths = deleteLessonAudioPathsMock.mock.calls.some(
        ([paths]) => paths.length > 0
      )
      expect(hasNonEmptyPaths).toBe(false)
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
