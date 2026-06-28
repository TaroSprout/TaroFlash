<script setup lang="ts">
import { type Grade, Rating } from 'ts-fsrs'
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'

const { t } = useI18n()

const emit = defineEmits<{ (e: 'rated', grade: Grade): void }>()
</script>

<template>
  <div data-testid="rating-buttons__simple" class="grid w-full grid-cols-2 gap-2">
    <ui-button
      data-testid="rating-buttons__again"
      data-theme="red-500"
      data-theme-dark="red-600"
      size="xl"
      icon-left="dislike"
      full-width
      class="max-w-78.5"
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
      class="max-w-78.5"
      :sfx="{ tap_pre: 'snappy_button_5' }"
      @press="emit('rated', Rating.Good)"
    >
      {{ t('study.flashcard.rating.pass-button') }}
    </ui-button>
  </div>
</template>
