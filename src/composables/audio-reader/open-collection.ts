import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { resolveCollectionEntryLesson } from '@/api/lessons'
import { useCollectionEditModal } from '@/composables/audio-reader/collection-edit-modal'
import { useNoticeStore } from '@/stores/notice-store'

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
  const { t } = useI18n()
  const notice = useNoticeStore()
  const edit_modal = useCollectionEditModal()

  async function openCollection(collection: LessonCollection) {
    let lesson_id: number | null
    try {
      lesson_id = await resolveCollectionEntryLesson(collection)
    } catch {
      notice.error(t('lesson-collections.open-error'))
      return
    }

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
