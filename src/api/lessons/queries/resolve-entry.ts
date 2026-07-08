import { useQueryCache } from '@pinia/colada'
import { fetchLessonsByCollection } from '../db'

/**
 * Resolve which chapter to open a collection at, book-style:
 *   - the bookmarked lesson if the collection has one (the `on delete set null`
 *     FK guarantees a set `last_lesson_id` still points at a live lesson, so no
 *     fetch is needed here);
 *   - otherwise the first chapter;
 *   - otherwise `null` — the collection is empty and has nothing to read.
 *
 * The lesson list is read through the same cache key the reader page uses
 * (`['lessons', id]`), so a warm cache skips the refetch.
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
  // refresh(), not fetch() — actually honors the "warm cache skips the
  // refetch" behavior this function's docstring already promised.
  const { data } = await cache.refresh(entry)

  return data?.[0]?.id ?? null
}
