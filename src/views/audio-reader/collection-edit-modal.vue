<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import {
  useLessonCollectionQuery,
  useLessonsByCollectionQuery,
  useDeleteLessonMutation,
  useRetryLessonMutation,
  useDeleteLessonCollectionMutation
} from '@/api/lessons'
import { useNoticeStore } from '@/stores/notice-store'
import { useAlert } from '@/composables/alert'
import { useUploadLessonModal } from '@/composables/audio-reader/upload-lesson-modal'
import AppWindow from '@/components/layout-kit/app-window/index.vue'
import UiButton from '@/components/ui-kit/button.vue'
import LessonCard from '@/views/audio-reader/lesson-card.vue'

export type CollectionEditResponse = void

// How often to re-fetch the list while a lesson is still transcribing.
const POLL_INTERVAL_MS = 5000

const { collection_id, close } = defineProps<{
  collection_id: number
  close: (response?: CollectionEditResponse) => void
}>()

const { t } = useI18n()
const router = useRouter()
const notice = useNoticeStore()
const alert = useAlert()
const upload_modal = useUploadLessonModal()
const delete_lesson = useDeleteLessonMutation()
const retry_lesson = useRetryLessonMutation()
const delete_collection = useDeleteLessonCollectionMutation()

const id = computed(() => collection_id)

const { data: collection_data } = useLessonCollectionQuery(id)
const {
  data: lessons_data,
  error: lessons_error,
  refetch: refetchLessons
} = useLessonsByCollectionQuery(id)

const collection = computed(() => collection_data.value)
const lessons = computed(() => lessons_data.value ?? [])
const has_processing = computed(() =>
  lessons.value.some((lesson) => lesson.status === 'processing')
)

let poll_timer: ReturnType<typeof setInterval> | undefined

onBeforeUnmount(() => clearInterval(poll_timer))

function onOpenLesson(lesson: Lesson) {
  // Reading happens on the chapter route; the modal is for managing.
  if (lesson.status !== 'ready') return
  router.push({ name: 'lesson', params: { collectionId: collection_id, lessonId: lesson.id } })
  close()
}

function onUpload() {
  upload_modal.open(collection_id)
}

async function onRetry(lesson: Lesson) {
  try {
    await retry_lesson.mutateAsync({ id: lesson.id, collection_id })
  } catch {
    notice.error(t('collection-view.retry-error'), { variant: 'panel' })
  }
}

async function onDeleteLesson(lesson: Lesson) {
  const confirmed = await alert.warn({
    title: t('alert.delete-lesson.title'),
    message: t('alert.delete-lesson.message'),
    confirmLabel: t('alert.delete-lesson.confirm'),
    confirmAudio: 'trash_crumple_short'
  }).response
  if (!confirmed) return

  try {
    await delete_lesson.mutateAsync({ id: lesson.id, collection_id })
  } catch {
    notice.error(t('collection-view.delete-error'), { variant: 'panel' })
  }
}

async function onDeleteCollection() {
  const confirmed = await alert.warn({
    title: t('alert.delete-collection.title'),
    message: t('alert.delete-collection.message'),
    confirmLabel: t('alert.delete-collection.confirm'),
    confirmAudio: 'trash_crumple_short'
  }).response
  if (!confirmed) return

  try {
    await delete_collection.mutateAsync(collection_id)
    close()
    // The book is gone — leave any open chapter route for the dashboard.
    router.push({ name: 'dashboard' })
  } catch {
    notice.error(t('lesson-collections.section.delete-error'), { variant: 'panel' })
  }
}

watch(lessons_error, (err) => {
  if (err) notice.error(t('collection-view.lessons-load-error'))
})

// Start/stop polling as lessons enter/leave the processing state, so a card
// flips to ready/failed on its own without the user refreshing.
watch(
  has_processing,
  (active) => {
    clearInterval(poll_timer)
    if (active) poll_timer = setInterval(() => refetchLessons(), POLL_INTERVAL_MS)
  },
  { immediate: true }
)
</script>

<template>
  <app-window
    data-testid="collection-edit-container"
    data-palette="blue"
    class="max-h-[90dvh] sm:w-180"
    :title="collection?.title"
    @close="close()"
  >
    <div
      data-testid="collection-edit__body"
      class="flex max-h-[70dvh] flex-col gap-8 overflow-y-auto p-6"
    >
      <section data-testid="collection-edit__lessons" class="flex flex-col gap-4">
        <ui-button
          data-testid="collection-edit__upload"
          data-palette="brand"
          icon-left="add"
          size="lg"
          @press="onUpload"
        >
          {{ t('collection-view.new-button') }}
        </ui-button>

        <p v-if="lessons.length === 0" data-testid="collection-edit__empty" class="text-ink-muted">
          {{ t('collection-view.empty-fallback') }}
        </p>

        <div v-else data-testid="collection-edit__list" class="flex flex-wrap gap-4">
          <lesson-card
            v-for="lesson in lessons"
            :key="lesson.id"
            :lesson="lesson"
            @open="onOpenLesson(lesson)"
            @retry="onRetry(lesson)"
            @delete="onDeleteLesson(lesson)"
          />
        </div>
      </section>

      <section
        data-testid="collection-edit__danger-zone"
        class="flex flex-col gap-2 rounded-7 border border-red-300 p-4 dark:border-red-500/40"
      >
        <h3 class="text-xl text-ink">
          {{ t('collection-edit.danger-zone.heading') }}
        </h3>

        <p class="text-base text-ink-muted">
          {{ t('collection-edit.danger-zone.description') }}
        </p>

        <ui-button
          data-testid="collection-edit__delete"
          data-palette="danger"
          icon-left="delete"
          size="lg"
          class="self-start"
          @press="onDeleteCollection"
        >
          {{ t('collection-edit.danger-zone.delete-button') }}
        </ui-button>
      </section>
    </div>
  </app-window>
</template>
