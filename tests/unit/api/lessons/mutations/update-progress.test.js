import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const { useMutationSpy, invalidateSpy, setCollectionProgressMock } = vi.hoisted(() => ({
  useMutationSpy: vi.fn((cfg) => cfg),
  invalidateSpy: vi.fn(),
  setCollectionProgressMock: vi.fn().mockResolvedValue(undefined)
}))

vi.mock('@pinia/colada', () => ({
  useMutation: useMutationSpy,
  useQueryCache: () => ({ invalidateQueries: invalidateSpy })
}))

vi.mock('@/api/lessons/db', () => ({
  setCollectionProgress: setCollectionProgressMock
}))

import { useSetCollectionProgressMutation } from '@/api/lessons/mutations/update-progress'

beforeEach(() => {
  useMutationSpy.mockClear()
  invalidateSpy.mockClear()
  setCollectionProgressMock.mockClear()
})

function configFrom(hook) {
  hook()
  return useMutationSpy.mock.calls.at(-1)[0]
}

describe('useSetCollectionProgressMutation', () => {
  describe('mutation', () => {
    test('delegates to setCollectionProgress with collection_id and lesson_id', async () => {
      const { mutation } = configFrom(useSetCollectionProgressMutation)
      await mutation({ collection_id: 3, lesson_id: 17 })
      expect(setCollectionProgressMock).toHaveBeenCalledWith(3, 17)
    })
  })

  describe('onSettled', () => {
    test('invalidates ["lesson-collections"] so the dashboard list refreshes', () => {
      const { onSettled } = configFrom(useSetCollectionProgressMutation)
      onSettled(undefined, undefined, { collection_id: 3, lesson_id: 17 })
      expect(invalidateSpy).toHaveBeenCalledWith({ key: ['lesson-collections'] })
    })

    test('invalidates ["lesson-collection", collection_id] so the detail cache refreshes', () => {
      const { onSettled } = configFrom(useSetCollectionProgressMutation)
      onSettled(undefined, undefined, { collection_id: 3, lesson_id: 17 })
      expect(invalidateSpy).toHaveBeenCalledWith({ key: ['lesson-collection', 3] })
    })
  })
})
