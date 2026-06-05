import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const { useMutationSpy, invalidateSpy, deleteLessonMock } = vi.hoisted(() => ({
  useMutationSpy: vi.fn((cfg) => cfg),
  invalidateSpy: vi.fn(),
  deleteLessonMock: vi.fn().mockResolvedValue(undefined)
}))

vi.mock('@pinia/colada', () => ({
  useMutation: useMutationSpy,
  useQueryCache: () => ({ invalidateQueries: invalidateSpy })
}))

vi.mock('@/api/lessons/db', () => ({
  deleteLesson: deleteLessonMock
}))

import { useDeleteLessonMutation } from '@/api/lessons/mutations/delete'

beforeEach(() => {
  useMutationSpy.mockClear()
  invalidateSpy.mockClear()
  deleteLessonMock.mockClear()
})

function configFrom(hook) {
  hook()
  return useMutationSpy.mock.calls.at(-1)[0]
}

describe('useDeleteLessonMutation', () => {
  describe('mutation', () => {
    test('delegates to deleteLesson with the id', async () => {
      const { mutation } = configFrom(useDeleteLessonMutation)
      await mutation(42)
      expect(deleteLessonMock).toHaveBeenCalledWith(42)
    })
  })

  describe('onSettled', () => {
    test('invalidates ["lessons"] so the dashboard list refreshes', () => {
      const { onSettled } = configFrom(useDeleteLessonMutation)
      onSettled(undefined, undefined, 42)
      expect(invalidateSpy).toHaveBeenCalledWith({ key: ['lessons'] })
    })

    test('on success: invalidates ["lesson", id] with refetchActive=false so no 404 refetch', () => {
      const { onSettled } = configFrom(useDeleteLessonMutation)
      onSettled(undefined, undefined, 42)
      expect(invalidateSpy).toHaveBeenCalledWith({ key: ['lesson', 42] }, false)
    })

    test('on error: does not invalidate ["lesson", id] (row still exists, keep cache)', () => {
      const { onSettled } = configFrom(useDeleteLessonMutation)
      onSettled(undefined, new Error('denied'), 42)

      const detailCalls = invalidateSpy.mock.calls.filter((c) => c[0]?.key?.[0] === 'lesson')
      expect(detailCalls).toHaveLength(0)
    })

    test('on error: still invalidates ["lessons"] list', () => {
      const { onSettled } = configFrom(useDeleteLessonMutation)
      onSettled(undefined, new Error('denied'), 42)
      expect(invalidateSpy).toHaveBeenCalledWith({ key: ['lessons'] })
    })
  })
})
