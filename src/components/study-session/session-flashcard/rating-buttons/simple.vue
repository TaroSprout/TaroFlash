<script setup lang="ts">
import { type Grade, Rating } from 'ts-fsrs'
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import { usePrimedGrade } from '../primed-grade-context'

const primed_grade = usePrimedGrade()

const { t } = useI18n()

const emit = defineEmits<{
  (e: 'rated', grade: Grade): void
  (e: 'revealed'): void
}>()
</script>

<template>
  <div data-testid="rating-buttons__simple" class="flex w-full flex-col gap-2">
    <div data-testid="rating-buttons__review-row" class="grid grid-cols-2 gap-1.5">
      <ui-button
        data-testid="rating-buttons__again"
        data-theme="red-500"
        data-theme-dark="red-600"
        size="xl"
        icon-left="dislike"
        full-width
        :active="primed_grade === Rating.Again"
        :sfx="{ tap_pre: 'snappy_button_5' }"
        @press="emit('rated', Rating.Again)"
      >
        {{ t('study.flashcard.rating.fail-button') }}
      </ui-button>

      <ui-button
        data-testid="rating-buttons__good"
        data-theme="blue-500"
        data-theme-dark="blue-650"
        size="xl"
        icon-left="like"
        full-width
        :active="primed_grade === Rating.Good"
        :sfx="{ tap_pre: 'snappy_button_5' }"
        @press="emit('rated', Rating.Good)"
      >
        {{ t('study.flashcard.rating.pass-button') }}
      </ui-button>
    </div>

    <ui-button
      data-testid="rating-buttons__show"
      data-theme="brown-100"
      data-theme-dark="stone-700"
      size="xl"
      icon-left="card-flip"
      full-width
      :sfx="{ tap_pre: 'snappy_button_5' }"
      @press="emit('revealed')"
    >
      {{ t('study.flashcard.rating.flip-button') }}
    </ui-button>
  </div>
</template>
