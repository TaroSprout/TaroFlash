<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import { formatShortDate } from '@/utils/date'

const { lesson } = defineProps<{ lesson: Lesson }>()

const emit = defineEmits<{
  (e: 'open'): void
  (e: 'delete'): void
}>()

const { t } = useI18n()
</script>

<template>
  <div
    data-testid="lesson-card"
    class="group relative flex w-56 flex-col gap-3 rounded-7 bg-brown-200 p-4 text-left dark:bg-grey-700"
  >
    <button
      data-testid="lesson-card__open"
      type="button"
      class="flex flex-col gap-3"
      @click="emit('open')"
    >
      <span
        data-testid="lesson-card__icon"
        class="flex size-10 items-center justify-center rounded-full bg-blue-500 text-white dark:bg-blue-650"
      >
        <ui-icon src="music-note" class="h-5" />
      </span>

      <span
        data-testid="lesson-card__title"
        class="line-clamp-2 text-xl text-brown-700 dark:text-brown-200"
      >
        {{ lesson.title }}
      </span>

      <span data-testid="lesson-card__date" class="text-sm text-brown-500 dark:text-grey-400">
        {{ formatShortDate(lesson.created_at ?? '') }}
      </span>
    </button>

    <ui-button
      data-testid="lesson-card__delete"
      data-theme="grey-400"
      icon-left="delete"
      icon-only
      size="sm"
      class="absolute top-3 right-3 opacity-0 group-hover:opacity-100"
      @click="emit('delete')"
    >
      {{ t('audio-reader.lesson-card.delete-button') }}
    </ui-button>
  </div>
</template>
