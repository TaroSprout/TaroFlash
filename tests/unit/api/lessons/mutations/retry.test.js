import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const { useMutationSpy, invalidateSpy, retryLessonTranscriptionMock } = vi.hoisted(() => ({
  useMutationSpy: vi.fn((cfg) => cfg),
  invalidateSpy: vi.fn(),
  retryLessonTranscriptionMock: vi.fn()
}))

vi.mock('@pinia/colada', () => ({
  useMutation: useMutationSpy,
  useQueryCache: () => ({ invalidateQueries: invalidateSpy })
}))

vi.mock('@/api/lessons/db/ai', () => ({
  retryLessonTranscription: retryLessonTranscriptionMock
}))

import { useRetryLessonMutation } from '@/api/lessons/mutations/retry'

beforeEach(() => {
  useMutationSpy.mockClear()
  invalidateSpy.mockClear()
  retryLessonTranscriptionMock.mockReset()
})

function configFrom(hook) {
  hook()
  return useMutationSpy.mock.calls.at(-1)[0]
}

describe('useRetryLessonMutation', () => {
  const vars = { id: 9, collection_id: 7 }
  const lesson = { id: 9, status: 'processing' }

  describe('mutation', () => {
    test('retries transcription for the lesson id', async () => {
      retryLessonTranscriptionMock.mockResolvedValueOnce(lesson)

      const { mutation } = configFrom(useRetryLessonMutation)
      const result = await mutation(vars)

      expect(retryLessonTranscriptionMock).toHaveBeenCalledWith(9)
      expect(result).toEqual(lesson)
    })
  })

  describe('onSettled', () => {
    test('invalidates the collection lesson list on success', () => {
      const { onSettled } = configFrom(useRetryLessonMutation)
      onSettled(lesson, undefined, vars)
      expect(invalidateSpy).toHaveBeenCalledWith({ key: ['lessons', 7] })
    })

    test('invalidates the collection lesson list on error', () => {
      const { onSettled } = configFrom(useRetryLessonMutation)
      onSettled(undefined, new Error('boom'), vars)
      expect(invalidateSpy).toHaveBeenCalledWith({ key: ['lessons', 7] })
    })
  })
})
