import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const { useMutationSpy, getQueryDataSpy, setQueryDataSpy, setCollectionProgressMock } = vi.hoisted(
  () => ({
    useMutationSpy: vi.fn((cfg) => cfg),
    getQueryDataSpy: vi.fn(),
    setQueryDataSpy: vi.fn(),
    setCollectionProgressMock: vi.fn().mockResolvedValue(undefined)
  })
)

vi.mock('@pinia/colada', () => ({
  useMutation: useMutationSpy,
  useQueryCache: () => ({ getQueryData: getQueryDataSpy, setQueryData: setQueryDataSpy })
}))

vi.mock('@/api/lessons/db', () => ({
  setCollectionProgress: setCollectionProgressMock
}))

import { useSetCollectionProgressMutation } from '@/api/lessons/mutations/update-progress'

beforeEach(() => {
  useMutationSpy.mockClear()
  getQueryDataSpy.mockReset()
  setQueryDataSpy.mockClear()
  setCollectionProgressMock.mockClear()
})

function configFrom(hook) {
  hook()
  return useMutationSpy.mock.calls.at(-1)[0]
}

describe('useSetCollectionProgressMutation', () => {
  describe('mutation', () => {
    test('delegates to setCollectionProgress with collection_id, lesson_id, and position', async () => {
      const { mutation } = configFrom(useSetCollectionProgressMutation)
      await mutation({ collection_id: 3, lesson_id: 17, position_seconds: 42 })
      expect(setCollectionProgressMock).toHaveBeenCalledWith(3, 17, 42)
    })

    test('defaults the position to the chapter start when omitted', async () => {
      const { mutation } = configFrom(useSetCollectionProgressMutation)
      await mutation({ collection_id: 3, lesson_id: 17 })
      expect(setCollectionProgressMock).toHaveBeenCalledWith(3, 17, 0)
    })
  })

  describe('onSettled', () => {
    test('patches the detail cache with the new bookmark + position in place', () => {
      getQueryDataSpy.mockImplementation((key) =>
        key[0] === 'lesson-collection' ? { id: 3, title: 'Book', last_lesson_id: 1 } : undefined
      )
      const { onSettled } = configFrom(useSetCollectionProgressMutation)

      onSettled(undefined, undefined, { collection_id: 3, lesson_id: 17, position_seconds: 42 })

      expect(setQueryDataSpy).toHaveBeenCalledWith(['lesson-collection', 3], {
        id: 3,
        title: 'Book',
        last_lesson_id: 17,
        last_position_seconds: 42
      })
    })

    test('patches the matching entry in the dashboard list, leaving others untouched', () => {
      getQueryDataSpy.mockImplementation((key) =>
        key[0] === 'lesson-collections'
          ? [
              { id: 3, last_lesson_id: 1, last_position_seconds: 0, lesson_count: 4 },
              { id: 9, last_lesson_id: 2, last_position_seconds: 5, lesson_count: 2 }
            ]
          : undefined
      )
      const { onSettled } = configFrom(useSetCollectionProgressMutation)

      onSettled(undefined, undefined, { collection_id: 3, lesson_id: 17, position_seconds: 42 })

      expect(setQueryDataSpy).toHaveBeenCalledWith(
        ['lesson-collections'],
        [
          { id: 3, last_lesson_id: 17, last_position_seconds: 42, lesson_count: 4 },
          { id: 9, last_lesson_id: 2, last_position_seconds: 5, lesson_count: 2 }
        ]
      )
    })

    test('writes nothing when the caches are cold', () => {
      getQueryDataSpy.mockReturnValue(undefined)
      const { onSettled } = configFrom(useSetCollectionProgressMutation)

      onSettled(undefined, undefined, { collection_id: 3, lesson_id: 17, position_seconds: 42 })

      expect(setQueryDataSpy).not.toHaveBeenCalled()
    })
  })
})
