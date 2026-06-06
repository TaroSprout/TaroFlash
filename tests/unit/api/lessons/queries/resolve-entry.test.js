import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const { ensureMock, fetchMock, fetchLessonsByCollectionMock } = vi.hoisted(() => ({
  ensureMock: vi.fn(),
  fetchMock: vi.fn().mockResolvedValue([]),
  fetchLessonsByCollectionMock: vi.fn().mockResolvedValue([])
}))

vi.mock('@pinia/colada', () => ({
  useQueryCache: () => ({
    ensure: ensureMock,
    fetch: fetchMock
  })
}))

vi.mock('@/api/lessons/db', () => ({
  fetchLessonsByCollection: fetchLessonsByCollectionMock
}))

import { resolveCollectionEntryLesson } from '@/api/lessons/queries/resolve-entry'

beforeEach(() => {
  ensureMock.mockClear()
  fetchMock.mockClear()
  fetchLessonsByCollectionMock.mockClear()
})

describe('resolveCollectionEntryLesson', () => {
  describe('when last_lesson_id is set', () => {
    test('returns it immediately without fetching', async () => {
      const collection = { id: 1, last_lesson_id: 42 }
      const result = await resolveCollectionEntryLesson(collection)
      expect(result).toBe(42)
      expect(ensureMock).not.toHaveBeenCalled()
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  describe('when last_lesson_id is null', () => {
    test('returns the first lesson id from the cache fetch', async () => {
      const entry = Symbol('entry')
      ensureMock.mockReturnValue(entry)
      fetchMock.mockResolvedValue([
        { id: 10, title: 'Chapter 1' },
        { id: 11, title: 'Chapter 2' }
      ])

      const collection = { id: 5, last_lesson_id: null }
      const result = await resolveCollectionEntryLesson(collection)

      expect(ensureMock).toHaveBeenCalledWith(expect.objectContaining({ key: ['lessons', 5] }))
      expect(fetchMock).toHaveBeenCalledWith(entry)
      expect(result).toBe(10)
    })

    test('returns null when the lesson list is empty', async () => {
      const entry = Symbol('entry')
      ensureMock.mockReturnValue(entry)
      fetchMock.mockResolvedValue([])

      const collection = { id: 7, last_lesson_id: null }
      const result = await resolveCollectionEntryLesson(collection)

      expect(result).toBeNull()
    })
  })
})
