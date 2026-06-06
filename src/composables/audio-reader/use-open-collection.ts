import { useRouter } from 'vue-router'
import { resolveCollectionEntryLesson } from '@/api/lessons'
import { useCollectionEditModal } from '@/composables/modals/use-collection-edit-modal'

/**
 * Open a collection like a book: navigate to the chapter the member left off on
 * (or chapter 1 if they've never opened it). An empty collection has nothing to
 * read, so its edit modal opens instead so they can upload the first lesson.
 *
 * @example
 * const { openCollection } = useOpenCollection()
 * onClick(() => openCollection(collection))
 */
export function useOpenCollection() {
  const router = useRouter()
  const edit_modal = useCollectionEditModal()

  async function openCollection(collection: LessonCollection) {
    const lesson_id = await resolveCollectionEntryLesson(collection)
    if (!lesson_id) {
      edit_modal.open(collection.id)
      return
    }

    router.push({
      name: 'lesson',
      params: { collectionId: collection.id, lessonId: lesson_id }
    })
  }

  return { openCollection }
}
