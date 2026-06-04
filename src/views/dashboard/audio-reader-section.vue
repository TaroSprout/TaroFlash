<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useLessonsQuery, useDeleteLessonMutation } from '@/api/lessons'
import { useToast } from '@/composables/toast'
import { useAlert } from '@/composables/alert'
import { useUploadLessonModal } from '@/composables/modals/use-upload-lesson-modal'
import UiButton from '@/components/ui-kit/button.vue'
import LessonCard from '@/components/audio-reader/lesson-card.vue'

const { t } = useI18n()
const router = useRouter()
const toast = useToast()
const alert = useAlert()
const upload_modal = useUploadLessonModal()
const delete_lesson = useDeleteLessonMutation()

const { data: lessons_data, error: lessons_error } = useLessonsQuery()
const lessons = computed(() => lessons_data.value ?? [])

watch(lessons_error, (err) => {
  if (err) toast.error(err.message)
})

function onOpen(lesson: Lesson) {
  router.push({ name: 'audio-reader-lesson', params: { id: lesson.id } })
}

async function onUpload() {
  const lesson = await upload_modal.open().response
  if (lesson) router.push({ name: 'audio-reader-lesson', params: { id: lesson.id } })
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
    await delete_lesson.mutateAsync(lesson.id)
  } catch {
    toast.error(t('audio-reader.section.delete-error'))
  }
}
</script>

<template>
  <section data-testid="audio-reader-section" class="flex flex-col gap-6">
    <header data-testid="audio-reader-section__header" class="flex items-center justify-between">
      <h2 class="text-3xl text-brown-700 dark:text-brown-300">
        {{ t('audio-reader.section.heading') }}
      </h2>

      <ui-button
        data-testid="audio-reader-section__new"
        data-theme="blue-500"
        data-theme-dark="blue-650"
        icon-left="add"
        size="lg"
        @click="onUpload"
      >
        {{ t('audio-reader.section.new-button') }}
      </ui-button>
    </header>

    <p
      v-if="lessons.length === 0"
      data-testid="audio-reader-section__empty"
      class="text-brown-500 dark:text-grey-400"
    >
      {{ t('audio-reader.section.empty-fallback') }}
    </p>

    <div v-else data-testid="audio-reader-section__list" class="flex flex-wrap gap-6">
      <lesson-card
        v-for="lesson in lessons"
        :key="lesson.id"
        :lesson="lesson"
        @open="onOpen(lesson)"
        @delete="onDelete(lesson)"
      />
    </div>
  </section>
</template>
