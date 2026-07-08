import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const { ensureMock, refreshMock, fetchLessonsByCollectionMock } = vi.hoisted(() => ({
  ensureMock: vi.fn(),
  refreshMock: vi.fn().mockResolvedValue({ data: [] }),
  fetchLessonsByCollectionMock: vi.fn().mockResolvedValue([])
}))

vi.mock('@pinia/colada', () => ({
  useQueryCache: () => ({
    ensure: ensureMock,
    refresh: refreshMock
  })
}))

vi.mock('@/api/lessons/db', () => ({
  fetchLessonsByCollection: fetchLessonsByCollectionMock
}))

import { resolveCollectionEntryLesson } from '@/api/lessons/queries/resolve-entry'

beforeEach(() => {
  ensureMock.mockClear()
  refreshMock.mockClear()
  fetchLessonsByCollectionMock.mockClear()
})

describe('resolveCollectionEntryLesson', () => {
  describe('when last_lesson_id is set', () => {
    test('returns it immediately without fetching', async () => {
      const collection = { id: 1, last_lesson_id: 42 }
      const result = await resolveCollectionEntryLesson(collection)
      expect(result).toBe(42)
      expect(ensureMock).not.toHaveBeenCalled()
      expect(refreshMock).not.toHaveBeenCalled()
    })
  })

  describe('when last_lesson_id is null', () => {
    test('returns the first lesson id from the cache refresh', async () => {
      const entry = Symbol('entry')
      ensureMock.mockReturnValue(entry)
      refreshMock.mockResolvedValue({
        data: [
          { id: 10, title: 'Chapter 1' },
          { id: 11, title: 'Chapter 2' }
        ]
      })

      const collection = { id: 5, last_lesson_id: null }
      const result = await resolveCollectionEntryLesson(collection)

      expect(ensureMock).toHaveBeenCalledWith(expect.objectContaining({ key: ['lessons', 5] }))
      expect(result).toBe(10)
    })

    test('calls refresh (not fetch) against the ensured entry so a warm cache skips the refetch [obligation]', async () => {
      const entry = Symbol('entry')
      ensureMock.mockReturnValue(entry)
      refreshMock.mockResolvedValue({ data: [{ id: 10 }] })

      const collection = { id: 5, last_lesson_id: null }
      await resolveCollectionEntryLesson(collection)

      expect(refreshMock).toHaveBeenCalledWith(entry)
    })

    test('the ensure query closure forwards collection.id to fetchLessonsByCollection at call time', async () => {
      const entry = Symbol('entry')
      ensureMock.mockReturnValue(entry)
      refreshMock.mockResolvedValue({ data: [] })

      const collection = { id: 9, last_lesson_id: null }
      await resolveCollectionEntryLesson(collection)

      const [opts] = ensureMock.mock.calls[0]
      await opts.query()
      expect(fetchLessonsByCollectionMock).toHaveBeenCalledWith(9)
    })

    test('returns null when the lesson list is empty', async () => {
      const entry = Symbol('entry')
      ensureMock.mockReturnValue(entry)
      refreshMock.mockResolvedValue({ data: [] })

      const collection = { id: 7, last_lesson_id: null }
      const result = await resolveCollectionEntryLesson(collection)

      expect(result).toBeNull()
    })
  })
})
