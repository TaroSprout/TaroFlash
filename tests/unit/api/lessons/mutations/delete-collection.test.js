import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const { useMutationSpy, invalidateSpy, deleteLessonCollectionMock } = vi.hoisted(() => ({
  useMutationSpy: vi.fn((cfg) => cfg),
  invalidateSpy: vi.fn(),
  deleteLessonCollectionMock: vi.fn().mockResolvedValue(undefined)
}))

vi.mock('@pinia/colada', () => ({
  useMutation: useMutationSpy,
  useQueryCache: () => ({ invalidateQueries: invalidateSpy })
}))

vi.mock('@/api/lessons/db', () => ({
  deleteLessonCollection: deleteLessonCollectionMock
}))

import { useDeleteLessonCollectionMutation } from '@/api/lessons/mutations/delete-collection'

beforeEach(() => {
  useMutationSpy.mockClear()
  invalidateSpy.mockClear()
  deleteLessonCollectionMock.mockClear()
})

function configFrom(hook) {
  hook()
  return useMutationSpy.mock.calls.at(-1)[0]
}

describe('useDeleteLessonCollectionMutation', () => {
  describe('mutation', () => {
    test('delegates to deleteLessonCollection with the id', async () => {
      const { mutation } = configFrom(useDeleteLessonCollectionMutation)
      await mutation(7)
      expect(deleteLessonCollectionMock).toHaveBeenCalledWith(7)
    })
  })

  describe('onSettled', () => {
    test('invalidates ["lesson-collections"] so the dashboard list refreshes', () => {
      const { onSettled } = configFrom(useDeleteLessonCollectionMutation)
      onSettled(undefined, undefined, 7)
      expect(invalidateSpy).toHaveBeenCalledWith({ key: ['lesson-collections'] })
    })

    test('on success: invalidates ["lesson-collection", id] with refetchActive=false', () => {
      const { onSettled } = configFrom(useDeleteLessonCollectionMutation)
      onSettled(undefined, undefined, 7)
      expect(invalidateSpy).toHaveBeenCalledWith({ key: ['lesson-collection', 7] }, false)
    })

    test('on success: invalidates ["lessons", id] with refetchActive=false', () => {
      const { onSettled } = configFrom(useDeleteLessonCollectionMutation)
      onSettled(undefined, undefined, 7)
      expect(invalidateSpy).toHaveBeenCalledWith({ key: ['lessons', 7] }, false)
    })

    test('on error: does not invalidate ["lesson-collection", id] (row still exists)', () => {
      const { onSettled } = configFrom(useDeleteLessonCollectionMutation)
      onSettled(undefined, new Error('denied'), 7)

      const detailCalls = invalidateSpy.mock.calls.filter(
        (c) => c[0]?.key?.[0] === 'lesson-collection'
      )
      expect(detailCalls).toHaveLength(0)
    })

    test('on error: does not invalidate ["lessons", id] (rows still exist)', () => {
      const { onSettled } = configFrom(useDeleteLessonCollectionMutation)
      onSettled(undefined, new Error('denied'), 7)

      const listCalls = invalidateSpy.mock.calls.filter(
        (c) => c[0]?.key?.[0] === 'lessons' && c[1] === false
      )
      expect(listCalls).toHaveLength(0)
    })

    test('on error: still invalidates ["lesson-collections"]', () => {
      const { onSettled } = configFrom(useDeleteLessonCollectionMutation)
      onSettled(undefined, new Error('denied'), 7)
      expect(invalidateSpy).toHaveBeenCalledWith({ key: ['lesson-collections'] })
    })
  })
})
