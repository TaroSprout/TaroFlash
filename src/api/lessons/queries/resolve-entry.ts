import { useQueryCache } from '@pinia/colada'
import { fetchLessonsByCollection } from '../db'

/**
 * Which chapter a collection opens at — the bookmark, or the first chapter, or
 * `null` when there is nothing in it.
 *
 * A bookmark always points at a chapter that still exists, so it needs no
 * checking.
 */
export async function resolveCollectionEntryLesson(
  collection: LessonCollection
): Promise<number | null> {
  if (collection.last_lesson_id) return collection.last_lesson_id

  const cache = useQueryCache()
  const entry = cache.ensure({
    key: ['lessons', collection.id],
    query: () => fetchLessonsByCollection(collection.id)
  })
  // `refresh`, never `fetch` — `fetch` re-reads a list already loaded.
  const { data } = await cache.refresh(entry)

  return data?.[0]?.id ?? null
}
