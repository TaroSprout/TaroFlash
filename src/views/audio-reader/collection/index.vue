<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import {
  useLessonCollectionQuery,
  useLessonsByCollectionQuery,
  useDeleteLessonMutation
} from '@/api/lessons'
import { useToast } from '@/composables/toast'
import { useAlert } from '@/composables/alert'
import { useUploadLessonModal } from '@/composables/modals/use-upload-lesson-modal'
import { useLessonReaderModal } from '@/composables/modals/use-lesson-reader-modal'
import LessonCard from '@/views/audio-reader/lesson-card.vue'
import CollectionHero from '@/views/audio-reader/collection-hero.vue'

const { id: collection_id } = defineProps<{ id: string }>()

const { t } = useI18n()
const router = useRouter()
const toast = useToast()
const alert = useAlert()
const upload_modal = useUploadLessonModal()
const reader_modal = useLessonReaderModal()
const delete_lesson = useDeleteLessonMutation()

const id = computed(() => Number(collection_id))

const { data: collection_data, error: collection_error } = useLessonCollectionQuery(id)
const { data: lessons_data, error: lessons_error } = useLessonsByCollectionQuery(id)

const collection = computed(() => collection_data.value)
const lessons = computed(() => lessons_data.value ?? [])

watch([collection_error, lessons_error], ([c, l]) => {
  if (c) toast.error(c.message)
  if (l) toast.error(l.message)
})

function onOpen(lesson: Lesson) {
  reader_modal.open(lesson.id)
}

function onUpload() {
  upload_modal.open(id.value)
}

async function onDelete(lesson: Lesson) {
  const confirmed = await alert.warn({
    title: t('alert.delete-lesson.title'),
    message: t('alert.delete-lesson.message'),
    confirmLabel: t('alert.delete-lesson.confirm'),
    confirmAudio: 'ui.trash_crumple_short'
  }).response
  if (!confirmed) return

  try {
    await delete_lesson.mutateAsync({ id: lesson.id, collection_id: id.value })
  } catch {
    toast.error(t('collection-view.delete-error'))
  }
}
</script>

<template>
  <section
    data-testid="collection-view"
    class="flex flex-col items-center gap-6 pb-12 md:h-full md:gap-15 xl:flex-row xl:items-start"
  >
    <collection-hero
      v-if="collection"
      class="top-(--nav-height) xl:sticky"
      :collection="collection"
      :lesson-count="lessons.length"
      @upload="onUpload"
    />

    <div data-testid="collection-view__main" class="flex w-full flex-col gap-6">
      <p
        v-if="lessons.length === 0"
        data-testid="collection-view__empty"
        class="text-brown-500 dark:text-grey-400"
      >
        {{ t('collection-view.empty-fallback') }}
      </p>

      <div v-else data-testid="collection-view__list" class="flex flex-wrap gap-6">
        <lesson-card
          v-for="lesson in lessons"
          :key="lesson.id"
          :lesson="lesson"
          @open="onOpen(lesson)"
          @delete="onDelete(lesson)"
        />
      </div>
    </div>
  </section>
</template>
