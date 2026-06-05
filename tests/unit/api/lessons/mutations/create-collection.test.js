import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const { useMutationSpy, invalidateSpy, createLessonCollectionMock } = vi.hoisted(() => ({
  useMutationSpy: vi.fn((cfg) => cfg),
  invalidateSpy: vi.fn(),
  createLessonCollectionMock: vi.fn().mockResolvedValue(undefined)
}))

vi.mock('@pinia/colada', () => ({
  useMutation: useMutationSpy,
  useQueryCache: () => ({ invalidateQueries: invalidateSpy })
}))

vi.mock('@/api/lessons/db', () => ({
  createLessonCollection: createLessonCollectionMock
}))

import { useCreateLessonCollectionMutation } from '@/api/lessons/mutations/create-collection'

beforeEach(() => {
  useMutationSpy.mockClear()
  invalidateSpy.mockClear()
  createLessonCollectionMock.mockClear()
})

function configFrom(hook) {
  hook()
  return useMutationSpy.mock.calls.at(-1)[0]
}

describe('useCreateLessonCollectionMutation', () => {
  describe('mutation', () => {
    test('delegates to createLessonCollection with the title', async () => {
      const { mutation } = configFrom(useCreateLessonCollectionMutation)
      await mutation('JLPT N5')
      expect(createLessonCollectionMock).toHaveBeenCalledWith('JLPT N5')
    })
  })

  describe('onSettled', () => {
    test('invalidates ["lesson-collections"] so the dashboard list refreshes', () => {
      const { onSettled } = configFrom(useCreateLessonCollectionMutation)
      onSettled()
      expect(invalidateSpy).toHaveBeenCalledWith({ key: ['lesson-collections'] })
    })
  })
})
